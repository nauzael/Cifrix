# Diseño: Sistema de Autenticación 100% Offline para Cifrix

**Fecha:** 2026-02-15  
**Autor:** Equipo Cifrix  
**Estado:** Diseño Aprobado - Pendiente Implementación

---

## Resumen Ejecutivo

Este documento describe el diseño de un sistema de autenticación híbrido que permitirá a Cifrix funcionar completamente offline, incluyendo la capacidad de cambiar de cuenta sin conexión a internet. El sistema utilizará una "Bóveda Local Encriptada" para almacenar credenciales de forma segura en el dispositivo del usuario.

### Objetivos

1. **Acceso Offline Total:** Permitir que usuarios autenticados previamente puedan iniciar sesión sin conexión a internet.
2. **Cambio de Cuenta Offline:** Soportar múltiples usuarios en el mismo dispositivo, todos con capacidad de login offline.
3. **Seguridad Robusta:** Proteger las credenciales y perfiles mediante encriptación AES-256.
4. **Sincronización Automática:** Reconectar y sincronizar datos automáticamente cuando vuelva la conexión.
5. **Experiencia Transparente:** El usuario no debe notar diferencia entre trabajar online u offline (excepto por indicadores visuales).

### Restricción Técnica Aceptada

**El usuario debe iniciar sesión con internet al menos una vez en cada dispositivo.** Esto es necesario para que la aplicación pueda validar las credenciales con Supabase y crear la entrada local encriptada.

---

## Arquitectura del Sistema

### 1. Modelo de Datos: Bóveda Local (`user_vault`)

Crearemos una nueva tabla en Dexie (IndexedDB) para almacenar las credenciales locales de forma segura.

#### Esquema de la Tabla

```typescript
interface UserVaultEntry {
  email: string;                    // Índice primario - Email del usuario
  password_hash: string;            // SHA-256 hash de la contraseña + salt
  salt: string;                     // Salt único generado por usuario
  encrypted_profile: string;        // Perfil del usuario encriptado en AES-256
  encryption_iv: string;            // Vector de inicialización para AES
  user_id: string;                  // ID del usuario en Supabase
  last_sync: string;                // Timestamp del último login online exitoso
  created_at: string;               // Timestamp de creación de la entrada
}
```

#### Actualización del Schema de Dexie

En `src/lib/db.ts`, agregaremos:

```typescript
export class CifrixDB extends Dexie {
  // ... tablas existentes ...
  user_vault!: Table<UserVaultEntry>;

  constructor() {
    super('CifrixDatabase');
    this.version(10).stores({  // Incrementar versión
      // ... stores existentes ...
      user_vault: 'email, user_id, last_sync'
    });
  }
}
```

---

### 2. Criptografía y Seguridad

Utilizaremos la biblioteca `node-forge` (ya instalada en el proyecto) para implementar la encriptación.

#### Algoritmos Seleccionados

1. **Hashing de Contraseña:** SHA-256 con salt único por usuario
2. **Derivación de Llave:** PBKDF2 (Password-Based Key Derivation Function 2)
   - Iteraciones: 10,000 (balance entre seguridad y performance)
   - Longitud de llave: 256 bits
3. **Encriptación de Perfil:** AES-256-CBC
   - Vector de Inicialización (IV) aleatorio por entrada
   - El perfil completo (rol, organización, permisos) se encripta como JSON

#### Flujo de Encriptación (Primer Login Online)

```
1. Usuario ingresa email + password
2. Supabase valida credenciales → Éxito
3. Sistema genera:
   - Salt aleatorio (32 bytes)
   - Password Hash = SHA256(password + salt)
   - Encryption Key = PBKDF2(password, salt, 10000 iterations)
   - IV aleatorio (16 bytes)
4. Perfil del usuario se serializa a JSON
5. Encrypted Profile = AES-256-CBC(profile_json, encryption_key, iv)
6. Se guarda en user_vault:
   {
     email,
     password_hash,
     salt,
     encrypted_profile,
     encryption_iv: iv,
     user_id,
     last_sync: now()
   }
```

#### Flujo de Desencriptación (Login Offline)

```
1. Usuario ingresa email + password (sin internet)
2. Sistema busca email en user_vault
3. Si existe:
   - Calcula Password Hash = SHA256(password + stored_salt)
   - Compara con stored_password_hash
   - Si coincide:
     * Deriva Encryption Key = PBKDF2(password, stored_salt, 10000)
     * Desencripta: profile = AES-256-CBC-DECRYPT(encrypted_profile, key, stored_iv)
     * Crea "Usuario Virtual" con el perfil recuperado
   - Si no coincide: Error "Contraseña incorrecta"
4. Si no existe: Error "Usuario no encontrado en este dispositivo"
```

---

### 3. Lógica de Login Híbrido

El componente `Login.tsx` implementará un árbol de decisión inteligente.

#### Diagrama de Flujo

