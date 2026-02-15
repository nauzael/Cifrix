# 📚 Documentación Técnica - Sistema de Autenticación Offline

**Proyecto:** Cifrix  
**Versión:** 1.0  
**Fecha:** 2026-02-15

---

## 📋 Tabla de Contenidos

1. [Arquitectura General](#arquitectura-general)
2. [Módulos del Sistema](#módulos-del-sistema)
3. [Flujos de Datos](#flujos-de-datos)
4. [Seguridad](#seguridad)
5. [API Reference](#api-reference)
6. [Configuración](#configuración)
7. [Troubleshooting](#troubleshooting)

---

## 1. Arquitectura General

### Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                      CIFRIX OFFLINE AUTH                     │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Login.tsx  │────▶│  userVault   │────▶│   crypto.ts  │
│              │     │              │     │              │
│ - Online     │     │ - Save       │     │ - AES-256    │
│ - Offline    │     │ - Auth       │     │ - PBKDF2     │
│ - Hybrid     │     │ - Update     │     │ - SHA-256    │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                     │
       │                    ▼                     │
       │             ┌──────────────┐            │
       │             │   Dexie DB   │            │
       │             │              │            │
       │             │ user_vault   │            │
       │             │ (IndexedDB)  │            │
       │             └──────────────┘            │
       │                                         │
       ▼                                         ▼
┌──────────────┐                         ┌──────────────┐
│  authStore   │                         │  Supabase    │
│              │                         │              │
│ - User       │◀────────────────────────│ - Auth       │
│ - Profile    │                         │ - Database   │
│ - isOffline  │                         │ - RLS        │
└──────────────┘                         └──────────────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ reconnection │────▶│    sync.ts   │────▶│ maintenance  │
│              │     │              │     │              │
│ - Restore    │     │ - Upload     │     │ - Cleanup    │
│ - Sync       │     │ - Download   │     │ - Monitor    │
│ - Notify     │     │ - Conflict   │     │ - Stats      │
└──────────────┘     └──────────────┘     └──────────────┘
```

---

## 2. Módulos del Sistema

### 2.1 `crypto.ts`
**Propósito:** Operaciones criptográficas

**Funciones Principales:**
- `generateSalt()`: Genera salt aleatorio de 32 bytes
- `hashPassword(password, salt)`: Hash SHA-256 de contraseña
- `verifyPassword(password, salt, hash)`: Verifica contraseña
- `encryptProfile(data, password, salt)`: Encripta con AES-256-CBC
- `decryptProfile(encrypted, password, salt, iv)`: Desencripta perfil

**Algoritmos:**
- **Hashing:** SHA-256
- **Derivación de llaves:** PBKDF2 (10,000 iteraciones)
- **Encriptación:** AES-256-CBC
- **Salt:** 32 bytes aleatorios
- **IV:** 16 bytes aleatorios

---

### 2.2 `userVault.ts`
**Propósito:** Gestión de la bóveda de usuarios

**Funciones Principales:**
```typescript
saveUserToVault(email, password, profile): Promise<void>
authenticateFromVault(email, password): Promise<UserProfile>
userExistsInVault(email): Promise<boolean>
getVaultUsers(): Promise<Array<{email, userId, lastSync}>>
removeUserFromVault(email): Promise<void>
cleanOldVaultEntries(maxDaysOld): Promise<number>
getVaultStats(): Promise<{totalUsers, oldestSync, newestSync}>
```

**Estructura de Datos:**
```typescript
interface UserVaultEntry {
  email: string;              // Primary key
  password_hash: string;      // SHA-256 hash
  salt: string;               // Base64 encoded
  encrypted_profile: string;  // AES-256 encrypted
  encryption_iv: string;      // Base64 encoded
  user_id: string;           // UUID
  last_sync: string;         // ISO timestamp
  created_at: string;        // ISO timestamp
}
```

---

### 2.3 `reconnection.ts`
**Propósito:** Manejo de reconexión y sincronización

**Funciones Principales:**
```typescript
handleReconnection(): Promise<void>
resetReconnectionAttempts(): void
getPendingSyncCount(): Promise<number>
registerReconnectionListener(): void
```

**Flujo de Reconexión:**
1. Detectar evento `window.online`
2. Esperar 1 segundo (estabilidad)
3. Restaurar sesión de Supabase
4. Sincronizar datos pendientes
5. Actualizar bóveda
6. Notificar al usuario

**Límites:**
- Máximo 3 intentos de reconexión
- Timeout de 1 segundo antes de iniciar

---

### 2.4 `maintenance.ts`
**Propósito:** Mantenimiento automático del sistema

**Funciones Principales:**
```typescript
startMaintenanceService(): void
stopMaintenanceService(): void
runManualMaintenance(): Promise<void>
getMaintenanceInfo(): {isActive, lastRun, nextRun}
```

**Tareas Periódicas:**
- Limpieza de bóveda (cada 24 horas)
- Verificación de sincronización
- Alertas de registros pendientes
- Logging de estadísticas

**Configuración:**
```typescript
MAINTENANCE_INTERVAL = 24 * 60 * 60 * 1000; // 24 horas
VAULT_MAX_AGE_DAYS = 90; // 90 días
PENDING_SYNC_WARNING_THRESHOLD = 100; // 100 registros
```

---

### 2.5 `OfflineIndicator.tsx`
**Propósito:** Indicador visual de estado

**Estados:**
1. **Online sin pendientes:** No visible
2. **Online con pendientes:** Banner azul "Sincronizando X registros..."
3. **Offline:** Banner naranja "Trabajando sin conexión"

**Actualización:**
- Estado de conexión: Tiempo real (event listeners)
- Contador de pendientes: Cada 10 segundos

---

## 3. Flujos de Datos

### 3.1 Flujo de Login Online

```
Usuario ingresa credenciales
         │
         ▼
Login.tsx: attemptOnlineLogin()
         │
         ▼
Supabase.auth.signInWithPassword()
         │
         ├─ Error ──▶ Intentar offline (fallback)
         │
         ▼ Éxito
authStore.setUser(user)
         │
         ▼
authStore.initialize() → Fetch profile
         │
         ▼
userVault.saveUserToVault(email, password, profile)
         │
         ├─ generateSalt()
         ├─ hashPassword()
         └─ encryptProfile()
         │
         ▼
Dexie.user_vault.put(entry)
         │
         ▼
Navigate to dashboard
```

---

### 3.2 Flujo de Login Offline

```
Usuario ingresa credenciales
         │
         ▼
Login.tsx: attemptOfflineLogin()
         │
         ▼
userVault.authenticateFromVault(email, password)
         │
         ├─ Dexie.user_vault.get(email)
         ├─ verifyPassword()
         └─ decryptProfile()
         │
         ▼ Éxito
Crear Usuario Virtual
         │
         ▼
authStore.setState({user, profile, isOffline: true})
         │
         ▼
Navigate to dashboard
```

---

### 3.3 Flujo de Reconexión

```
window.online event
         │
         ▼
reconnection.handleReconnection()
         │
         ├─ Toast: "Conexión restablecida..."
         │
         ▼
restoreSupabaseSession()
         │
         ├─ supabase.auth.getSession()
         ├─ authStore.setUser(session.user)
         └─ authStore.refreshProfile()
         │
         ▼
syncToSupabase(organizationId)
         │
         ├─ Subir deletions
         ├─ Subir inserts/updates
         └─ Marcar como sincronizado
         │
         ▼
Toast: "Sincronización completada"
```

---

## 4. Seguridad

### 4.1 Almacenamiento Seguro

**Datos Almacenados:**
- ✅ Password Hash (SHA-256)
- ✅ Salt (32 bytes)
- ✅ Perfil Encriptado (AES-256)
- ✅ IV de Encriptación (16 bytes)

**Datos NO Almacenados:**
- ❌ Contraseña en texto plano
- ❌ Tokens de sesión
- ❌ Datos sensibles sin encriptar

### 4.2 Derivación de Llaves

```typescript
// PBKDF2 con 10,000 iteraciones
const key = forge.pkcs5.pbkdf2(
  password,
  saltBytes,
  10000,  // iterations
  32      // key length (256 bits)
);
```

**Justificación:**
- 10,000 iteraciones = ~100ms en hardware moderno
- Suficiente para prevenir ataques de fuerza bruta
- No tan lento como para afectar UX

### 4.3 Protecciones Implementadas

1. **Contra Fuerza Bruta:**
   - Límite de 3 intentos de reconexión
   - Hash de contraseña con salt único

2. **Contra Inspección:**
   - Datos encriptados en IndexedDB
   - No hay contraseñas en localStorage

3. **Contra Replay Attacks:**
   - IV único por encriptación
   - Timestamps de sincronización

### 4.4 Consideraciones de Seguridad

⚠️ **Limitaciones Conocidas:**
- La contraseña del usuario es la llave maestra
- Si el usuario olvida su contraseña, no hay recuperación offline
- IndexedDB es accesible por JavaScript en el mismo origen

✅ **Mitigaciones:**
- Validación de fortaleza de contraseña
- Limpieza automática de entradas antiguas (90 días)
- Encriptación AES-256 estándar de la industria

---

## 5. API Reference

### crypto.ts

#### `generateSalt(): string`
Genera un salt aleatorio de 32 bytes.

**Returns:** String base64 del salt

**Example:**
```typescript
const salt = generateSalt();
// "kJ8x7mP3nQ2wR5tY9uI1oL4aS6dF8gH0"
```

---

#### `hashPassword(password: string, salt: string): string`
Genera hash SHA-256 de una contraseña.

**Parameters:**
- `password`: Contraseña en texto plano
- `salt`: Salt en base64

**Returns:** Hash hexadecimal

**Example:**
```typescript
const hash = hashPassword("MyPassword123!", salt);
// "a3f5e8d9c2b1..."
```

---

#### `encryptProfile(data: any, password: string, salt: string): {encryptedData: string, iv: string}`
Encripta datos usando AES-256-CBC.

**Parameters:**
- `data`: Objeto a encriptar
- `password`: Contraseña para derivar llave
- `salt`: Salt en base64

**Returns:** Objeto con datos encriptados e IV

**Example:**
```typescript
const { encryptedData, iv } = encryptProfile(
  { userId: "123", role: "ADMIN" },
  "MyPassword123!",
  salt
);
```

---

### userVault.ts

#### `saveUserToVault(email: string, password: string, profile: UserProfile): Promise<void>`
Guarda o actualiza usuario en la bóveda.

**Parameters:**
- `email`: Email del usuario
- `password`: Contraseña (se hashea, no se guarda en texto plano)
- `profile`: Perfil completo del usuario

**Throws:** Error si falla el guardado

**Example:**
```typescript
await saveUserToVault(
  "user@example.com",
  "SecurePass123!",
  {
    userId: "uuid-123",
    role: "ADMIN",
    organizationId: "org-456",
    // ...
  }
);
```

---

#### `authenticateFromVault(email: string, password: string): Promise<UserProfile>`
Autentica usuario desde la bóveda local.

**Parameters:**
- `email`: Email del usuario
- `password`: Contraseña ingresada

**Returns:** Perfil del usuario si las credenciales son correctas

**Throws:**
- Error si usuario no existe
- Error si contraseña es incorrecta

**Example:**
```typescript
try {
  const profile = await authenticateFromVault(
    "user@example.com",
    "SecurePass123!"
  );
  console.log("Login exitoso:", profile.role);
} catch (error) {
  console.error("Login fallido:", error.message);
}
```

---

### reconnection.ts

#### `handleReconnection(): Promise<void>`
Ejecuta el proceso completo de reconexión.

**Proceso:**
1. Restaurar sesión de Supabase
2. Sincronizar datos pendientes
3. Actualizar bóveda
4. Notificar al usuario

**Example:**
```typescript
// Se ejecuta automáticamente en evento 'online'
// También se puede llamar manualmente:
await handleReconnection();
```

---

#### `getPendingSyncCount(): Promise<number>`
Cuenta registros pendientes de sincronización.

**Returns:** Número total de registros pendientes

**Example:**
```typescript
const count = await getPendingSyncCount();
console.log(`${count} registros pendientes`);
```

---

## 6. Configuración

### Variables de Entorno

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Modo de Base de Datos
# production: Todo directo a Supabase
# hybrid: Cache local + Supabase
# offline: Solo local, sync manual
VITE_DB_MODE=hybrid
```

### Configuración de Mantenimiento

```typescript
// src/lib/maintenance.ts
const MAINTENANCE_INTERVAL = 24 * 60 * 60 * 1000; // 24 horas
const VAULT_MAX_AGE_DAYS = 90; // 90 días
const PENDING_SYNC_WARNING_THRESHOLD = 100; // 100 registros
```

### Configuración de Reconexión

```typescript
// src/lib/reconnection.ts
const MAX_RECONNECTION_ATTEMPTS = 3;
```

---

## 7. Troubleshooting

### Problema: "Usuario no encontrado en este dispositivo"

**Causa:** El usuario nunca ha iniciado sesión online en este dispositivo

**Solución:**
1. Conectarse a internet
2. Iniciar sesión online
3. Ahora podrá iniciar sesión offline

---

### Problema: "Desencriptación fallida - Contraseña incorrecta"

**Causas Posibles:**
1. Contraseña incorrecta
2. Datos corruptos en IndexedDB
3. Cambio de contraseña en Supabase

**Solución:**
1. Verificar contraseña
2. Si persiste, limpiar IndexedDB:
```javascript
indexedDB.deleteDatabase('CifrixDatabase');
```
3. Iniciar sesión online de nuevo

---

### Problema: Sincronización no se ejecuta automáticamente

**Verificaciones:**
1. Revisar consola: ¿Hay errores?
2. Verificar listener registrado:
```javascript
import { getMaintenanceInfo } from './lib/maintenance';
console.log(getMaintenanceInfo());
```
3. Verificar conexión a internet
4. Ejecutar sincronización manual:
```javascript
import { handleReconnection } from './lib/reconnection';
await handleReconnection();
```

---

### Problema: Bóveda crece demasiado

**Solución:**
1. Ejecutar limpieza manual:
```javascript
import { cleanOldVaultEntries } from './lib/userVault';
const deleted = await cleanOldVaultEntries(30); // 30 días
console.log(`${deleted} entradas eliminadas`);
```

2. Ajustar configuración de mantenimiento

---

### Problema: Performance lenta en login offline

**Verificaciones:**
1. Número de usuarios en bóveda:
```javascript
import { getVaultStats } from './lib/userVault';
const stats = await getVaultStats();
console.log(stats);
```

2. Si hay muchos usuarios, limpiar antiguos
3. Verificar que PBKDF2 no tiene demasiadas iteraciones

---

## 📝 Notas Adicionales

### Compatibilidad de Navegadores

- ✅ Chrome 90+
- ✅ Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+

**Requisitos:**
- IndexedDB habilitado
- JavaScript habilitado
- Cookies/LocalStorage habilitado

### Limitaciones Conocidas

1. **Tamaño de IndexedDB:** Limitado por el navegador (~50MB típico)
2. **Usuarios simultáneos:** Máximo recomendado: 10 usuarios por dispositivo
3. **Edad de bóveda:** Entradas > 90 días se eliminan automáticamente

### Roadmap Futuro

- [ ] Soporte para biometría (fingerprint/face ID)
- [ ] Sincronización selectiva (solo tablas específicas)
- [ ] Compresión de datos en bóveda
- [ ] Exportar/Importar bóveda entre dispositivos

---

**Última actualización:** 2026-02-15  
**Versión:** 1.0  
**Mantenedor:** Equipo de Desarrollo Cifrix
