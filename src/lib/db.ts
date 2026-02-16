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
  photo_url: string | null;
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
  cash_flow_category?: 'OPERACION' | 'INVERSION' | 'FINANCIACION';
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

export interface UserVaultEntry {
  email: string;                    // Índice primario - Email del usuario
  password_hash: string;            // SHA-256 hash de la contraseña + salt
  salt: string;                     // Salt único generado por usuario
  encrypted_profile: string;        // Perfil del usuario encriptado en AES-256
  encryption_iv: string;            // Vector de inicialización para AES
  user_id: string;                  // ID del usuario en Supabase
  last_sync: string;                // Timestamp del último login online exitoso
  created_at: string;               // Timestamp de creación de la entrada
}

// ============================================================================
// INTERFACES - MÓDULO DE DECLARACIÓN DE RENTA
// ============================================================================

export interface DeclaracionRenta {
  id: string;
  organization_id: string;
  periodo_fiscal: number;
  contribuyente_id: string;
  contribuyente_nombre: string;

  // Tipo de contribuyente (NUEVO)
  tipo_contribuyente: 'PERSONA_NATURAL' | 'PERSONA_JURIDICA';

  estado: 'BORRADOR' | 'PRESENTADA' | 'CORREGIDA' | 'ANULADA';

  // Montos principales
  total_ingresos: number;
  total_costos: number;
  total_gastos: number;
  total_deducciones: number;
  base_gravable: number;
  impuesto_calculado: number;
  creditos_tributarios: number;
  impuesto_neto: number;

  // Campos específicos para Persona Natural
  renta_presuntiva?: number;
  renta_exenta?: number;
  rentas_trabajo?: number;
  rentas_capital?: number;
  rentas_no_laborales?: number;

  // Campos específicos para Persona Jurídica
  utilidad_contable?: number;
  conciliacion_fiscal?: number;
  impuesto_diferido?: number;

  // Metadata
  fecha_creacion: string;
  fecha_presentacion?: string;
  json_calculado?: any;
  xml_dian?: string;
  created_at: string;
  sync_status?: SyncStatus;
}

export interface IngresoRenta {
  id: string;
  declaracion_id: string;
  tipo_ingreso:
  // Persona Natural
  'LABORAL' | 'HONORARIOS' | 'RENTAS' | 'CAPITAL' | 'DIVIDENDOS' |
  // Persona Jurídica
  'OPERACIONAL' | 'NO_OPERACIONAL' | 'FINANCIERO' | 'EXTRAORDINARIO' |
  'OTROS';
  concepto: string;
  monto: number;
  mes?: number;
  retencion_aplicada: number;

  // Campos adicionales para Persona Jurídica
  es_no_constitutivo_renta?: boolean;
  es_exento?: boolean;

  notas?: string;
  created_at: string;
  sync_status?: SyncStatus;
}

export interface DeduccionRenta {
  id: string;
  declaracion_id: string;
  tipo_deduccion:
  // Para Persona Natural
  'SALUD' | 'EDUCACION' | 'INTERESES_VIVIENDA' | 'DEPENDIENTES' |
  // Para Persona Jurídica
  'COSTO_MERCANCIA' | 'NOMINA' | 'SERVICIOS' | 'DEPRECIACION' |
  'AMORTIZACION' | 'PROVISION' | 'OTROS';
  concepto: string;
  monto: number;
  limite_aplicable?: number;
  monto_deducido?: number;
  documento_soporte?: string;
  created_at: string;
  sync_status?: SyncStatus;
}

export interface ActivoPasivoRenta {
  id: string;
  declaracion_id: string;
  tipo: 'ACTIVO' | 'PASIVO';
  categoria: string;
  descripcion: string;
  valor: number;
  fecha_adquisicion?: string;
  created_at: string;
  sync_status?: SyncStatus;
}

// ============================================================================
// INTERFACES - ESTADOS FINANCIEROS Y CIERRE
// ============================================================================

export interface FiscalYear {
  id: string;
  organization_id: string;
  year: number;
  status: 'ABIERTO' | 'CERRADO';
  normativo?: 'NIIF_COMPLETAS' | 'NIIF_PYMES' | 'CONTABILIDAD_SIMPLIFICADA';
  cut_off_date?: string;
  closed_at?: string;
  closed_by?: string;
  closing_entry_id?: string;
  created_at: string;
  sync_status?: SyncStatus;
}

export interface FinancialNote {
  id: string;
  organization_id: string;
  period_id: string; // "YYYY" o "YYYY-MM"
  report_type: 'BALANCE' | 'RESULTADOS' | 'PATRIMONIO' | 'FLUJO';
  account_id?: string;
  section_key?: string;
  title: string;
  content: string;
  order: number;
  created_at: string;
  sync_status?: SyncStatus;
}

