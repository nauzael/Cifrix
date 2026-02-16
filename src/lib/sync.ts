import { db } from './db';
import { supabase } from './supabase';
import { APP_CONFIG, dbLog } from './config';
import { toast } from '../store/toastStore';

export const TABLES_TO_SYNC = [
  'organizations',
  'accounts',
  'categories',
  'projects',
  'members',
  'customers',
  'transactions',
  'journal_entries',
  'contributions',
  'invoices',
  'invoice_items',
  'payments',
  'audit_logs',
  // Nuevas tablas - Módulo de Renta
  'declaraciones_renta',
  'ingresos_renta',
  'deducciones_renta',
  'activos_pasivos_renta',
  // Nuevas tablas - Módulo de Exógenos
  'exogenos',
  'mapeo_inconsistencias'
];

/**
 * Sincronización en modo HÍBRIDO/OFFLINE: Descarga datos de Supabase a caché local
 */
async function syncFromSupabaseToCache(organizationId?: string) {
  if (!APP_CONFIG.USE_LOCAL_CACHE && APP_CONFIG.DB_MODE !== 'offline') return;

  dbLog('Syncing FROM Supabase TO local cache (PARALLEL)...');

  // Procesar todas las tablas en paralelo para máxima velocidad
  const syncPromises = TABLES_TO_SYNC.map(async (tableName) => {
    try {
      let query = (supabase as any).from(tableName as any).select('*');

      if (organizationId
        && tableName !== 'organizations'
        && tableName !== 'audit_logs'
        && tableName !== 'journal_entries'
        && tableName !== 'invoice_items'
        && tableName !== 'ingresos_renta'
        && tableName !== 'deducciones_renta'
        && tableName !== 'activos_pasivos_renta'
        && tableName !== 'mapeo_inconsistencias'
      ) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data && data.length > 0) {
        // Optimización masiva: obtener IDs locales conflictivos de una vez
        const deletedLocalRecords = await db.deleted_records
          .where('table_name')
          .equals(tableName)
          .toArray();
        const deletedIds = new Set(deletedLocalRecords.map(d => d.id));

        const pendingLocalItems = await (db as any)[tableName]
          .where('sync_status')
          .equals('pendiente')
          .toArray();
        const pendingIds = new Set(pendingLocalItems.map((item: any) => item.id));

        // Filtrar y preparar para bulkPut
        const itemsToCache = data
          .filter((remoteItem: any) => !deletedIds.has(remoteItem.id) && !pendingIds.has(remoteItem.id))
          .map((item: any) => ({ ...item, sync_status: 'sincronizado' }));

        if (itemsToCache.length > 0) {
          await db.transaction('rw', (db as any)[tableName], db.deleted_records, async () => {
            // Re-verificar eliminaciones en la transacción para evitar condiciones de carrera
            // (Si el usuario borró algo mientras descargábamos de Supabase)
            const currentDeleted = await db.deleted_records.where('table_name').equals(tableName).toArray();
            const currentDeletedIds = new Set(currentDeleted.map(d => d.id));

            const finalItems = itemsToCache.filter(item => !currentDeletedIds.has(item.id));

            if (finalItems.length > 0) {
              await (db as any)[tableName].bulkPut(finalItems);
            }
          });
        }
      }
    } catch (error) {
      console.error(`Error syncing table ${tableName}:`, error);
    }
  });

  await Promise.all(syncPromises);
  dbLog('Pull sync completed');
}

/**
 * Sincronización en modo OFFLINE: Sube datos pendientes a Supabase
 */
