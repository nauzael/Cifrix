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

        // Limpiar campos vacíos para evitar errores de tipo en PostgreSQL
        Object.keys(dataToSync).forEach(key => {
          if (dataToSync[key] === "") {
            dataToSync[key] = null;
          }
        });

        let error: any = null;

        // CASO ESPECIAL: Organizaciones
        if (tableName === 'organizations') {
          // Verificar si ya existe en Supabase
          const { data: existing } = await supabase
            .from('organizations')
            .select('id')
            .eq('id', item.id)
            .single();

          if (!existing) {
            // Si es nueva, usar RPC para asegurar que el creador quede como founder
            dbLog(`Creating new organization via RPC: ${item.name}`);
            const { error: rpcError } = await supabase.rpc('create_organization_with_founder', {
              p_name: item.name,
              p_type: item.type,
              p_tax_id: item.tax_id,
              p_id: item.id // Pasamos el ID local para mantener consistencia
            });
            error = rpcError;
          } else {
            // Si ya existe, un simple upsert/update
            const { error: upsertError } = await supabase
              .from('organizations')
              .upsert(dataToSync);
            error = upsertError;
          }
        }
        // CASO ESPECIAL: Audit Logs (asegurar que tengan organization_id)
        else if (tableName === 'audit_logs') {
          if (!dataToSync.organization_id) {
            console.warn('Skipping audit log sync: missing organization_id');
            await db.audit_logs.update(item.id, { sync_status: 'error' });
            continue;
          }
          const { error: insertError } = await supabase.from('audit_logs').insert(dataToSync);
          error = insertError;
        }
        // CASO NORMAL: Resto de tablas
        else {
          const { error: upsertError } = await supabase
            .from(tableName)
            .upsert(dataToSync);
          error = upsertError;
        }

        if (!error) {
          await (db as any)[tableName].update(item.id, { sync_status: 'sincronizado' });
        } else {
          console.error(`Sync error for ${tableName} (${item.id}):`, error);
          if (error.code === '42501') {
            console.warn(`RLS Permission denied for table ${tableName}. Stopping sync for this table.`);
            break;
          }
          // Marcar como error para no reintentar infinitamente el mismo registro bloqueante
          await (db as any)[tableName].update(item.id, { sync_status: 'error' });
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
