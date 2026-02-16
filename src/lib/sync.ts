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

      if (data) {
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
            const currentDeleted = await db.deleted_records.where('table_name').equals(tableName).toArray();
            const currentDeletedIds = new Set(currentDeleted.map(d => d.id));

            const finalItems = itemsToCache.filter(item => !currentDeletedIds.has(item.id));

            if (finalItems.length > 0) {
              await (db as any)[tableName].bulkPut(finalItems);
            }
          });
        }

        // GARBAGE COLLECTION
        if (organizationId && data !== null) {
          const isFullSetFetch = tableName !== 'organizations' &&
            tableName !== 'audit_logs' &&
            tableName !== 'journal_entries' &&
            tableName !== 'invoice_items';

          if (isFullSetFetch) {
            const remoteIds = new Set(data.map((d: any) => d.id));
            const localRecords = await (db as any)[tableName]
              .where('organization_id')
              .equals(organizationId)
              .toArray();

            const orphansToDelete = localRecords
              .filter((l: any) => l.sync_status === 'sincronizado' && !remoteIds.has(l.id))
              .map((l: any) => l.id);

            if (orphansToDelete.length > 0) {
              console.log(`[GC] Deleting ${orphansToDelete.length} stale records from ${tableName}`);
              await (db as any)[tableName].bulkDelete(orphansToDelete);

              if (tableName === 'transactions') {
                const entries = await db.journal_entries.where('transaction_id').anyOf(orphansToDelete).toArray();
                const entryIds = entries.map(e => e.id);
                if (entryIds.length > 0) {
                  await db.journal_entries.bulkDelete(entryIds);
                }
              }
            }

            // DEEP CLEAN (GHOST ENTRIES)
            if (tableName === 'transactions') {
              const allEntries = await db.journal_entries.toArray();
              if (allEntries.length > 0) {
                const allTxIds = new Set(await db.transactions.toCollection().primaryKeys());
                const ghostEntryIds = allEntries
                  .filter(e => !allTxIds.has(e.transaction_id) && e.sync_status === 'sincronizado')
                  .map(e => e.id);

                if (ghostEntryIds.length > 0) {
                  console.log(`[GC] Found ${ghostEntryIds.length} ghost journal entries. Deleting...`);
                  await db.journal_entries.bulkDelete(ghostEntryIds);
                }
              }
            }
          }
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

      const tablesInReverse = [...TABLES_TO_SYNC].reverse();
      for (const table of tablesInReverse) {
        if (deletionsByTable[table]?.length > 0) {
          const ids = deletionsByTable[table];
          const { error } = await (supabase as any).from(table).delete().in('id', ids);
          if (!error) {
            await db.deleted_records.where('id').anyOf(ids).modify({ sync_status: 'sincronizado' });
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in batch deletions:', error);
  }

  // 2. SUBIDAS MASIVAS
  for (const tableName of TABLES_TO_SYNC) {
    try {
      const pendingItems = await (db as any)[tableName]
        .where('sync_status')
        .equals('pendiente')
        .toArray();

      if (pendingItems.length === 0) continue;

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
              error = (await (supabase as any).from('organizations').upsert(dataToSync)).error;
            }
          } else {
            error = (await (supabase as any).from(tableName).upsert(dataToSync)).error;
          }

          if (!error) {
            await (db as any)[tableName].update(item.id, { sync_status: 'sincronizado' });
          } else {
            console.error(`Sync error ${tableName}:`, error);
            await (db as any)[tableName].update(item.id, { sync_status: 'error' });
          }
        }
      } else {
        const chunks = [];
        for (let i = 0; i < pendingItems.length; i += 50) chunks.push(pendingItems.slice(i, i + 50));

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
          } else {
            for (const item of chunk) {
              const { sync_status, ...dt } = item;
              const { error: indError } = await (supabase as any).from(tableName).upsert(dt);
              if (!indError) {
                await (db as any)[tableName].update(item.id, { sync_status: 'sincronizado' });
              }
            }
          }
        }
      }
    } catch (e) {
      console.error(`Batch error ${tableName}:`, e);
    }
  }
}

/**
 * Función principal de sincronización
 */
export async function syncToSupabase(organizationId?: string) {
  if (APP_CONFIG.DB_MODE === 'production' || !navigator.onLine) return;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl || supabaseUrl.includes('placeholder')) return;

  await syncFromCacheToSupabase();
  await syncFromSupabaseToCache(organizationId);
}

// --------------------------------------------------------
// Lógica de Sincronización Inteligente (Lazy Sync)
// --------------------------------------------------------

const runAutomatedSync = (orgId?: string) => {
  // Solo sincronizar automáticamente si la pestaña está visible
  if (document.visibilityState === 'visible') {
    dbLog('Smart Sync: Tab visible, running automated sync...');
    syncToSupabase(orgId);
  } else {
    dbLog('Smart Sync: Tab hidden, skipping interval sync to save resources.');
  }
};

// Obtener ID de organización actual del authStore de forma segura
const getStoredOrgId = () => {
  try {
    // Intentamos obtenerlo del store si está disponible en este contexto
    // Si no, la sincronización usará el filtro global
    return undefined;
  } catch { return undefined; }
};

if (APP_CONFIG.DB_MODE !== 'production') {
  const interval = APP_CONFIG.SYNC_INTERVAL_MS;

  // 1. Intervalo regular (solo si está visible)
  setInterval(() => runAutomatedSync(getStoredOrgId()), interval);

  // 2. Trigger inmediato al volver a la pestaña (Visibility Trigger)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      dbLog('Smart Sync: User returned to tab, triggering immediate refresh.');
      syncToSupabase(getStoredOrgId());
    }
  });

  // 3. Sincronizar al volver a estar online
  window.addEventListener('online', () => {
    dbLog('Smart Sync: Connection restored, triggering sync.');
    syncToSupabase(getStoredOrgId());
  });

  dbLog(`Smart Sync: Enabled (mode: ${APP_CONFIG.DB_MODE}, interval: ${interval / 1000}s)`);
}
