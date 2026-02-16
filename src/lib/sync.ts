import { db } from './db';
import { supabase } from './supabase';
import { APP_CONFIG, dbLog } from './config';
import { toast } from '../store/toastStore';

let syncInProgress = false;

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
  'declaraciones_renta',
  'ingresos_renta',
  'deducciones_renta',
  'activos_pasivos_renta',
  'exogenos',
  'mapeo_inconsistencias',
  'fiscal_years',
  'financial_notes'
];

// Tablas que NO tienen índice organization_id en Dexie (evita SchemaError)
const TABLES_WITHOUT_ORG_INDEX = [
  'organizations',
  'journal_entries',
  'invoice_items',
  'ingresos_renta',
  'deducciones_renta',
  'activos_pasivos_renta',
  'mapeo_inconsistencias'
];

/**
 * Mapea datos entre el esquema local (Dexie) y el remoto (Supabase)
 * Resuelve discrepancias de nombres de columnas y valores de enums (idioma)
 */
function mapTableSchema(tableName: string, data: any, toRemote: boolean) {
  if (!data) return data;
  const mapped = { ...data };

  // Siempre eliminar campos de control local antes de enviar a Supabase
  if (toRemote) {
    delete mapped.sync_status;
  }

  // 1. MIEMBROS
  if (tableName === 'members') {
    const statusMap: Record<string, string> = { 'activo': 'active', 'inactivo': 'inactive', 'visitante': 'active' };
    const revMap: Record<string, string> = { 'active': 'activo', 'inactive': 'inactivo', 'transferred': 'inactivo' };

    if (toRemote) {
      if ('status' in mapped) mapped.membership_status = statusMap[mapped.status] || 'active';
      if ('entry_date' in mapped) mapped.membership_date = mapped.entry_date || null;
      if ('birth_date' in mapped) mapped.birth_date = mapped.birth_date || null;
      if ('baptism_date' in mapped) mapped.baptism_date = mapped.baptism_date || null;
      if ('email' in mapped) mapped.email = mapped.email || null;
      if ('document_id' in mapped) mapped.document_id = mapped.document_id || null;
      if ('phone' in mapped) mapped.phone = mapped.phone || null;
      if ('address' in mapped) mapped.address = mapped.address || null;
      if (mapped.is_active === undefined) mapped.is_active = mapped.membership_status === 'active';

      // Eliminar campos locales que no existen en Supabase para evitar 400
      // entry_date NO se borra aquí porque ya se mapeó a membership_date arriba, 
      // y no queremos duplicados a menos que el servidor los ignore.
      // Pero el error dice que no encuentra 'entry_date' en el SCHEMA CACHE de PostgREST, 
      // lo cual confirma que Supabase NO lo tiene.
      ['status', 'entry_date', 'pledge_amount', 'pledge_period', 'ministry', 'photo_url'].forEach(k => delete mapped[k]);
    } else {
      if ('membership_status' in mapped) mapped.status = revMap[mapped.membership_status] || 'activo';
      if ('membership_date' in mapped) mapped.entry_date = mapped.membership_date;
    }
  }

  // 2. CONTRIBUCIONES / DIEZMOS
  else if (tableName === 'contributions') {
    const methodMap: Record<string, string> = {
      'EFECTIVO': 'CASH',
      'TARJETA': 'CARD',
      'TRANSFERENCIA': 'TRANSFER'
    };
    const revMethodMap: Record<string, string> = {
      'CASH': 'EFECTIVO',
      'CARD': 'TARJETA',
      'TRANSFER': 'TRANSFERENCIA'
    };

    if (toRemote) {
      if ('category' in mapped) mapped.contribution_type = mapped.category;
      if ('date' in mapped) mapped.contribution_date = mapped.date;
      if ('method' in mapped) mapped.payment_method = methodMap[mapped.method.toUpperCase()] || 'CASH';
      ['category', 'date', 'method', 'fund_id', 'project_id'].forEach(k => delete mapped[k]);
    } else {
      if ('contribution_type' in mapped) mapped.category = mapped.contribution_type;
      if ('contribution_date' in mapped) mapped.date = mapped.contribution_date;
      if ('payment_method' in mapped) mapped.method = revMethodMap[mapped.payment_method.toUpperCase()] || 'EFECTIVO';
    }
  }

  // 3. FACTURAS
  else if (tableName === 'invoices') {
    const statusMap: Record<string, string> = { 'borrador': 'draft', 'enviada': 'sent', 'pagada': 'paid', 'vencida': 'overdue', 'anulada': 'cancelled' };
    const revMap: Record<string, string> = { 'draft': 'borrador', 'sent': 'enviada', 'paid': 'pagada', 'overdue': 'vencida', 'cancelled': 'anulada' };

    if (toRemote) {
      if ('number' in mapped) mapped.invoice_number = mapped.number;
      if ('date' in mapped) mapped.invoice_date = mapped.date;
      if ('tax' in mapped) mapped.tax_amount = mapped.tax;
      if ('total' in mapped) mapped.total_amount = mapped.total;
      if ('status' in mapped) mapped.status = statusMap[mapped.status] || 'draft';
      ['number', 'date', 'tax', 'total'].forEach(k => delete mapped[k]);
    } else {
      if ('invoice_number' in mapped) mapped.number = mapped.invoice_number;
      if ('invoice_date' in mapped) mapped.date = mapped.invoice_date;
      if ('tax_amount' in mapped) mapped.tax = mapped.tax_amount;
      if ('total_amount' in mapped) mapped.total = mapped.total_amount;
      if ('status' in mapped) mapped.status = revMap[mapped.status] || 'borrador';
    }
  }

  // 4. ITEMS DE FACTURA
  else if (tableName === 'invoice_items') {
    if (toRemote) {
      if ('tax_percent' in mapped) mapped.tax_rate = mapped.tax_percent;
      if ('discount_percent' in mapped) mapped.discount_rate = mapped.discount_percent;
      ['tax_percent', 'discount_percent'].forEach(k => delete mapped[k]);
    } else {
      if ('tax_rate' in mapped) mapped.tax_percent = mapped.tax_rate;
      if ('discount_rate' in mapped) mapped.discount_percent = mapped.discount_rate;
    }
  }

  return mapped;
}

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
        && tableName !== 'financial_notes'
      ) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data) {
        const mappedData = data.map((item: any) => mapTableSchema(tableName, item, false));

        // OBTENCIÓN ATÓMICA DE IDS BORRADOS (Garantiza que no vuelvan a aparecer)
        const deletedEntries = await db.deleted_records
          .where('table_name')
          .equals(tableName)
          .toArray();
        const deletedIds = new Set(deletedEntries.map(d => d.record_id));

        const pendingLocalItems = await (db as any)[tableName]
          .where('sync_status')
          .equals('pendiente')
          .toArray();
        const pendingIds = new Set(pendingLocalItems.map((item: any) => item.id));

        // Filtrar y preparar para bulkPut
        const itemsToCache = mappedData
          .filter((remoteItem: any) => !deletedIds.has(remoteItem.id) && !pendingIds.has(remoteItem.id))
          .map((item: any) => ({ ...item, sync_status: 'sincronizado' }));

        if (itemsToCache.length > 0) {
          await (db as any)[tableName].bulkPut(itemsToCache);
        }

        // GARBAGE COLLECTION
        if (organizationId && data !== null) {
          const isFullSetFetch = !TABLES_WITHOUT_ORG_INDEX.includes(tableName);

          if (isFullSetFetch) {
            const remoteIds = new Set(data.map((d: any) => d.id));
            const localRecords = await (db as any)[tableName]
              .where('organization_id')
              .equals(organizationId)
              .toArray();

            // PRIORIDAD NUBE ABSOLUTA: 
            // Borra localmente cualquier cosa que venga de la nube pero que no esté en el paquete remoto,
            // SIEMPRE que no sea un registro nuevo creado localmente (pendiente).
            const orphansToDelete = localRecords
              .filter((l: any) => l.sync_status !== 'pendiente' && !remoteIds.has(l.id))
              .map((l: any) => l.id);

            if (orphansToDelete.length > 0) {
              console.log(`[GC] Cloud Priority Triggered: Removing ${orphansToDelete.length} stale/phantom records from ${tableName}`);
              await (db as any)[tableName].bulkDelete(orphansToDelete);

              if (tableName === 'transactions') {
                const entries = await db.journal_entries.where('transaction_id').anyOf(orphansToDelete).toArray();
                const entryIds = entries.map(e => e.id);
                if (entryIds.length > 0) {
                  await db.journal_entries.bulkDelete(entryIds);
                }
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
      // Agrupar por tabla
      const deletionsMap: Record<string, { remoteIds: string[], localIds: number[] }> = {};

      pendingDeletions.forEach(d => {
        if (!deletionsMap[d.table_name]) {
          deletionsMap[d.table_name] = { remoteIds: [], localIds: [] };
        }
        deletionsMap[d.table_name].remoteIds.push(d.record_id);
        if (d.id) deletionsMap[d.table_name].localIds.push(d.id);
      });

      const tablesInReverse = [...TABLES_TO_SYNC].reverse();
      for (const table of tablesInReverse) {
        if (deletionsMap[table]) {
          const { remoteIds, localIds } = deletionsMap[table];
          if (remoteIds.length > 0) {
            console.log(`[Sync] Pushing ${remoteIds.length} deletions to ${table}...`);
            const { error } = await (supabase as any).from(table).delete().in('id', remoteIds);

            if (!error) {
              await db.deleted_records.where('id').anyOf(localIds).modify({ sync_status: 'sincronizado' });
            } else {
              console.error(`[Sync] Error deleting from ${table}:`, error);
            }
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
            return mapTableSchema(tableName, data, true);
          });

          const { error } = await (supabase as any).from(tableName).upsert(cleanedData);
          if (tableName === 'members' && error) {
            console.warn(`[Sync Debug] Members upsert error:`, error, "Data sent:", cleanedData);
          }

          if (!error) {
            const ids = chunk.map(i => i.id);
            await (db as any)[tableName].where('id').anyOf(ids).modify({ sync_status: 'sincronizado' });
          } else {
            for (const item of chunk) {
              const { sync_status, ...dt } = item;
              Object.keys(dt).forEach(k => { if (dt[k] === "") dt[k] = null; });
              const mappedItem = mapTableSchema(tableName, dt, true);
              const { error: indError } = await (supabase as any).from(tableName).upsert(mappedItem);
              if (!indError) {
                await (db as any)[tableName].update(item.id, { sync_status: 'sincronizado' });
              } else {
                if (tableName === 'members') {
                  console.error(`[Sync ERROR] Individual member sync failed for ${item.full_name}:`, indError, "Object:", mappedItem);
                }

                if (tableName === 'audit_logs' && indError.code === '42501') {
                  // RLS Error on audit_logs, mark as sync'd to avoid stalling, but maybe log it
                  await (db as any)[tableName].update(item.id, { sync_status: 'sincronizado' });
                } else {
                  await (db as any)[tableName].update(item.id, { sync_status: 'error' });
                }
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
  if (APP_CONFIG.DB_MODE === 'production' || !navigator.onLine || syncInProgress) return;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl || supabaseUrl.includes('placeholder')) return;

  syncInProgress = true;
  try {
    // 1. Enviar cambios locales primero (Garantiza que lo nuevo se suba)
    await syncFromCacheToSupabase();

    // 2. Descargar datos de la nube (Garantiza que la nube sea la prioridad)
    await syncFromSupabaseToCache(organizationId);
  } finally {
    syncInProgress = false;
  }
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
