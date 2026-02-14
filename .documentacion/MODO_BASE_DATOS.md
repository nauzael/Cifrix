# Configuración de Modo de Base de Datos - Cifrix

## 📋 Resumen

Cifrix ahora soporta **tres modos de operación** para la base de datos, configurables desde `src/lib/config.ts`:

1. **Modo Producción** (`production`) - **ACTIVO ACTUALMENTE** ✅
2. Modo Híbrido (`hybrid`)
3. Modo Offline (`offline`)

---

## 🚀 Modo Producción (ACTUAL)

### Características:
- ✅ **Todas las operaciones van directo a Supabase**
- ✅ Sin sincronización en segundo plano (innecesaria)
- ✅ Datos siempre actualizados en tiempo real
- ✅ Múltiples usuarios pueden trabajar simultáneamente
- ⚠️ **Requiere conexión a internet permanente**

### Configuración Actual:
```typescript
export const APP_CONFIG = {
  DB_MODE: 'production',           // ← MODO ACTIVO
  USE_LOCAL_CACHE: false,          // Sin caché local
  AUTO_SYNC_ENABLED: false,        // Sin sincronización
  DEBUG_DB_OPERATIONS: true,       // Logs habilitados
}
```

### ¿Cuándo usar este modo?
- ✅ Cuando trabajas en un entorno con internet estable
- ✅ Cuando necesitas que todos los cambios sean inmediatos
- ✅ En producción con múltiples usuarios concurrentes
- ✅ **Recomendado para tu caso actual**

---

## 🔄 Modo Híbrido

### Características:
- Escrituras directas a Supabase
- Lecturas desde caché local (más rápido)
- Sincronización inteligente
- Funciona parcialmente sin internet (solo lectura)

### Configuración:
```typescript
export const APP_CONFIG = {
  DB_MODE: 'hybrid',
  USE_LOCAL_CACHE: true,
  AUTO_SYNC_ENABLED: true,
  DEBUG_DB_OPERATIONS: false,
}
```

### ¿Cuándo usar este modo?
- Cuando quieres mejor rendimiento en lecturas
- Cuando la conexión es intermitente
- Cuando necesitas consultar datos sin internet

---

## 📴 Modo Offline (Legacy)

### Características:
- Todo se guarda primero localmente
- Sincronización posterior a Supabase
- Funciona completamente sin internet
- Mayor complejidad en conflictos

### Configuración:
```typescript
export const APP_CONFIG = {
  DB_MODE: 'offline',
  USE_LOCAL_CACHE: true,
  AUTO_SYNC_ENABLED: true,
  DEBUG_DB_OPERATIONS: false,
}
```

### ¿Cuándo usar este modo?
- Cuando trabajas frecuentemente sin internet
- Cuando necesitas máxima disponibilidad local
- **No recomendado para producción multi-usuario**

---

## 🔧 Cómo Cambiar de Modo

### Opción 1: Editar Configuración (Recomendado)
1. Abre `src/lib/config.ts`
2. Cambia el valor de `DB_MODE`:
   ```typescript
   DB_MODE: 'production' // o 'hybrid' o 'offline'
   ```
3. Guarda el archivo
4. Reinicia el servidor de desarrollo (`npm run dev`)

### Opción 2: Variable de Entorno
Puedes agregar en `.env`:
```env
VITE_DB_MODE=production
```

Y modificar `config.ts` para leerlo:
```typescript
DB_MODE: (import.meta.env.VITE_DB_MODE || 'production') as 'production' | 'hybrid' | 'offline'
```

---

## 📊 Comparación de Modos

| Característica | Producción | Híbrido | Offline |
|----------------|------------|---------|---------|
| Requiere Internet | ✅ Siempre | ⚠️ Para escribir | ❌ No |
| Velocidad Lectura | ⚡ Rápida | ⚡⚡ Muy Rápida | ⚡⚡⚡ Instantánea |
| Velocidad Escritura | ⚡⚡ Muy Rápida | ⚡⚡ Muy Rápida | ⚡⚡⚡ Instantánea |
| Datos en Tiempo Real | ✅ Sí | ✅ Sí | ❌ No |
| Multi-usuario | ✅ Excelente | ✅ Bueno | ⚠️ Conflictos |
| Complejidad | 🟢 Baja | 🟡 Media | 🔴 Alta |

---

## 🐛 Depuración

### Ver Logs de Base de Datos
Los logs están habilitados por defecto. En la consola del navegador verás:
```
[DB:production] Sync skipped - Running in PRODUCTION mode
[DB:production] Background sync DISABLED - Running in production mode
```

### Desactivar Logs
En `config.ts`:
```typescript
DEBUG_DB_OPERATIONS: false
```

---

## ⚠️ Importante

### Cambios Actuales Aplicados:
1. ✅ Modo producción activado en `src/lib/config.ts`
2. ✅ Sincronización automática deshabilitada en `src/lib/sync.ts`
3. ✅ Sincronización inicial deshabilitada en `src/main.tsx`
4. ✅ Logs de depuración habilitados

### Próximos Pasos:
Para que **TODAS** las operaciones vayan directo a Supabase, necesitarás:
1. Modificar los componentes que usan `db.organizations.add()` para usar `supabase.from('organizations').insert()`
2. Reemplazar `useLiveQuery(db.members.toArray())` por hooks de React Query con Supabase
3. Actualizar los formularios para hacer `upsert` directo a Supabase

**¿Quieres que continúe con estos cambios?** Esto requiere modificar múltiples componentes.

---

## 📝 Notas Técnicas

- El modo producción **no elimina** Dexie del proyecto, solo lo desactiva
- Puedes volver al modo offline en cualquier momento
- Los datos locales existentes no se borran automáticamente
- Para limpiar la caché local: Herramientas de Desarrollador → Application → IndexedDB → Eliminar "CifrixDatabase"