async function syncFromCacheToSupabase() {
  dbLog('Syncing FROM local cache TO Supabase (BATCHED)...');

  // 1. ELIMINACIONES MASIVAS
  try {
    const pendingDeletions = await db.deleted_records
      .where('sync_status')
      .equals('pendiente')
      .toArray();

    if (pendingDeletions.length > 0) {
      const deletionsByTable: Record<string, string[]> = {};
      pendingDeletions.forEach(d => {
        if (!deletionsByTable[d.table_name]) deletionsByTable[d.table_name] = [];
        deletionsByTable[d.table_name].push(d.id);
      });

      // Enforce strict deletion order (reverse of dependency order) to avoid FK constraint errors
      // e.g. Delete journal_entries BEFORE transactions
      const tablesInReverseHeader = [...TABLES_TO_SYNC].reverse();

      for (const table of tablesInReverseHeader) {
        if (deletionsByTable[table] && deletionsByTable[table].length > 0) {
          const ids = deletionsByTable[table];

          const { error } = await (supabase as any)
            .from(table)
            .delete()
            .in('id', ids);

          if (!error) {
            await db.deleted_records.where('id').anyOf(ids).modify({ sync_status: 'sincronizado' });
          } else {
            console.error(`Error deleting from ${table}:`, error);
            // Si hay error (ej: FK), no marcamos como error inmediatamente para permitir reintentos,
            // pero si es persistente, debería ser revisado.
            // Para "transactions", si falla por FK, es crítico.
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in batched deletions:', error);
  }

  // 2. SUBIDAS MASIVAS (BATCH UPSERT)
  for (const tableName of TABLES_TO_SYNC) {
    try {
      const pendingItems = await (db as any)[tableName]
        .where('sync_status')
        .equals('pendiente')
        .toArray();

      if (pendingItems.length === 0) continue;

      // Organizaciones y Cuentas siguen lógica individual por dependencias críticas
      if (tableName === 'organizations' || tableName === 'accounts') {
        const sortedItems = tableName === 'accounts' ? pendingItems.sort((a, b) => a.level - b.level) : pendingItems;
        for (const item of sortedItems) {
          const { sync_status, ...dataToSync } = item;
          Object.keys(dataToSync).forEach(k => { if (dataToSync[k] === "") dataToSync[k] = null; });

          let error = null;
          if (tableName === 'organizations') {
            const { data: existing } = await supabase.from('organizations').select('id').eq('id', item.id).single();
            if (!existing) {
              const { error: rpcError } = await supabase.rpc('create_organization_with_founder', {
                p_name: item.name, p_type: item.type, p_tax_id: item.tax_id, p_id: item.id
              });
              error = rpcError;
            } else {
              const { error: uError } = await (supabase as any).from('organizations').upsert(dataToSync);
              error = uError;
            }
          } else {
            const { error: uError } = await (supabase as any).from(tableName).upsert(dataToSync);
            error = uError;
          }
          if (!error) {
            await (db as any)[tableName].update(item.id, { sync_status: 'sincronizado' });
          } else {
            console.error(`Error syncing ${tableName} ${item.id}:`, error);
            await (db as any)[tableName].update(item.id, { sync_status: 'error' });
          }
        }
      } else {
        // BATCH UPSERT para el resto de tablas (Transacciones, Asientos, Miembros, etc.)
        const chunks = [];
        for (let i = 0; i < pendingItems.length; i += 50) {
          chunks.push(pendingItems.slice(i, i + 50));
        }

        for (const chunk of chunks) {
          const cleanedData = chunk.map(item => {
            const { sync_status, ...data } = item;
            Object.keys(data).forEach(k => { if (data[k] === "") data[k] = null; });
            return data;
          });

          const { error } = await (supabase as any).from(tableName).upsert(cleanedData);

          if (!error) {
            const ids = chunk.map(i => i.id);
            await (db as any)[tableName].where('id').anyOf(ids).modify({ sync_status: 'sincronizado' });
            console.log(`[Sync Success] ${tableName}: Synced ${ids.length} records.`);
          } else {
            console.error(`[Sync Error] ${tableName} batch failed:`, error);
            toast.error(`Error de sincronización en ${tableName}: ${(error as any).message || 'Error desconocido'}`);

            // Fallback individual solo si el batch falla
            for (const item of chunk) {
              const { sync_status, ...dt } = item;
              const { error: indError } = await (supabase as any).from(tableName).upsert(dt);
              if (!indError) {
                await (db as any)[tableName].update(item.id, { sync_status: 'sincronizado' });
              } else {
                console.error(`[Sync Single Error] ${tableName} ${item.id}:`, indError);
                await (db as any)[tableName].update(item.id, { sync_status: 'error' });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error syncing table ${tableName}:`, error);
      toast.error(`Error crítico sincronizando ${tableName}`);
    }
  }
}

/**
 * Función principal de sincronización
 * Detecta el modo y ejecuta la sincronización apropiada
 */
export async function syncToSupabase(organizationId?: string) {
  // ⚠️ MODO PRODUCCIÓN: No sincronizar porque todo va directo a Supabase
  if (APP_CONFIG.DB_MODE === 'production') {
    dbLog('Sync skipped - Running in PRODUCTION mode (direct to Supabase)');
    return;
  }

  if (!navigator.onLine) {
    dbLog('Sync skipped - No internet connection');
    return;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
    dbLog('Sync skipped - Supabase not configured');
    return;
  }

  // 1. PRIMERO SIEMPRE SUBIR CAMBIOS LOCALES (Evita que el PULL los sobrescriba si no son 'pendiente')
  await syncFromCacheToSupabase();

  // 2. DESCARGAR CAMBIOS REMOTOS (Bidireccional)
  // Tanto en modo 'hybrid' como 'offline' queremos que la caché local esté al día
  await syncFromSupabaseToCache(organizationId);
}

// Solo habilitar sincronización automática si NO estamos en modo producción
if (APP_CONFIG.DB_MODE === 'offline' && APP_CONFIG.AUTO_SYNC_ENABLED) {
  setInterval(syncToSupabase, APP_CONFIG.SYNC_INTERVAL_MS);
  window.addEventListener('online', () => syncToSupabase());
  dbLog('Background sync enabled (offline mode)');
} else if (APP_CONFIG.DB_MODE === 'hybrid') {
  // En modo híbrido, sincronizar cada 2 minutos para mantener caché actualizada
  setInterval(() => syncToSupabase(), 2 * 60 * 1000);
  window.addEventListener('online', () => syncToSupabase());
  dbLog('Background cache refresh enabled (hybrid mode - every 2 min)');
} else {
  dbLog('Background sync DISABLED - Running in production mode');
}
