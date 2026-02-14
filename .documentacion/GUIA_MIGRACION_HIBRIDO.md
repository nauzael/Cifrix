# Guía de Migración a Modo Híbrido

## ✅ Estado Actual

El sistema ahora está configurado en **Modo Híbrido**:

- ✅ Configuración activada en `src/lib/config.ts`
- ✅ Capa de abstracción creada en `src/lib/dbOperations.ts`
- ✅ Sincronización bidireccional implementada en `src/lib/sync.ts`
- ✅ Logs de depuración habilitados

## 🔄 Cómo Funciona el Modo Híbrido

### Escrituras (INSERT/UPDATE/DELETE)
```typescript
// ❌ ANTES (modo offline)
await db.organizations.add({
  id: uuid(),
  name: 'Mi Organización',
  sync_status: 'pendiente' // Se sincroniza después
});

// ✅ AHORA (modo híbrido)
import { insertRecord } from '@/lib/dbOperations';

const { data, error } = await insertRecord('organizations', {
  id: uuid(),
  name: 'Mi Organización',
  // NO necesita sync_status, va directo a Supabase
});
```

### Lecturas (SELECT)
```typescript
// ❌ ANTES (directo a Supabase, lento)
const { data } = await supabase
  .from('members')
  .select('*')
  .eq('organization_id', orgId);

// ✅ AHORA (desde caché local, rápido)
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';

const members = useLiveQuery(
  () => db.members
    .where('organization_id')
    .equals(orgId)
    .toArray()
);
```

## 📝 Patrones de Migración

### 1. Crear Registros

```typescript
import { insertRecord } from '@/lib/dbOperations';
import { v4 as uuid } from 'uuid';

// Ejemplo: Crear un miembro
const handleCreateMember = async (memberData) => {
  const { data, error } = await insertRecord('members', {
    id: uuid(),
    organization_id: currentOrgId,
    full_name: memberData.name,
    email: memberData.email,
    status: 'activo',
    created_at: new Date().toISOString(),
  });

  if (error) {
    alert('Error al crear miembro: ' + error.message);
    return;
  }

  console.log('Miembro creado:', data);
  // La caché local se actualiza automáticamente
};
```

### 2. Actualizar Registros

```typescript
import { updateRecord } from '@/lib/dbOperations';

// Ejemplo: Actualizar un miembro
const handleUpdateMember = async (memberId, updates) => {
  const { data, error } = await updateRecord('members', memberId, {
    full_name: updates.name,
    email: updates.email,
  });

  if (error) {
    alert('Error al actualizar: ' + error.message);
    return;
  }

  console.log('Miembro actualizado:', data);
};
```

### 3. Eliminar Registros

```typescript
import { deleteRecord } from '@/lib/dbOperations';

// Ejemplo: Eliminar un miembro
const handleDeleteMember = async (memberId) => {
  if (!confirm('¿Estás seguro?')) return;

  const { error } = await deleteRecord('members', memberId);

  if (error) {
    alert('Error al eliminar: ' + error.message);
    return;
  }

  console.log('Miembro eliminado');
};
```

### 4. Upsert (Insertar o Actualizar)

```typescript
import { upsertRecord } from '@/lib/dbOperations';

// Ejemplo: Guardar configuración (crear si no existe, actualizar si existe)
const handleSaveSettings = async (orgId, settings) => {
  const { data, error } = await upsertRecord('organizations', {
    id: orgId,
    settings: settings,
  });

  if (error) {
    alert('Error al guardar: ' + error.message);
    return;
  }

  console.log('Configuración guardada:', data);
};
```

## 🎯 Componentes que YA están listos

Estos componentes ya usan operaciones directas a Supabase y funcionan perfectamente en modo híbrido:

1. ✅ `CreateOrganizationModal.tsx` - Usa RPC directo
2. ✅ `EditOrganizationModal.tsx` - Usa `supabase.from().update()`
3. ✅ `SuperAdminDashboard.tsx` - Usa `supabase.from().delete()`

## 🔧 Componentes que necesitan migración

Para migrar un componente, sigue estos pasos:

### Paso 1: Identificar operaciones de escritura

Busca en el código:
- `db.members.add()`
- `db.transactions.put()`
- `db.invoices.update()`
- `db.customers.delete()`

### Paso 2: Reemplazar con la nueva API

```typescript
// ❌ ANTES
await db.members.add({
  id: uuid(),
  name: 'Juan',
  sync_status: 'pendiente'
});

// ✅ DESPUÉS
import { insertRecord } from '@/lib/dbOperations';

await insertRecord('members', {
  id: uuid(),
  name: 'Juan',
  // sync_status se maneja automáticamente
});
```

### Paso 3: Mantener las lecturas con useLiveQuery