// ============================================================================
// INTERFACES - MÓDULO DE EXÓGENOS
// ============================================================================

export interface Exogeno {
  id: string;
  organization_id: string;
  tipo_exogeno: '0210' | '0220' | '0230' | '0240' | '0250' | '0260';
  periodo_fiscal: number;

  // Datos del informante (quien reporta)
  nit_informante: string;
  nombre_informante?: string;

  // Datos del contribuyente (sobre quien se reporta)
  nit_contribuyente: string;
  nombre_contribuyente?: string;

  // Datos del movimiento
  concepto: string;
  monto: number;
  retencion: number;
  fecha_movimiento: string;

  // Procesamiento
  procesado: boolean;
  validado: boolean;
  inconsistencia?: string;

  // Metadata
  archivo_origen?: string;
  linea_origen?: number;
  datos_raw?: any;
  created_at: string;
  sync_status?: SyncStatus;
}

export interface MapeoInconsistencia {
  id: string;
  exogeno_id: string;

  // Referencia a operación interna
  entidad_tipo?: string; // 'INVOICE', 'PAYMENT', 'TRANSACTION', etc.
  entidad_id?: string;

  // Estado de validación
  estado_validacion: 'VALIDADO' | 'DISCREPANCIA' | 'SIN_CORRESPONDENCIA' | 'PENDIENTE';
  diferencia_monto?: number;
  diferencia_fecha?: number; // días de diferencia

  // Resolución
  resuelto: boolean;
  notas?: string;
  responsable_resolucion?: string;
  fecha_resolucion?: string;

  created_at: string;
  sync_status?: SyncStatus;
}

export class CifrixDB extends Dexie {
  // Tablas existentes
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
  user_vault!: Table<UserVaultEntry>;

  // Nuevas tablas - Módulo de Renta
  declaraciones_renta!: Table<DeclaracionRenta>;
  ingresos_renta!: Table<IngresoRenta>;
  deducciones_renta!: Table<DeduccionRenta>;
  activos_pasivos_renta!: Table<ActivoPasivoRenta>;

  // Nuevas tablas - Módulo de Exógenos
  exogenos!: Table<Exogeno>;
  mapeo_inconsistencias!: Table<MapeoInconsistencia>;

  // Nuevas tablas - Estados Financieros
  fiscal_years!: Table<FiscalYear>;
  financial_notes!: Table<FinancialNote>;

  ignoreDeletions = false;

  constructor() {
    super('CifrixDatabase');
    this.version(11).stores({
      // Tablas existentes
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
      deleted_records: 'id, table_name, sync_status',
      user_vault: 'email, user_id, last_sync',

      // Nuevas tablas - Módulo de Renta
      declaraciones_renta: 'id, organization_id, periodo_fiscal, estado, contribuyente_id, sync_status',
      ingresos_renta: 'id, declaracion_id, tipo_ingreso, mes, sync_status',
      deducciones_renta: 'id, declaracion_id, tipo_deduccion, sync_status',
      activos_pasivos_renta: 'id, declaracion_id, tipo, sync_status',

      // Nuevas tablas - Módulo de Exógenos
      exogenos: 'id, organization_id, tipo_exogeno, periodo_fiscal, nit_contribuyente, procesado, validado, sync_status',
      mapeo_inconsistencias: 'id, exogeno_id, estado_validacion, resuelto, sync_status',

      // Nuevas tablas - Estados Financieros
      fiscal_years: 'id, organization_id, year, status, sync_status',
      financial_notes: 'id, organization_id, period_id, report_type, sync_status'
    });

    // Hooks to track deletions
    this.setupHooks();
  }

  private setupHooks() {
    const tablesToTrack = [
      'organizations', 'members', 'transactions', 'journal_entries',
      'accounts', 'contributions', 'projects', 'categories',
      'customers', 'invoices', 'invoice_items', 'payments',
      // Nuevas tablas de Renta y Exógenos
      // Nuevas tablas de Renta y Exógenos
      'declaraciones_renta', 'ingresos_renta', 'deducciones_renta', 'activos_pasivos_renta',
      'exogenos', 'mapeo_inconsistencias',
      // Nuevas tablas de Estados Financieros
      'fiscal_years', 'financial_notes'
    ];

    tablesToTrack.forEach(tableName => {
      (this as any)[tableName].hook('deleting', (id: string, obj: any) => {
        if (this.ignoreDeletions) return;

        // RETORNAR la promesa para que Dexie espere a que se registre el rastro antes de completar el borrado
        return this.deleted_records.put({
          id,
          table_name: tableName,
          deleted_at: new Date().toISOString(),
          sync_status: 'pendiente'
        }).catch(err => {
          console.warn(`[DB] Error tracking deletion for ${tableName} (${id}):`, err);
        });
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