```
Usuario hace clic en "Ingresar"
    ↓
¿Hay conexión a internet? (navigator.onLine)
    ↓
    ├─ SÍ → Intentar Login con Supabase
    │         ↓
    │         ├─ Éxito → Actualizar/Crear entrada en user_vault
    │         │          Inyectar usuario real en authStore
    │         │          Navegar a Dashboard
    │         │
    │         ├─ Fallo (Credenciales) → Mostrar error
    │         │                         NO intentar offline
    │         │
    │         └─ Fallo (Red/Timeout) → Saltar a Modo Offline ↓
    │
    └─ NO → Modo Offline
              ↓
              Buscar email en user_vault
              ↓
              ├─ Encontrado → Validar password_hash
              │               ↓
              │               ├─ Válido → Desencriptar perfil
              │               │           Crear Usuario Virtual
              │               │           Inyectar en authStore
              │               │           Navegar a Dashboard
              │               │
              │               └─ Inválido → Error "Contraseña incorrecta"
              │
              └─ No encontrado → Error "Usuario no registrado en este dispositivo"
```

#### El "Usuario Virtual"

Cuando el login es offline, crearemos un objeto de sesión sintético:

```typescript
interface VirtualUser {
  id: string;              // user_id de la bóveda
  email: string;
  isOffline: true;         // Bandera para identificar sesiones offline
  app_metadata: {
    role: string;
  };
  user_metadata: {};
  created_at: string;
  last_sign_in_at: string; // Timestamp del login offline
}
```

Este objeto se inyectará en `authStore` exactamente como si fuera un usuario real de Supabase, permitiendo que el resto de la aplicación funcione sin modificaciones.

---

### 4. Indicadores Visuales de Estado

Es crítico que el usuario sepa en qué modo está trabajando.

#### Cambios en la UI del Login

1. **Detección de Red:**
   - Si `navigator.onLine === false`, mostrar banner: 
     ```
     ⚠️ Sin conexión a internet - Modo Offline Activado
     ```
   - Cambiar texto del botón de "Ingresar al Sistema" a "Ingresar Offline"

2. **Feedback Post-Login:**
   - Login Online: Toast verde → "Sesión iniciada correctamente"
   - Login Offline: Toast naranja → "Sesión iniciada en modo offline - Los cambios se sincronizarán cuando vuelva la conexión"

#### Indicador Global en la Aplicación

Agregaremos un componente `<OfflineIndicator />` en el layout principal que muestre:
- **Online:** Icono de nube verde (discreto)
- **Offline:** Banner persistente en la parte superior:
  ```
  📵 Trabajando sin conexión | Datos pendientes de sincronización: X registros
  ```

---

### 5. Sincronización al Reconectar

#### Listener de Reconexión

En `src/lib/sync.ts`, mejoraremos el listener existente:

```typescript
window.addEventListener('online', async () => {
  console.log('🌐 Conexión restablecida');
  
  // 1. Notificar al usuario
  toast.info('Conexión restablecida. Sincronizando datos...');
  
  // 2. Intentar restaurar sesión real de Supabase
  await restoreSupabaseSession();
  
  // 3. Sincronizar datos pendientes
  await syncFromCacheToSupabase();
  
  // 4. Actualizar bóveda local con datos frescos
  await refreshUserVault();
  
  // 5. Notificar éxito
  toast.success('Sincronización completada');
});
```

#### Restauración de Sesión Real

Si el usuario estaba usando un "Usuario Virtual", intentaremos convertirlo en sesión real:

```typescript
async function restoreSupabaseSession() {
  const currentUser = useAuthStore.getState().user;
  
  if (currentUser?.isOffline) {
    // Intentar obtener sesión de Supabase (puede tener token guardado)
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      // Reemplazar usuario virtual con usuario real
      useAuthStore.getState().setUser(session.user);
      await useAuthStore.getState().initialize();
    } else {
      // No hay sesión guardada, el usuario debe re-loguearse online
      // para operaciones que requieran autenticación en la nube
      console.warn('Sesión offline activa. Re-login requerido para operaciones en la nube.');
    }
  }
}
```

#### Orden de Sincronización

Para mantener integridad referencial, sincronizaremos en este orden:

1. **Eliminaciones** (`deleted_records`)
2. **Datos Maestros** (organizations, accounts, categories, projects, members, customers)
3. **Transacciones** (transactions, journal_entries, contributions)
4. **Documentos** (invoices, invoice_items, payments)
5. **Auditoría** (audit_logs)

#### Manejo de Conflictos

**Estrategia: "El Último Gana" (Last Write Wins)**

- Comparamos el campo `updated_at` del registro local vs. el de la nube.
- El más reciente sobrescribe al otro.
- Para un programa contable de uso individual/pequeño equipo, esta estrategia es suficiente.
- **Mejora Futura:** Implementar "Conflict Resolution UI" para transacciones críticas.

---

### 6. Actualización de la Bóveda

Después de cada login online exitoso, actualizaremos la entrada en `user_vault`:

