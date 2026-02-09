import { useState } from 'react';
import { db, SyncStatus } from '../lib/db';
import { supabase } from '../lib/supabase';
import { Table } from 'dexie';

// ... imports

export function useSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncTable = async <T extends { id: string, organization_id?: string, sync_status?: SyncStatus }>(
    tableName: string,
    table: Table<T, string>,
    organizationId?: string
  ) => {
    // 1. PUSH: Send pending local changes...
    const pendingItems = await table.where('sync_status').equals('pendiente').toArray();
    // ... (existing push logic is mostly fine, but let's wrap it safe)

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

      // If retrieving shared data (like accounts, transactions) and we have an org ID, filtering helps performance
      // But we rely mainly on RLS. Adding this explicit filter is a safety net.
      if (organizationId && tableName !== 'organizations' && tableName !== 'users' && tableName !== 'audit_logs') {
        // Check if table has organization_id column before filtering (best effort guess based on schema knowledge)
        // We know our schema has organization_id in almost all tables
        if (['transactions', 'members', 'projects', 'accounts', 'journal_entries', 'categories', 'customers', 'invoices', 'payments', 'contributions'].includes(tableName)) {
          query = query.eq('organization_id', organizationId);
        }
      }

      const { data: remoteItemsData, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const remoteItems = remoteItemsData as any[] || [];

      if (remoteItems.length > 0) {
        await db.transaction('rw', table, async () => {
          // Logic to reconcile:
          // 1. If item exists locally and is 'pendiente', DO NOT overwrite (local changes take precedence temporarily until pushed)
          // 2. If item exists locally and is 'sincronizado', overwrite with remote
          // 3. If item does not exist locally, add it

          const localIds = await table.toCollection().primaryKeys();
          const remoteIdSet = new Set(remoteItems.map(i => i.id));

          // Bulk ops preparation
          const toPut = [];
          const toDelete = [];

          for (const remoteItem of remoteItems) {
            const localItem = await table.get(remoteItem.id);
            if (!localItem || localItem.sync_status !== 'pendiente') {
              toPut.push({ ...remoteItem, sync_status: 'sincronizado' });
            }
          }

          // Only delete if we are SURE this wasn't a filtered query.
          // If we filtered by orgId, we only see a subset, so we shouldn't delete things not in the result set
          // unless we are sure the table only contains that org's data locally.
          // For safety in this hybrid mode: avoid bulk deletion unless we're strictly mirroring.
          // Let's implement a safer delete: only delete if we know it belongs to this org and isn't in remote
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

  // ... syncDeletions remains same ...

  const syncDeletions = async () => { };

  const syncAll = async (forceOrganizationId?: string) => {
    if (isSyncing) return;

    const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('placeholder');
    if (!isSupabaseConfigured) return;

    setIsSyncing(true);
    setError(null);
    const errors: string[] = [];

    const safeSync = async (name: string, table: any) => {
      try {
        await syncTable(name, table, forceOrganizationId);
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

      await safeSync('accounts', db.accounts);
      await safeSync('categories', db.categories);
      await safeSync('projects', db.projects);
      await safeSync('members', db.members);
      await safeSync('customers', db.customers);

      await safeSync('transactions', db.transactions);
      await safeSync('journal_entries', db.journal_entries);

      await safeSync('contributions', db.contributions);
      await safeSync('invoices', db.invoices);
      await safeSync('invoice_items', db.invoice_items);
      await safeSync('payments', db.payments);
      await safeSync('audit_logs', db.audit_logs);

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
