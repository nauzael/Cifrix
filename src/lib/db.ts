import Dexie, { Table } from 'dexie';

export type SyncStatus = 'sincronizado' | 'pendiente' | 'error';

export interface Organization {
  id: string;
  name: string;
  type: 'IGLESIA' | 'EMPRESA';
  tax_id: string;
  settings: any;
  created_at: string;
  sync_status?: SyncStatus;
}

export interface Member {
  id: string;
  organization_id: string;
  full_name: string;
  document_id: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  birth_date: string | null;
  entry_date: string | null;
  baptism_date: string | null;
  ministry: string[] | null;
  status: 'activo' | 'inactivo' | 'visitante';
  is_active: boolean;
  photo_url:string | null;
  pledge_amount?: number;
  pledge_period?: string;
  created_at: string;
  sync_status?: SyncStatus;
}

export interface Project {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  target_amount: number;
  start_date: string;
  end_date: string | null;
  status: 'activo' | 'completado' | 'cancelado';
  created_at: string;
  sync_status?: SyncStatus;
}

export interface Transaction {
  id: string;
  organization_id: string;
  date: string;
  description: string;
  reference_no: string | null;
  type: 'ingreso' | 'egreso' | 'transferencia';
  category_id: string | null;
  project_id?: string | null;
  method: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA';
  created_by: string;
  created_at: string;
  sync_status?: SyncStatus;
}

export interface Account {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  parent_id: string | null;
  type: 'ACTIVO' | 'PASIVO' | 'PATRIMONIO' | 'INGRESO' | 'EGRESO';
  nature: 'DEBITO' | 'CREDITO';
  level: number;
  accepts_movement: boolean;
  created_at: string;
  sync_status?: SyncStatus;
}

export interface Category {
  id: string;
  organization_id: string;
  name: string;
  type: 'ingreso' | 'egreso';
  parent_id: string | null;
  icon: string | null;
  color: string | null;
  created_at: string;
  sync_status?: SyncStatus;
}

export interface Customer {
  id: string;
  organization_id: string;
  name: string;
  tax_id: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
  sync_status?: SyncStatus;
}

export interface Invoice {
  id: string;
  organization_id: string;
  customer_id: string;
  number: string;
  date: string;
  due_date: string;
  subtotal: number;
  tax: number;
  total: number;
  payment_form: 'Contado' | 'Credito';
  payment_method: string;
  status: 'borrador' | 'enviada' | 'pagada' | 'vencida' | 'anulada';
  dian_status?: 'sin_enviar' | 'enviando' | 'aceptada' | 'rechazada' | 'error';
  cufe?: string;
  qr_data?: string;
  dian_xml_url?: string;
  dian_response?: any;
  created_at: string;
  sync_status?: SyncStatus;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  code?: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent?: number;
  discount_amount?: number;
  tax_percent: number;
  total: number;
  sync_status?: SyncStatus;
}

export interface Payment {
  id: string;
  organization_id: string;
  invoice_id: string;
  date: string;
  amount: number;
  method: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA';
  reference?: string;
  notes?: string;
  created_at: string;
  sync_status?: SyncStatus;
}

export interface Contribution {
  id: string;
  organization_id: string;
  member_id: string | null;
  transaction_id: string;
  category: 'DIEZMO' | 'OFRENDA' | 'ESPECIAL';
  fund_id: string | null;
  project_id: string | null;
  amount: number;
  method: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA';
  date: string;
  created_at: string;
  sync_status?: SyncStatus;
}

export interface JournalEntry {
  id: string;
  transaction_id: string;
  account_id: string;
  debit: number;
  credit: number;
  notes?: string;
  sync_status?: SyncStatus;
}

export interface AuditLog {
  id: string;
  organization_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_data: any | null;
  new_data: any | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  sync_status?: SyncStatus;
}

export interface DeletedRecord {
  id: string; // id of the record in its original table
  table_name: string;
  deleted_at: string;
  sync_status: SyncStatus;
}

export class CifrixDB extends Dexie {
  organizations!: Table<Organization>;
  members!: Table<Member>;
  transactions!: Table<Transaction>;
  journal_entries!: Table<JournalEntry>;
  accounts!: Table<Account>;
  contributions!: Table<Contribution>;
  projects!: Table<Project>;
  audit_logs!: Table<AuditLog>;
  categories!: Table<Category>;
  customers!: Table<Customer>;
  invoices!: Table<Invoice>;
  invoice_items!: Table<InvoiceItem>;
  payments!: Table<Payment>;
  deleted_records!: Table<DeletedRecord>;

  ignoreDeletions = false;

  constructor() {
    super('CifrixDatabase');
    this.version(9).stores({
      organizations: 'id, type, sync_status',
      members: 'id, organization_id, full_name, document_id, status, sync_status',
      transactions: 'id, organization_id, date, type, sync_status',
      journal_entries: 'id, transaction_id, account_id, sync_status',
      accounts: 'id, organization_id, code, type, sync_status',
      contributions: 'id, organization_id, member_id, date, category, project_id, sync_status',
      projects: 'id, organization_id, status, sync_status',
      audit_logs: 'id, organization_id, user_id, action, entity_type, created_at, sync_status',
      categories: 'id, organization_id, type, parent_id, sync_status',
      customers: 'id, organization_id, name, tax_id, sync_status',
      invoices: 'id, organization_id, customer_id, number, date, status, dian_status, cufe, sync_status',
      invoice_items: 'id, invoice_id, sync_status',
      payments: 'id, organization_id, invoice_id, date, sync_status',
      deleted_records: 'id, table_name, sync_status'
    });

    // Hooks to track deletions
    this.setupHooks();
  }

  private setupHooks() {
    const tablesToTrack = [
      'organizations', 'members', 'transactions', 'journal_entries', 
      'accounts', 'contributions', 'projects', 'categories', 
      'customers', 'invoices', 'invoice_items', 'payments'
    ];

    tablesToTrack.forEach(tableName => {
      (this as any)[tableName].hook('deleting', (id: string, obj: any) => {
        if (this.ignoreDeletions) return;
        
        // Only track if it was already synchronized or at least exists
        // If it's a new record not yet synced, we don't strictly need to track it for Supabase
        // but tracking everything is safer.
        this.deleted_records.add({
          id,
          table_name: tableName,
          deleted_at: new Date().toISOString(),
          sync_status: 'pendiente'
        }).catch(err => console.error(`Error tracking deletion for ${tableName}:`, err));
      });
    });
  }

  async clearAllData() {
    try {
      this.ignoreDeletions = true;
      await Promise.all(this.tables.map(table => table.clear()));
      this.ignoreDeletions = false;
    } catch (error) {
      console.error('Error clearing data:', error);
      this.ignoreDeletions = false;
      throw error;
    }
  }
}

export const db = new CifrixDB();

export async function resetDatabase() {
  try {
    // 1. Unregister all Service Workers to prevent caching old code
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }

    // 2. Clear all Caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        await caches.delete(name);
      }
    }

    // 3. Close and Delete Database
    await db.close();
    await db.delete();
    
    // 4. Force reload from server (not cache)
    window.location.href = window.location.origin + '/?reset=' + Date.now();
  } catch (error) {
    console.error('Error during database reset:', error);
    // Fallback reload
    window.location.reload();
  }
}