```typescript
async function updateUserVault(email: string, password: string, profile: UserProfile) {
  const salt = forge.random.getBytesSync(32);
  const passwordHash = hashPassword(password, salt);
  const { encryptedProfile, iv } = encryptProfile(profile, password, salt);
  
  await db.user_vault.put({
    email,
    password_hash: passwordHash,
    salt: forge.util.encode64(salt),
    encrypted_profile: encryptedProfile,
    encryption_iv: forge.util.encode64(iv),
    user_id: profile.userId,
    last_sync: new Date().toISOString(),
    created_at: existingEntry?.created_at || new Date().toISOString()
  });
}
```

Esto garantiza que:
- Los cambios de permisos/roles se reflejen en el perfil offline.
- La contraseña se actualice si el usuario la cambió online.

---

## Consideraciones de Seguridad

### Protecciones Implementadas

1. **No se guarda la contraseña en texto plano:** Solo el hash.
2. **Salt único por usuario:** Previene ataques de rainbow tables.
3. **Encriptación fuerte:** AES-256 es estándar militar.
4. **Llave derivada de contraseña:** Sin la contraseña correcta, es imposible desencriptar el perfil.
5. **IV aleatorio:** Cada encriptación usa un vector diferente.

### Vectores de Ataque y Mitigaciones

| Ataque | Mitigación |
|--------|------------|
| Acceso físico al dispositivo | La base de datos está encriptada. Sin la contraseña, los datos son ilegibles. |
| Keylogger | No hay mitigación perfecta, pero el hash local impide que el atacante use la contraseña en otros servicios. |
| Extracción de IndexedDB | Los datos están encriptados con AES-256. Romperlo requiere fuerza bruta sobre PBKDF2 (10,000 iteraciones). |
| Modificación de código JS | Service Worker con integridad de archivos (futuro). |

### Limitaciones Conocidas

1. **Cambio de contraseña online no invalida bóveda:** Si el usuario cambia su contraseña en otro dispositivo, este dispositivo seguirá aceptando la contraseña vieja hasta el próximo login online.
   - **Solución:** Implementar un "version number" en el perfil que se valide en cada reconexión.

2. **Revocación de permisos no es instantánea:** Si un admin revoca permisos, el usuario offline seguirá teniendo acceso hasta reconectar.
   - **Solución:** Implementar un TTL (Time To Live) en la bóveda. Después de X días sin login online, forzar re-autenticación.

---

## Plan de Implementación (Próximos Pasos)

### Fase 1: Fundamentos de Criptografía
1. Crear `src/lib/crypto.ts` con funciones de encriptación/desencriptación.
2. Agregar tabla `user_vault` a `db.ts`.
3. Escribir tests unitarios para las funciones de crypto.

### Fase 2: Modificación del Login
1. Actualizar `Login.tsx` con lógica híbrida.
2. Implementar detección de red y UI condicional.
3. Crear función `saveToVault()` que se llame después de login online exitoso.
4. Crear función `loginFromVault()` para modo offline.

### Fase 3: Usuario Virtual y AuthStore
1. Modificar `authStore.ts` para aceptar usuarios con bandera `isOffline`.
2. Asegurar que el resto de la app funcione con usuarios virtuales.
3. Implementar `restoreSupabaseSession()` para reconexión.

### Fase 4: Indicadores Visuales
1. Crear componente `<OfflineIndicator />`.
2. Agregar toasts de notificación en puntos clave.
3. Modificar UI del Login según estado de red.

### Fase 5: Sincronización Mejorada
1. Mejorar `sync.ts` con listener de reconexión.
2. Implementar `refreshUserVault()` post-sincronización.
3. Agregar manejo de conflictos básico.

### Fase 6: Testing y Refinamiento
1. Probar flujo completo: Online → Offline → Online.
2. Probar con múltiples usuarios en el mismo dispositivo.
3. Simular escenarios de conflicto.
4. Optimizar performance de encriptación/desencriptación.

---

## Métricas de Éxito

- ✅ Usuario puede iniciar sesión sin internet después de haberlo hecho online una vez.
- ✅ Usuario puede cambiar de cuenta offline (si ambas cuentas tienen entrada en la bóveda).
- ✅ Datos creados offline se sincronizan correctamente al reconectar.
- ✅ No hay pérdida de datos en el proceso de sincronización.
- ✅ El tiempo de encriptación/desencriptación es < 500ms en dispositivos promedio.
- ✅ La aplicación muestra claramente cuándo está en modo offline.

---

## Conclusión

Este diseño convierte a Cifrix en una verdadera aplicación "Local-First", permitiendo a usuarios trabajar sin interrupciones independientemente de su conectividad. La arquitectura de "Bóveda Local Encriptada" balancea seguridad, usabilidad y performance, siendo ideal para un sistema contable que maneja datos sensibles.

La implementación se realizará en fases incrementales, permitiendo validar cada componente antes de avanzar al siguiente.
