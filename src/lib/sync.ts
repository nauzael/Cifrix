import { db } from './db';
import { supabase } from './supabase';

const TABLES_TO_SYNC = [
  'organizations',
  'accounts', // Sync accounts before entries that use them
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

export async function syncToSupabase() {
  if (!navigator.onLine) return;

  // Skip sync if Supabase is not configured (using placeholder)
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
    return;
  }

  // Process deletions first
  try {
    const pendingDeletions = await db.deleted_records
      .where('sync_status')
      .equals('pendiente')
      .toArray();

    for (const record of pendingDeletions) {
      const { error } = await supabase
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
      
      // Special case for accounts: sync by level to avoid parent_id constraints
      const pendingItems = tableName === 'accounts' 
        ? await query.sortBy('level')
        : await query.toArray();

      if (pendingItems.length === 0) continue;

      // console.log(`Syncing ${pendingItems.length} items for ${tableName}...`);

      for (const item of pendingItems) {
        const { sync_status, ...dataToSync } = item;
        
        // Sanitize data: convert empty strings to null for UUID compatibility
        Object.keys(dataToSync).forEach(key => {
          if (dataToSync[key] === "") {
            dataToSync[key] = null;
          }
        });
        
        const { error } = await supabase
          .from(tableName)
          .upsert(dataToSync);

        if (!error) {
          await (db as any)[tableName].update(item.id, { sync_status: 'sincronizado' });
        } else {
          // console.error(`Error syncing item ${item.id} in ${tableName}:`, error);
          
          // Check for RLS error (42501)
          if (error.code === '42501') {
            console.warn(`RLS Permission denied for table ${tableName}. Stopping sync for this table.`);
            break; // Stop syncing this table to avoid spamming errors
          }
        }
      }
    } catch (error) {
      console.error(`Error in sync process for ${tableName}:`, error);
    }
  }
}

// Background sync every 5 minutes
setInterval(syncToSupabase, 5 * 60 * 1000);

// Sync when coming back online
window.addEventListener('online', syncToSupabase);
