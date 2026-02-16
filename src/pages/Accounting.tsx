import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Organization } from '../lib/db';
import { supabase } from '../lib/supabase';
import { syncToSupabase } from '../lib/sync';
import { useAuthStore } from '../store/authStore';
import { useAccountingStore } from '../store/accountingStore';
import { PUCManager } from '../components/accounting/PUCManager';
import { CategoryManager } from '../components/accounting/CategoryManager';
import { Ledger } from '../components/accounting/Ledger';
import { BankReconciliation } from '../components/accounting/BankReconciliation';
import { TransactionForm } from '../components/accounting/TransactionForm';
import { TrialBalance } from '../components/accounting/TrialBalance';
import { FinancialStatements } from '../components/accounting/FinancialStatements';
import { v4 as uuidv4 } from 'uuid';
import {
  Filter,
  Plus,
  Search,
  Edit,
  Receipt,
  Banknote,
  History,
  CloudFog,
  BookOpen,
  ListTree,
  Trash2,
  Scale,
  FileBarChart,
  Tags,
  Library,
  Building2
} from 'lucide-react';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { toast } from '../store/toastStore';
import { confirm } from '../store/confirmStore';

export function Accounting() {
  const { user, profile } = useAuthStore();
  const location = useLocation();
  const {
    activeTab,
    setActiveTab,
    journalSearchTerm: searchTerm,
    setJournalSearchTerm: setSearchTerm
  } = useAccountingStore();
  const [org, setOrg] = useState<Organization | null>(null);
  const [orgId, setOrgId] = useState<string>('');
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);

  // Filters State
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');

  useEffect(() => {
    if (location.state?.targetTab) {
      setActiveTab(location.state.targetTab);
    }
  }, [location, setActiveTab]);

  // Realtime Subscription
  useEffect(() => {
    if (!orgId) return;

    const channel = supabase
      .channel('accounting-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `organization_id=eq.${orgId}` },
        () => {
          console.log('Realtime change detected in TRANSACTIONS. Optimistic UI update or Sync...');
          syncToSupabase(orgId);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'journal_entries' },
        () => {
          console.log('Realtime change detected in JOURNAL ENTRIES.');
          syncToSupabase(orgId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId]);

  useEffect(() => {
    const fetchOrg = async () => {
      // Prioritize profile organization (current context)
      if (profile?.organizationId) {
        const currentOrg = await db.organizations.get(profile.organizationId);
        if (currentOrg) {
          setOrg(currentOrg);
          setOrgId(currentOrg.id);
          return;
        }
      }

      // Fallback to first organization
      if (user) {
        let orgs = await db.organizations.toArray();
        if (orgs.length > 0) {
          setOrg(orgs[0]);
          setOrgId(orgs[0].id);
        }
      }
    };
    fetchOrg();
  }, [user, profile]);

  const projects = useLiveQuery(
    () => (orgId ? db.projects.where('organization_id').equals(orgId).toArray() : []),
    [orgId]
  );

  // Query Transactions
  const transactions = useLiveQuery(
    async () => {
      if (!orgId) return [];
      let results = await db.transactions.where('organization_id').equals(orgId).toArray();

      // Filter by Date Range
      if (dateRange.start) {
        results = results.filter(tx => tx.date >= dateRange.start);
      }
      if (dateRange.end) {
        results = results.filter(tx => tx.date <= dateRange.end);
      }

      // Filter by Project
      if (selectedProject) {
        results = results.filter(tx => tx.project_id === selectedProject);
      }

      // Filter by Account
      if (selectedAccount) {
        // Get all entries that use this account
        const entriesWithAccount = await db.journal_entries
          .where('account_id').equals(selectedAccount)
          .toArray();
        const txIdsWithAccount = new Set(entriesWithAccount.map(e => e.transaction_id));

        results = results.filter(tx => txIdsWithAccount.has(tx.id));
      }

      // Sort by date DESC, then created_at DESC to ensure newest entries appear first
      results.sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return (b.created_at || '').localeCompare(a.created_at || '');
      });

      if (searchTerm) {
        results = results.filter(tx =>
          tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tx.reference_no?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      return results;
    },
    [orgId, searchTerm, dateRange, selectedAccount, selectedProject]
  );

  // Query Journal Entries (for all transactions displayed)
  // Optimization: In a real app, we might paginate or only fetch entries for visible transactions.
  const journalEntries = useLiveQuery(
    () => (orgId ? db.journal_entries.toArray() : []),
    [orgId]
  );

  const accounts = useLiveQuery(
    () => (orgId ? db.accounts.toArray() : []),
    [orgId]
  );

  // Helper to get entries for a transaction
  const getEntriesForTransaction = (txId: string) => {
    return journalEntries?.filter(e => e.transaction_id === txId) || [];
  };

  // Helper to get account code/name
  const getAccountInfo = (accountId: string) => {
    const acc = accounts?.find(a => a.id === accountId);
    return acc ? `${acc.code} - ${acc.name}` : 'Cuenta desconocida';
  };

  const deleteTransaction = async (id: string, date: string) => {
    // Check lock date
    const lockDate = org?.settings?.accounting?.lockDate;
    if (lockDate && date < lockDate) {
      toast.error(`No se pueden eliminar asientos antes de la fecha de cierre: ${lockDate}`);
      return;
    }

    confirm({
      title: 'Eliminar Asiento',
      message: '¿Está seguro de eliminar este asiento? Esta acción no se puede deshacer.',
      confirmText: 'SÍ, ELIMINAR',
      type: 'danger',
      onConfirm: async () => {
        try {
          await db.transaction('rw', [db.transactions, db.journal_entries], async () => {
            await db.transactions.delete(id);
            await db.journal_entries.where('transaction_id').equals(id).delete();
          });
          toast.success('Asiento eliminado correctamente');
        } catch (error) {
          console.error('Error deleting transaction:', error);
          toast.error('Error al eliminar el asiento');
        }
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-1 tracking-tight">Contabilidad</h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Gestión financiera y libros oficiales</p>
        </div>

        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto whitespace-nowrap scrollbar-hide">
          {[
            { id: 'journal', label: 'Libro Diario', icon: BookOpen },
            { id: 'ledger', label: 'Mayor', icon: Library },
            { id: 'trial_balance', label: 'Balance Prueba', icon: Scale },
            { id: 'financial_statements', label: 'Estados Fin.', icon: FileBarChart },
            { id: 'reconciliation', label: 'Conciliación', icon: Building2 },
            { id: 'categories', label: 'Categorías', icon: Tags },
            { id: 'puc', label: 'PUC', icon: ListTree },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5",
                activeTab === tab.id
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              )}
            >
              <tab.icon className="size-4" />
              <span className={cn(activeTab === tab.id ? "inline" : "hidden sm:inline")}>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'puc' ? (
        <PUCManager organizationId={orgId} />
      ) : activeTab === 'categories' ? (
        <CategoryManager organizationId={orgId} />
      ) : activeTab === 'ledger' ? (
        <Ledger organizationId={orgId} />
      ) : activeTab === 'trial_balance' ? (
        <TrialBalance organizationId={orgId} />
      ) : activeTab === 'financial_statements' ? (
        <FinancialStatements organizationId={orgId} />
      ) : activeTab === 'reconciliation' ? (
        <BankReconciliation organizationId={orgId} />
      ) : (
        <>
          {/* Actions Bar */}
          <div className="flex flex-col gap-4">
            {/* Filters Panel */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 -mr-16 -mt-16 rounded-full blur-3xl"></div>

              <div className="lg:col-span-3 relative z-10">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Buscar Asiento</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-100 dark:border-slate-800 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none bg-slate-50 dark:bg-slate-950 dark:text-white transition-all focus:border-blue-500/50"
                    placeholder="Descripción o referencia..."
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                    <button
                      onClick={async () => {
                        toast.info('Sincronizando con la nube...');
                        try {
                          await syncToSupabase(orgId);
                          toast.success('Sincronización completada');
                        } catch (error) {
                          toast.error('Error al sincronizar');
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                      title="Forzar Sincronización"
                    >
                      <CloudFog size={16} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 relative z-10">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Fecha Desde</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-slate-100 dark:border-slate-800 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none bg-slate-50 dark:bg-slate-950 dark:text-white transition-all focus:border-blue-500/50"
                />
              </div>

              <div className="lg:col-span-2 relative z-10">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Fecha Hasta</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-slate-100 dark:border-slate-800 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none bg-slate-50 dark:bg-slate-950 dark:text-white transition-all focus:border-blue-500/50"
                />
              </div>

              <div className="lg:col-span-2 relative z-10">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Filtrar Cuenta</label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-100 dark:border-slate-800 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none bg-slate-50 dark:bg-slate-950 dark:text-white transition-all focus:border-blue-500/50"
                >
                  <option value="">Todas las cuentas</option>
                  {accounts
                    ?.sort((a, b) => a.code.localeCompare(b.code))
                    // Deduplicate by code for the dropdown
                    .filter((acc, index, self) => index === self.findIndex(t => t.code === acc.code))
                    .map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                    ))}
                </select>
              </div>

              <div className="lg:col-span-2 relative z-10">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Proyecto/Meta</label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-100 dark:border-slate-800 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none bg-slate-50 dark:bg-slate-950 dark:text-white transition-all focus:border-blue-500/50"
                >
                  <option value="">General</option>
                  {projects?.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-1 relative z-10">
                <button
                  onClick={() => {
                    setEditingTransactionId(null);
                    setIsTransactionModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-black shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-95 transition-all h-[42px]"
                >
                  <Plus className="size-5" />
                  <span className="lg:hidden xl:inline uppercase tracking-tighter">Nuevo</span>
                </button>
              </div>
            </div>
          </div>

          {/* Journal Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                    <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Fecha / Referencia</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Detalle del Asiento Contable</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Débitos</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Créditos</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center">Gestión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(!transactions || transactions.length === 0) ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="size-20 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4 border border-dashed border-slate-200 dark:border-slate-700">
                            <History className="size-10 text-slate-300 dark:text-slate-600" />
                          </div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white">No se encontraron asientos</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">Prueba ajustando los filtros o realiza tu primer registro contable hoy.</p>
                        </div>
                      </td>
                    </tr>
                  ) : transactions.map(tx => {
                    const entries = getEntriesForTransaction(tx.id);
                    const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
                    const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                        <td className="px-4 sm:px-6 py-4 align-top w-32 sm:w-40">
                          <p className="text-xs sm:text-sm font-bold whitespace-nowrap">{formatDate(tx.date)}</p>
                          {tx.reference_no && <p className="text-[10px] sm:text-xs text-slate-500 mt-1 truncate max-w-[100px] sm:max-w-none">Ref: {tx.reference_no}</p>}
                          <p className="text-[9px] sm:text-[10px] text-slate-400 mt-2 truncate">{tx.id.substring(0, 8)}...</p>
                        </td>
                        <td className="px-4 sm:px-6 py-4 align-top min-w-[200px]">
                          <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-2 line-clamp-2">{tx.description}</p>
                          <div className="space-y-1">
                            {entries.map(entry => (
                              <div key={entry.id} className="flex justify-between text-[10px] sm:text-xs border-b border-slate-100 dark:border-slate-800 last:border-0 pb-1">
                                <span className="text-slate-600 dark:text-slate-400 font-mono truncate max-w-[150px] sm:max-w-none">
                                  {getAccountInfo(entry.account_id)}
                                </span>
                                <div className="flex gap-2 sm:gap-4 whitespace-nowrap ml-2">
                                  {entry.debit > 0 && <span className="text-slate-900 dark:text-slate-200 font-medium w-20 sm:w-24 text-right">D: {formatCurrency(entry.debit)}</span>}
                                  {entry.credit > 0 && <span className="text-slate-900 dark:text-slate-200 font-medium w-20 sm:w-24 text-right">C: {formatCurrency(entry.credit)}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-right align-top font-mono text-xs sm:text-sm text-slate-900 dark:text-white whitespace-nowrap">
                          $ {formatCurrency(totalDebit)}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-right align-top font-mono text-xs sm:text-sm text-slate-900 dark:text-white whitespace-nowrap">
                          $ {formatCurrency(totalCredit)}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-center align-top">
                          <div className="flex flex-col items-center gap-2">
                            <span className={`inline-flex px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-[10px] font-bold uppercase tracking-wide ${tx.sync_status === 'sincronizado'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-50 text-blue-600 border border-blue-100'
                              }`}>
                              {tx.sync_status === 'sincronizado' ? 'Sincronizado' : 'Solo Local'}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setEditingTransactionId(tx.id);
                                  setIsTransactionModalOpen(true);
                                }}
                                className="p-1.5 sm:p-1 text-slate-400 sm:text-slate-300 hover:text-blue-500 transition-colors"
                                title="Editar asiento"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => deleteTransaction(tx.id, tx.date)}
                                className="p-1.5 sm:p-1 text-slate-400 sm:text-slate-300 hover:text-red-500 transition-colors"
                                title="Eliminar asiento"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {(!transactions || transactions.length === 0) && (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-400">
                        No hay asientos registrados aún.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )
      }

      {
        isTransactionModalOpen && (
          <TransactionForm
            organizationId={orgId}
            transactionId={editingTransactionId}
            onClose={() => {
              setIsTransactionModalOpen(false);
              setEditingTransactionId(null);
            }}
            onSuccess={() => {
              setSearchTerm(''); // Clear search to show the new entry
            }}
          />
        )
      }
    </div >
  );
}