Las lecturas NO necesitan cambios. `useLiveQuery` seguirá funcionando y ahora será más rápido porque lee desde caché local:

```typescript
// ✅ ESTO SIGUE IGUAL (y ahora es más rápido)
const members = useLiveQuery(
  () => db.members.toArray()
);
```

## 🔄 Sincronización Automática

El sistema ahora sincroniza automáticamente cada 2 minutos:

```
[DB:hybrid] Background cache refresh enabled (hybrid mode - every 2 min)
```

Esto significa que:
1. Tus escrituras van **inmediatamente** a Supabase
2. La caché local se **refresca automáticamente** cada 2 minutos
3. Si otro usuario hace cambios, los verás en máximo 2 minutos

### Forzar sincronización manual

```typescript
import { syncToSupabase } from '@/lib/sync';

// Sincronizar toda la organización
await syncToSupabase(currentOrgId);

// O sincronizar todo
await syncToSupabase();
```

## 🐛 Depuración

### Ver logs en consola

Abre las herramientas de desarrollador (F12) y verás:

```
[DB:hybrid] INSERT members { id: '123...' }
[DB:hybrid] Cache updated for members { id: '123...' }
[DB:hybrid] Syncing FROM Supabase TO local cache (hybrid mode)...
[DB:hybrid] Cached 45 records for members
[DB:hybrid] Cache sync completed
```

### Verificar estado de la caché

```typescript
import { db } from '@/lib/db';

// Ver cuántos registros hay en caché
const count = await db.members.count();
console.log('Miembros en caché:', count);

// Ver todos los registros
const all = await db.members.toArray();
console.log('Datos:', all);
```

### Limpiar caché manualmente

```typescript
import { db } from '@/lib/db';

// Limpiar una tabla
await db.members.clear();

// Limpiar toda la base de datos
await db.clearAllData();
```

## ⚠️ Consideraciones Importantes

### 1. Conflictos de Datos

En modo híbrido, si dos usuarios editan el mismo registro simultáneamente:
- ✅ El último en guardar gana (last-write-wins)
- ✅ Ambos cambios se guardan en Supabase inmediatamente
- ⚠️ La caché local puede tardar hasta 2 minutos en reflejar cambios de otros usuarios

### 2. Manejo de Errores

Siempre verifica errores:

```typescript
const { data, error } = await insertRecord('members', newMember);

if (error) {
  // Manejar error (mostrar al usuario, reintentar, etc.)
  console.error('Error:', error);
  alert('No se pudo guardar: ' + error.message);
  return;
}

// Continuar con éxito
console.log('Guardado:', data);
```

### 3. Validación de Datos

La validación ahora es **crítica** porque los datos van directo a producción:

```typescript
// ✅ BUENA PRÁCTICA
const handleSubmit = async (formData) => {
  // 1. Validar ANTES de enviar
  if (!formData.name || formData.name.trim() === '') {
    alert('El nombre es obligatorio');
    return;
  }

  if (!formData.email.includes('@')) {
    alert('Email inválido');
    return;
  }

  // 2. Enviar a Supabase
  const { error } = await insertRecord('members', formData);

  if (error) {
    alert('Error: ' + error.message);
    return;
  }

  alert('Guardado exitosamente');
};
```

## 📊 Ventajas del Modo Híbrido

| Aspecto | Modo Offline | Modo Híbrido | Modo Producción |
|---------|--------------|--------------|-----------------|
| Velocidad Lectura | ⚡⚡⚡ | ⚡⚡⚡ | ⚡ |
| Velocidad Escritura | ⚡⚡⚡ | ⚡⚡ | ⚡⚡ |
| Datos en Tiempo Real | ❌ | ✅ (2 min) | ✅ (inmediato) |
| Funciona Offline | ✅ | ⚠️ (solo lectura) | ❌ |
| Conflictos | 🔴 Muchos | 🟡 Pocos | 🟢 Ninguno |
| Complejidad | 🔴 Alta | 🟡 Media | 🟢 Baja |

## 🚀 Próximos Pasos

1. **Probar el sistema actual**: Crea, edita y elimina organizaciones desde el SuperAdmin
2. **Verificar logs**: Abre la consola y confirma que ves `[DB:hybrid]`
3. **Migrar componentes críticos**: Empieza por los más usados (Members, Transactions)
4. **Monitorear rendimiento**: Verifica que las lecturas sean rápidas

## 📞 Soporte

Si encuentras algún problema:
1. Revisa los logs en consola (`F12`)
2. Verifica que `APP_CONFIG.DB_MODE === 'hybrid'`
3. Confirma que la sincronización esté activa
4. Limpia la caché si es necesario: `await db.clearAllData()`
