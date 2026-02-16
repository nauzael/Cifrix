import { useState, useEffect } from 'react';
import {
  History,
  Plus,
  Search,
  Receipt,
  Banknote,
  CreditCard,
  Landmark,
  Activity,
  CheckCircle2,
  Loader2,
  TrendingUp,
  Download,
  AlertCircle
} from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import { db, Member, Transaction, Contribution, JournalEntry, Project } from '../lib/db';
import { ProjectManager } from '../components/church/ProjectManager';
import { MinisterialReports } from '../components/church/MinisterialReports';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Heart,
  FileBarChart,
  CloudFog,
  Target
} from 'lucide-react';
import { toast } from '../store/toastStore';
import { syncToSupabase } from '../lib/sync';
import {
  insertRecord,
  getFromCacheOrSupabase
} from '../lib/dbOperations';

const contributionSchema = z.object({
  amount: z.string().min(1, 'El monto es requerido').transform((val) => Number(val)),
  category: z.enum(['DIEZMO', 'OFRENDA', 'ESPECIAL']),
  method: z.enum(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA']),
  reference: z.string().optional(),
  notes: z.string().optional(),
  fund_id: z.string().optional(),
  project_id: z.string().optional(),
});

type ContributionForm = z.infer<typeof contributionSchema>;

export function Diezmos() {
  const navigate = useNavigate();
  const { user, profile } = useAuthStore();
  const [orgId, setOrgId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'registro' | 'proyectos' | 'reportes'>('registro');
  const [members, setMembers] = useState<Member[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExpressMode, setIsExpressMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dailyTotal, setDailyTotal] = useState(0);
  const [dailyCount, setDailyCount] = useState(0);

  useEffect(() => {
    if (profile?.organizationId) {
      setOrgId(profile.organizationId);
    } else if (user) {
      const fetchOrg = async () => {
        const orgs = await db.organizations.toArray();
        if (orgs.length > 0) {
          setOrgId(orgs[0].id);
        }
      };
      fetchOrg();
    }
  }, [user, profile]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ContributionForm>({
    resolver: zodResolver(contributionSchema) as any,
    defaultValues: {
      category: 'DIEZMO' as const,
      method: 'EFECTIVO' as const
    }
  });

  const loadData = async () => {
    if (!orgId) return;
    try {
      const allMembers = await getFromCacheOrSupabase<Member>('members', orgId);
      setMembers(allMembers.sort((a, b) => a.full_name.localeCompare(b.full_name)));

      const allProjects = await getFromCacheOrSupabase<Project>('projects', orgId);
      setProjects(allProjects);

      // Load daily stats from cache (instant)
      const today = new Date().toISOString().split('T')[0];
      const todayContribs = await db.contributions
        .where('organization_id').equals(orgId)
        .filter(c => c.date.startsWith(today))
        .toArray();

      setDailyTotal(todayContribs.reduce((sum, c) => sum + c.amount, 0));
      setDailyCount(todayContribs.length);

      setIsLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgId]);

  const filteredMembers = members.filter(m =>
    m.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.document_id?.includes(searchTerm)
  );

  const onSubmit = async (data: ContributionForm) => {
    if (!selectedMember || !orgId) {
      toast.warning('Por favor seleccione un miembro');
      return;
    }

    setIsSaving(true);
    try {
      const transactionId = uuidv4();
      const now = new Date().toISOString();

      // 1. Find relevant accounts (New Simplified PUC)
      const cashAccount = await db.accounts.where({ organization_id: orgId, code: '1' }).first();
      const incomeAccount = await db.accounts.where({ organization_id: orgId, code: '4' }).first();

      if (!cashAccount || !incomeAccount) {
        throw new Error('Cuentas contables no encontradas. Por favor cargue el PUC simplificado en Contabilidad.');
      }

      // 2. Create Transaction Header
      const transaction: Transaction = {
        id: transactionId,
        organization_id: orgId,
        date: now.split('T')[0],
        description: `${data.category === 'DIEZMO' ? 'Diezmo' : data.category === 'OFRENDA' ? 'Ofrenda' : 'Especial'}: ${selectedMember.full_name} (${data.method === 'EFECTIVO' ? 'Efectivo' : data.method === 'TARJETA' ? 'Tarjeta' : 'Transferencia'})${data.notes ? ` - ${data.notes}` : ''}`,
        reference_no: data.reference || null,
        type: 'ingreso',
        category_id: null,
        project_id: data.project_id || null,
        method: data.method as any,
        created_by: user?.id || 'demo',
        created_at: now,
        sync_status: 'pendiente'
      };

      // 3. Create Contribution Record
      const contribution: Contribution = {
        id: uuidv4(),
        organization_id: orgId,
        member_id: selectedMember.id,
        transaction_id: transactionId,
        category: data.category as any,
        fund_id: data.fund_id || null,
        project_id: data.project_id || null,
        amount: data.amount,
        method: data.method as any,
        date: now,
        created_at: now,
        sync_status: 'pendiente'
      };

      // 4. Create Journal Entries (Double Entry)
      const entries: JournalEntry[] = [
        {
          id: uuidv4(),
          transaction_id: transactionId,
          account_id: cashAccount.id, // Debit Asset (1)
          debit: data.amount,
          credit: 0,
          sync_status: 'pendiente'
        },
        {
          id: uuidv4(),
          transaction_id: transactionId,
          account_id: incomeAccount.id, // Credit Income (4)
          debit: 0,
          credit: data.amount,
          sync_status: 'pendiente'
        }
      ];

      // Usamos insertRecord para asegurar prioridad en la nube
      const results = await Promise.all([
        insertRecord('transactions', transaction),
        insertRecord('contributions', contribution),
        ...entries.map(e => insertRecord('journal_entries', e))
      ]);

      const hasError = results.some(r => r.error);
      if (hasError) {
        const firstError = results.find(r => r.error)?.error;
        throw firstError;
      }

      reset();
      setSelectedMember(null);
      await loadData();
      toast.success('Aporte registrado correctamente en contabilidad.');

      // Push inmediato a la nube
      if (orgId) {
        syncToSupabase(orgId);
      }
    } catch (error: any) {
      console.error('Error saving contribution:', error);
      toast.error(error.message || 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4 pb-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-1 tracking-tight">Módulo Ministerial</h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Gestión de diezmos, ofrendas y proyectos.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              toast.info('Iniciando sincronización completa...');
              try {
                await syncToSupabase(orgId);
                toast.success('Sincronización finalizada correctamente');
                loadData(); // Actualizar datos locales
              } catch (error) {
                console.error(error);
                toast.error('Error al sincronizar');
              }
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-lg text-xs font-bold transition-all border border-emerald-200 dark:border-emerald-500/20 shadow-sm h-fit"
          >
            <CloudFog className="size-4" />
            <span className="hidden sm:inline font-black uppercase tracking-widest text-[10px]">Sincronizar</span>
          </button>
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto whitespace-nowrap scrollbar-hide">
            {[
              { id: 'registro', label: 'Aportes', icon: Heart },
              { id: 'proyectos', label: 'Proyectos', icon: Target },
              { id: 'reportes', label: 'Reportes', icon: FileBarChart },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${activeTab === tab.id ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}
              >
                <tab.icon className="size-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === 'proyectos' ? (
        <ProjectManager organizationId={orgId} />
      ) : activeTab === 'reportes' ? (
        <MinisterialReports organizationId={orgId} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
          {/* Sidebar: Member List */}
          <div className="lg:col-span-4 flex flex-col min-h-0">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[400px] lg:h-[calc(100vh-280px)]">
              <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Seleccionar Miembro</p>
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                    placeholder="Filtrar por nombre o ID..."
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {isLoading ? (
                  <div className="p-6 text-center flex flex-col items-center gap-2">
                    <Loader2 className="animate-spin size-6 text-blue-500" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargando lista...</p>
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-4">
                    <div className="size-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                      <Search size={32} className="text-slate-300" />
                    </div>
                    <p className="text-xs font-bold">No se encontraron miembros</p>
                  </div>
                ) : filteredMembers.map(member => (
                  <div
                    key={member.id}
                    onClick={() => setSelectedMember(member)}
                    className={`group p-2.5 mb-1 rounded-xl cursor-pointer transition-all border-2 ${selectedMember?.id === member.id
                      ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-600/20'
                      : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`size-9 rounded-lg flex items-center justify-center font-black text-[10px] uppercase transition-colors ${selectedMember?.id === member.id
                        ? 'bg-white text-blue-600'
                        : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600'
                        }`}>
                        {member.full_name.substring(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-black truncate uppercase tracking-tight ${selectedMember?.id === member.id ? 'text-white' : 'text-slate-900 dark:text-white'
                          }`}>{member.full_name}</p>
                        <p className={`text-[10px] font-bold ${selectedMember?.id === member.id ? 'text-blue-100' : 'text-slate-400'
                          }`}>
                          ID: {member.document_id || 'SIN REGISTRO'}
                        </p>
                      </div>
                      {selectedMember?.id === member.id && (
                        <div className="ml-auto bg-white/20 p-1 rounded-full">
                          <CheckCircle2 size={14} className="text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Form */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            {/* Quick Stats Banner */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
                <div className="size-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                  <TrendingUp className="size-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Total Hoy</p>
                  <p className="text-base font-black text-slate-900 dark:text-white">$ {formatCurrency(dailyTotal)}</p>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
                <div className="size-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600">
                  <Activity className="size-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Aportes Hoy</p>
                  <p className="text-base font-black text-slate-900 dark:text-white">{dailyCount}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex-1">
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Receipt className="size-7" />
                  </div>
                  <div>
                    <h3 className="font-black text-2xl text-slate-900 dark:text-white tracking-tight uppercase">Nuevo Registro</h3>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest">
                      MIEMBRO: <span className={selectedMember ? "text-blue-600" : "text-slate-300"}>{selectedMember ? selectedMember.full_name : 'NO SELECCIONADO'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fecha Contable</p>
                  <div className="bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-700">
                    <p className="text-sm font-black text-slate-900 dark:text-white">{formatDate(new Date())}</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-6 sm:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-1">Monto del Aporte</label>
                    <div className="relative group">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-300 text-xl group-focus-within:text-blue-500 transition-colors">$</span>
                      <input
                        {...register('amount')}
                        className="w-full pl-11 pr-5 py-3 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-xl font-black focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                        placeholder="0.00"
                        step="0.01"
                        type="number"
                      />
                    </div>
                    {errors.amount && <p className="text-red-500 text-[11px] font-bold mt-1 uppercase tracking-widest ml-1">{errors.amount.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-1">Tipo de Ingreso</label>
                    <div className="grid grid-cols-1 gap-2">
                      <select
                        {...register('category')}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black uppercase tracking-tight focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none appearance-none cursor-pointer"
                      >
                        <option value="DIEZMO">Diezmo Ministerial</option>
                        <option value="OFRENDA">Ofrenda General</option>
                        <option value="ESPECIAL">Proyecto Especial</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-1">Proyecto Específico</label>
                    <select
                      {...register('project_id')}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none appearance-none cursor-pointer"
                    >
                      <option value="">Ninguno (Fondo General)</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-1">Método de Captación</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'EFECTIVO', icon: Banknote, label: 'Efectivo' },
                        { value: 'TARJETA', icon: CreditCard, label: 'Tarjeta' },
                        { value: 'TRANSFERENCIA', icon: Landmark, label: 'Transf.' },
                      ].map((method) => (
                        <label key={method.value} className="cursor-pointer">
                          <input type="radio" value={method.value} {...register('method')} className="hidden peer" />
                          <div className="flex flex-col items-center justify-center p-3 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 peer-checked:border-blue-600 peer-checked:bg-blue-600/5 peer-checked:text-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                            <method.icon className="size-5 mb-1.5" />
                            <span className="text-[10px] font-black uppercase tracking-widest">{method.label}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-1">Referencia / Folio</label>
                    <input
                      {...register('reference')}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                      placeholder="Ej. Sobrecito #124"
                      type="text"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-1">Notas Internas</label>
                    <input
                      {...register('notes')}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                      placeholder="Información adicional..."
                    />
                  </div>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="submit"
                    disabled={isSaving || !selectedMember}
                    className="flex-1 w-full bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-base uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:scale-100 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <Loader2 className="animate-spin size-6" />
                    ) : (
                      <>
                        <CheckCircle2 className="size-6" />
                        Registrar Aporte
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => { reset(); setSelectedMember(null); }}
                    className="w-full sm:w-auto px-8 py-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-black uppercase tracking-widest text-sm transition-colors"
                  >
                    Limpiar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
