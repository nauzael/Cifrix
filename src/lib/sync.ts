import { db } from './db';
import { supabase } from './supabase';
import { APP_CONFIG, dbLog } from './config';

const TABLES_TO_SYNC = [
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
  'audit_logs'
] as const;

/**
 * Sincronización en modo HÍBRIDO: Descarga datos de Supabase a caché local
 */
async function syncFromSupabaseToCache(organizationId?: string) {
  if (!APP_CONFIG.USE_LOCAL_CACHE) return;

  dbLog('Syncing FROM Supabase TO local cache (hybrid mode)...');

  for (const tableName of TABLES_TO_SYNC) {
    try {
      let query = (supabase as any).from(tableName).select('*');

      // Filtrar por organización si se proporciona
      if (organizationId && tableName !== 'organizations') {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query;

      if (error) {
        console.error(`Error fetching ${tableName} from Supabase:`, error);
        continue;
      }

      if (data && data.length > 0) {
        await (db as any)[tableName].bulkPut(
          data.map((item: any) => ({
            ...item,
            sync_status: 'sincronizado'
          }))
        );
        dbLog(`Cached ${data.length} records for ${tableName}`);
      }
    } catch (error) {
      console.error(`Error caching ${tableName}:`, error);
    }
  }

  dbLog('Cache sync completed');
}

/**
 * Sincronización en modo OFFLINE: Sube datos pendientes a Supabase
 */
async function syncFromCacheToSupabase() {
  dbLog('Syncing FROM local cache TO Supabase (offline mode)...');

  // Process deletions first
  try {
    const pendingDeletions = await db.deleted_records
      .where('sync_status')
      .equals('pendiente')
      .toArray();

    for (const record of pendingDeletions) {
      const { error } = await (supabase as any)
        .from(record.table_name)
        .delete()
        .eq('id', record.id);

      if (!error) {
        await db.deleted_records.update(record.id, { sync_status: 'sincronizado' });
      }
    }
  } catch (error) {
    console.error('Error syncing deletions:', error);
  }

  for (const tableName of TABLES_TO_SYNC) {
    try {
      let query = (db as any)[tableName]
        .where('sync_status')
        .equals('pendiente');

      const pendingItems = tableName === 'accounts'
        ? await query.sortBy('level')
        : await query.toArray();

      if (pendingItems.length === 0) continue;

      dbLog(`Syncing ${pendingItems.length} items for ${tableName}...`);

      for (const item of pendingItems) {
        const { sync_status, ...dataToSync } = item;

        Object.keys(dataToSync).forEach(key => {
          if (dataToSync[key] === "") {
            dataToSync[key] = null;
          }
        });

        const { error } = await (supabase as any)
          .from(tableName)
          .upsert(dataToSync);

        if (!error) {
          await (db as any)[tableName].update(item.id, { sync_status: 'sincronizado' });
        } else {
          if (error.code === '42501') {
            console.warn(`RLS Permission denied for table ${tableName}. Stopping sync for this table.`);
            break;
          }
        }
      }
    } catch (error) {
      console.error(`Error in sync process for ${tableName}:`, error);
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

  // MODO HÍBRIDO: Sincronizar DESDE Supabase HACIA caché local
  if (APP_CONFIG.DB_MODE === 'hybrid') {
    await syncFromSupabaseToCache(organizationId);
    return;
  }

  // MODO OFFLINE: Sincronizar DESDE caché local HACIA Supabase
  if (APP_CONFIG.DB_MODE === 'offline') {
    await syncFromCacheToSupabase();
    return;
  }
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
