# 🧪 Plan de Testing - Sistema de Autenticación Offline

**Fecha:** 2026-02-15  
**Proyecto:** Cifrix - Sistema de Autenticación 100% Offline  
**Versión:** 1.0

---

## 📋 Tabla de Contenidos

1. [Casos de Prueba Funcionales](#casos-de-prueba-funcionales)
2. [Casos de Prueba de Seguridad](#casos-de-prueba-de-seguridad)
3. [Casos de Prueba de Performance](#casos-de-prueba-de-performance)
4. [Casos de Prueba de UX](#casos-de-prueba-de-ux)
5. [Checklist de Validación](#checklist-de-validación)

---

## 1. Casos de Prueba Funcionales

### Test 1.1: Primer Login Online
**Objetivo:** Verificar que el primer login guarda las credenciales en la bóveda

**Pasos:**
1. Asegurarse de tener conexión a internet
2. Abrir la aplicación en modo incógnito (para limpiar estado)
3. Ingresar credenciales válidas
4. Hacer login

**Resultado Esperado:**
- ✅ Login exitoso
- ✅ Redirección al dashboard
- ✅ Entrada creada en IndexedDB → CifrixDatabase → user_vault
- ✅ Console log: "✅ Usuario guardado en la bóveda local"

**Validación:**
```javascript
// En DevTools Console:
const db = await new Dexie('CifrixDatabase');
db.version(10).stores({user_vault: 'email'});
const users = await db.table('user_vault').toArray();
console.log(users); // Debe mostrar el usuario guardado
```

---

### Test 1.2: Login Offline (Usuario Existente)
**Objetivo:** Verificar que un usuario puede iniciar sesión sin internet

**Prerequisitos:**
- Haber completado Test 1.1 exitosamente

**Pasos:**
1. Abrir DevTools → Network → Activar "Offline"
2. Recargar la página (F5)
3. Ingresar las mismas credenciales del Test 1.1
4. Hacer login

**Resultado Esperado:**
- ✅ Banner naranja visible: "Modo Offline"
- ✅ Botón de login cambia a naranja: "Ingresar Offline"
- ✅ Login exitoso
- ✅ Redirección al dashboard
- ✅ Console log: "✅ Login offline exitoso"
- ✅ Banner permanente: "Trabajando sin conexión"

---

### Test 1.3: Login Offline (Usuario No Existente)
**Objetivo:** Verificar que usuarios no guardados no pueden entrar offline

**Pasos:**
1. Mantener modo offline activo
2. Cerrar sesión
3. Intentar login con credenciales de un usuario diferente (que nunca haya iniciado sesión en este dispositivo)

**Resultado Esperado:**
- ✅ Error mostrado: "Este usuario no está registrado en este dispositivo. Necesita conexión a internet para el primer inicio de sesión."
- ❌ Login fallido

---

### Test 1.4: Contraseña Incorrecta Offline
**Objetivo:** Verificar validación de contraseña en modo offline

**Pasos:**
1. Mantener modo offline activo
2. Intentar login con email correcto pero contraseña incorrecta

**Resultado Esperado:**
- ✅ Error mostrado: "Contraseña incorrecta"
- ❌ Login fallido

---

### Test 1.5: Creación de Datos Offline
**Objetivo:** Verificar que se pueden crear registros sin conexión

**Prerequisitos:**
- Estar logueado en modo offline

**Pasos:**
1. Navegar a "Miembros"
2. Crear un nuevo miembro con datos de prueba
3. Guardar

**Resultado Esperado:**
- ✅ Miembro creado exitosamente
- ✅ Toast de confirmación
- ✅ Miembro visible en la lista
- ✅ Banner muestra: "1 registro pendiente de sincronización"

**Validación:**
```javascript
// En DevTools Console:
const db = await new Dexie('CifrixDatabase');
db.version(10).stores({members: 'id'});
const pending = await db.table('members')
  .where('sync_status')
  .equals('pendiente')
  .toArray();
console.log(pending); // Debe mostrar el miembro creado
```

---

### Test 1.6: Reconexión y Sincronización Automática
**Objetivo:** Verificar que al reconectar se sincronizan los datos automáticamente

**Prerequisitos:**
- Tener registros pendientes (Test 1.5)

**Pasos:**
1. Desactivar modo offline en DevTools
2. Observar la UI

**Resultado Esperado:**
- ✅ Toast azul: "Conexión restablecida. Sincronizando datos..."
- ✅ Banner cambia a azul: "Sincronizando X registros..."
- ✅ Después de ~3 segundos: Toast verde "Sincronización completada exitosamente"
- ✅ Banner desaparece
- ✅ Console log: "✅ Sincronización completada"

**Validación en Supabase:**
```sql
-- Verificar en Supabase SQL Editor:
SELECT * FROM members 
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;
-- Debe mostrar el miembro creado offline
```

---

### Test 1.7: Múltiples Usuarios en Bóveda
**Objetivo:** Verificar que múltiples usuarios pueden estar guardados

**Pasos:**
1. Con conexión online, iniciar sesión con Usuario A
2. Cerrar sesión
3. Iniciar sesión con Usuario B
4. Cerrar sesión
5. Activar modo offline
6. Intentar login con Usuario A
7. Cerrar sesión
8. Intentar login con Usuario B

**Resultado Esperado:**
- ✅ Ambos usuarios pueden iniciar sesión offline
- ✅ Cada usuario ve sus propios datos

---

### Test 1.8: Actualización de Bóveda en Re-login
**Objetivo:** Verificar que la bóveda se actualiza en cada login online

**Pasos:**
1. Con conexión online, iniciar sesión
2. En Supabase, cambiar el rol del usuario (ej: USER → ADMIN)
3. Cerrar sesión en la app
4. Volver a iniciar sesión online
5. Activar modo offline
6. Cerrar sesión
7. Iniciar sesión offline

**Resultado Esperado:**
- ✅ El perfil offline refleja el nuevo rol
- ✅ Los permisos se aplican correctamente

---

## 2. Casos de Prueba de Seguridad

### Test 2.1: Encriptación de Datos
**Objetivo:** Verificar que los datos en la bóveda están encriptados

**Pasos:**
1. Completar Test 1.1
2. Abrir DevTools → Application → IndexedDB → CifrixDatabase → user_vault
3. Inspeccionar el campo `encrypted_profile`

**Resultado Esperado:**
- ✅ El campo `encrypted_profile` contiene una cadena base64 ilegible
- ✅ No se puede ver el perfil en texto plano
- ✅ El campo `password_hash` es un hash hexadecimal (no la contraseña)

---

### Test 2.2: Validación de Fortaleza de Contraseña
**Objetivo:** Verificar que solo se aceptan contraseñas seguras

**Pasos:**
1. Intentar crear una cuenta con contraseña débil (ej: "123")

**Resultado Esperado:**
- ✅ Error de validación mostrado
- ❌ Cuenta no creada

---

### Test 2.3: Protección contra Ataques de Fuerza Bruta
**Objetivo:** Verificar límite de intentos de reconexión

**Pasos:**
1. Simular 3 fallos de reconexión consecutivos
2. Intentar una 4ta reconexión

**Resultado Esperado:**
- ✅ Toast de advertencia: "No se pudo reconectar automáticamente. Por favor, recargue la página."
- ✅ No se intenta más reconexiones automáticas

---

## 3. Casos de Prueba de Performance

### Test 3.1: Tiempo de Login Offline
**Objetivo:** Verificar que el login offline es rápido

**Pasos:**
1. Medir tiempo desde clic en "Ingresar Offline" hasta redirección

**Resultado Esperado:**
- ✅ Login completo en < 500ms
- ✅ No hay lag perceptible

---

### Test 3.2: Sincronización de Grandes Volúmenes
**Objetivo:** Verificar performance con muchos registros pendientes

**Pasos:**
1. Crear 50 registros en modo offline
2. Reconectar

**Resultado Esperado:**
- ✅ Sincronización completa en < 30 segundos
- ✅ UI sigue siendo responsive durante la sincronización
- ✅ Contador de pendientes se actualiza correctamente

---

### Test 3.3: Limpieza Automática de Bóveda
**Objetivo:** Verificar que el mantenimiento no afecta performance

**Pasos:**
1. Ejecutar mantenimiento manual:
```javascript
import { runManualMaintenance } from './lib/maintenance';
await runManualMaintenance();
```

**Resultado Esperado:**
- ✅ Mantenimiento completa en < 5 segundos
- ✅ No hay bloqueo de la UI
- ✅ Console logs informativos

---

## 4. Casos de Prueba de UX

### Test 4.1: Indicadores Visuales Claros
**Objetivo:** Verificar que el usuario siempre sabe su estado

**Pasos:**
1. Navegar por la app en modo online
2. Activar modo offline
3. Crear datos
4. Reconectar

**Resultado Esperado:**
- ✅ Banner naranja visible cuando está offline
- ✅ Contador de registros pendientes actualizado
- ✅ Toasts informativos en cada transición
- ✅ Colores consistentes (naranja=offline, azul=sincronizando, verde=éxito)

---

### Test 4.2: Link de "Olvidaste tu contraseña" Deshabilitado
**Objetivo:** Verificar que funciones online están deshabilitadas offline

**Pasos:**
1. Activar modo offline en la página de login
2. Intentar hacer clic en "¿Olvidaste tu contraseña?"

**Resultado Esperado:**
- ✅ Link está visualmente deshabilitado (gris)
- ✅ No hace nada al hacer clic

---

### Test 4.3: Mensajes de Error Claros
**Objetivo:** Verificar que los errores son comprensibles

**Pasos:**
1. Provocar diferentes errores (contraseña incorrecta, usuario no existe, etc.)

**Resultado Esperado:**
- ✅ Mensajes en español claro
- ✅ Indican qué hacer para resolver el problema
- ✅ No muestran detalles técnicos al usuario

---

## 5. Checklist de Validación Final

### ✅ Funcionalidad Core
- [ ] Login online guarda en bóveda
- [ ] Login offline funciona con usuario guardado
- [ ] Login offline falla con usuario no guardado
- [ ] Contraseña incorrecta es rechazada
- [ ] Datos se pueden crear offline
- [ ] Reconexión sincroniza automáticamente
- [ ] Múltiples usuarios soportados

### ✅ Seguridad
- [ ] Datos encriptados en IndexedDB
- [ ] Contraseñas hasheadas (no en texto plano)
- [ ] Validación de fortaleza de contraseña
- [ ] Límite de intentos de reconexión

### ✅ Performance
- [ ] Login offline < 500ms
- [ ] Sincronización de 50 registros < 30s
- [ ] Mantenimiento automático < 5s
- [ ] UI responsive durante operaciones

### ✅ UX
- [ ] Indicadores visuales claros
- [ ] Mensajes de error comprensibles
- [ ] Funciones online deshabilitadas offline
- [ ] Toasts informativos en transiciones

### ✅ Mantenimiento
- [ ] Limpieza automática de bóveda funciona
- [ ] Estadísticas de bóveda disponibles
- [ ] Logs informativos en consola
- [ ] Servicio de mantenimiento se auto-inicia

---

## 🎯 Criterios de Aceptación

El sistema se considera **APROBADO** si:

1. ✅ Todos los tests funcionales pasan
2. ✅ Todos los tests de seguridad pasan
3. ✅ Performance cumple con los tiempos esperados
4. ✅ UX es clara e intuitiva
5. ✅ No hay errores en consola durante uso normal
6. ✅ Datos se sincronizan correctamente sin pérdida

---

## 📝 Notas de Testing

**Ambiente de Prueba:**
- Navegador: Chrome/Edge (última versión)
- DevTools abierto para monitoreo
- IndexedDB habilitado
- Conexión estable para tests online

**Datos de Prueba:**
- Usuario A: `test1@cifrix.com` / `Password123!`
- Usuario B: `test2@cifrix.com` / `Password456!`
- Organización de prueba configurada en Supabase

**Herramientas:**
- DevTools → Network (para simular offline)
- DevTools → Application → IndexedDB (para inspeccionar datos)
- DevTools → Console (para logs y validaciones)
- Supabase Dashboard (para verificar sincronización)

---

## 🐛 Reporte de Bugs

Si encuentras un bug durante el testing, documentarlo con:

1. **Título:** Descripción breve del problema
2. **Pasos para reproducir:** Lista numerada
3. **Resultado esperado:** Qué debería pasar
4. **Resultado actual:** Qué pasó realmente
5. **Screenshots/Logs:** Evidencia visual
6. **Severidad:** Crítico / Alto / Medio / Bajo

---

**Última actualización:** 2026-02-15  
**Responsable:** Equipo de Desarrollo Cifrix
