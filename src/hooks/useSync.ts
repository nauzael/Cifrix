import { useState } from 'react';
import { db, SyncStatus } from '../lib/db';
import { supabase } from '../lib/supabase';
import { Table } from 'dexie';

// ... imports

export function useSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncDeletions = async () => {
    try {
      const pendingDeletions = await db.deleted_records
        .where('sync_status')
        .equals('pendiente')
        .toArray();

      if (pendingDeletions.length === 0) return;

      const deletionsMap: Record<string, { remoteIds: string[], localIds: number[] }> = {};

      pendingDeletions.forEach(d => {
        if (!deletionsMap[d.table_name]) {
          deletionsMap[d.table_name] = { remoteIds: [], localIds: [] };
        }
        deletionsMap[d.table_name].remoteIds.push(d.record_id);
        // @ts-ignore
        if (d.id) deletionsMap[d.table_name].localIds.push(d.id);
      });

      for (const [table, { remoteIds, localIds }] of Object.entries(deletionsMap)) {
        const { error } = await (supabase as any)
          .from(table)
          .delete()
          .in('id', remoteIds);

        if (!error) {
          await db.deleted_records.where('id').anyOf(localIds).modify({ sync_status: 'sincronizado' });
        } else {
          console.error(`Error deleting from ${table}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in syncDeletions:', error);
    }
  };

  const syncTable = async <T extends { id: string, organization_id?: string, sync_status?: SyncStatus }>(
    tableName: string,
    table: Table<T, string>,
    organizationId?: string
  ) => {
    // 1. PUSH: Send pending local changes...
    const pendingItems = await table.where('sync_status').equals('pendiente').toArray();

    for (const item of pendingItems) {
      try {
        const { sync_status, ...itemData } = item;
        // Clean empty strings
        Object.keys(itemData).forEach(key => {
          if ((itemData as any)[key] === "") {
            (itemData as any)[key] = null;
          }
        });

        const { error: uploadError } = await (supabase as any).from(tableName).upsert(itemData as any);
        if (uploadError) throw uploadError;

        await table.update(item.id, { sync_status: 'sincronizado' } as any);
      } catch (e) {
        console.error(`Push failed for ${tableName} ${item.id}`, e);
      }
    }

    // 2. PULL: Get latest changes from Supabase
    try {
      let query = (supabase as any).from(tableName).select('*');

      if (organizationId && tableName !== 'organizations' && tableName !== 'users' && tableName !== 'audit_logs') {
        if (['transactions', 'members', 'projects', 'accounts', 'journal_entries', 'categories', 'customers', 'invoices', 'payments', 'contributions'].includes(tableName)) {
          query = query.eq('organization_id', organizationId);
        }
      }

      const { data: remoteItemsData, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      const remoteItems = remoteItemsData as any[] || [];

      // Get local deletions to avoid pulling them back
      const deletedLocalRecords = await db.deleted_records
        .where('table_name')
        .equals(tableName)
        .toArray();
      const deletedIds = new Set(deletedLocalRecords.map(d => d.record_id));

      if (remoteItems.length > 0) {
        await db.transaction('rw', table, async () => {
          const remoteIdSet = new Set(remoteItems.map(i => i.id));
          const toPut = [];
          const toDelete = [];

          for (const remoteItem of remoteItems) {
            // Check if it was deleted locally
            if (deletedIds.has(remoteItem.id)) continue;

            const localItem = await table.get(remoteItem.id);
            if (!localItem || localItem.sync_status !== 'pendiente') {
              toPut.push({ ...remoteItem, sync_status: 'sincronizado' });
            }
          }

          if (organizationId) {
            const localOrgItems = await table.where('organization_id').equals(organizationId).toArray();
            for (const localItem of localOrgItems) {
              if (!remoteIdSet.has(localItem.id) && localItem.sync_status !== 'pendiente') {
                toDelete.push(localItem.id);
              }
            }
          }

          if (toPut.length > 0) await table.bulkPut(toPut as any);
          if (toDelete.length > 0) await table.bulkDelete(toDelete as any);
        });
      }
    } catch (e) {
      console.error(`Pull failed for ${tableName}`, e);
      throw e;
    }
  };


  const syncAll = async (forceOrganizationId?: string) => {
    if (isSyncing) return;

    const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('placeholder');
    if (!isSupabaseConfigured) return;

    setIsSyncing(true);
    setError(null);
    const errors: string[] = [];

    const safeSync = async (name: string, table: any, orgId?: string) => {
      try {
        await syncTable(name, table, orgId);
      } catch (err: any) {
        errors.push(`${name}: ${err.message}`);
      }
    };

    try {
      await syncDeletions();

      // Critical tables
      await safeSync('organizations', db.organizations); // Org list first

      // AUTO-HEALING: If no organizations found, try RPC Bypass
      const orgCount = await db.organizations.count();
      if (orgCount === 0) {
        console.warn("No organizations found via standard sync. Attempting RPC Bypass...");
        try {
          const { data: rpcData, error: rpcError } = await (supabase as any).rpc('get_my_organization_bypass');
          if (!rpcError && rpcData && rpcData.length > 0) {
            console.log("Recovered organization via RPC:", rpcData[0]);
            await db.organizations.put({
              ...rpcData[0],
              sync_status: 'sincronizado'
            });
          }
        } catch (rpcEx) {
          console.error("RPC Bypass failed:", rpcEx);
        }
      }

      // Use provided ID or try to find one from synced orgs
      let targetOrgId = forceOrganizationId;
      if (!targetOrgId) {
        const orgs = await db.organizations.toArray();
        if (orgs.length > 0) targetOrgId = orgs[0].id;
      }

      await safeSync('accounts', db.accounts, targetOrgId);
      await safeSync('categories', db.categories, targetOrgId);
      await safeSync('projects', db.projects, targetOrgId);
      await safeSync('members', db.members, targetOrgId);
      await safeSync('customers', db.customers, targetOrgId);

      await safeSync('transactions', db.transactions, targetOrgId);
      await safeSync('journal_entries', db.journal_entries, targetOrgId);

      await safeSync('contributions', db.contributions, targetOrgId);
      await safeSync('invoices', db.invoices, targetOrgId);
      await safeSync('invoice_items', db.invoice_items, targetOrgId);
      await safeSync('payments', db.payments, targetOrgId);
      await safeSync('audit_logs', db.audit_logs, targetOrgId);

      if (errors.length > 0) {
        console.warn("Sync completed with errors:", errors);
        setError("Sincronización parcial completada.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  return { syncAll, isSyncing, error };
}
