import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../hooks/useTheme';
import { useSync } from '../hooks/useSync';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  PlusCircle,
  Banknote,
  Clock,
  Loader2,
  FileBarChart,
  UserCheck,
  CreditCard,
  Settings,
  Heart,
  Users,
  Target,
  Receipt
} from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import { OnboardingWizard } from '../components/onboarding/OnboardingWizard';
import { seedDefaultAccounts } from '../lib/accountSeeder';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export function Dashboard() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { user, profile } = useAuthStore();
  const { syncAll, isSyncing } = useSync();
  const [orgId, setOrgId] = useState<string>('');
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Dar un tiempo de gracia de 5 segundos al iniciar para que la sincronización traiga las cuentas
  // Esto evita que se genere un PUC por defecto si el usuario ya tiene uno en la nube.
  useEffect(() => {
    const timer = setTimeout(() => setInitialCheckDone(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  const [stats, setStats] = useState({
    income: 0,
    expense: 0,
    balance: 0,
    incomeTrend: 0,
    expenseTrend: 0,
    ar: 0,
    ap: 0,
    totalMembers: 0,
    activeProjects: 0
  });

  const organization = useLiveQuery(
    () => (orgId ? db.organizations.get(orgId) : undefined),
    [orgId]
  );
  const isChurch = organization?.type === 'IGLESIA';

  useEffect(() => {
    const fetchOrg = async () => {
      if (!user) return;

      // MEJORA: En lugar de retornar si no hay profile, esperamos un poco
      // para dar tiempo al authStore a cargar el perfil desde Supabase
      let waitedForProfile = false;
      if (!profile && !isSyncing) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const currentState = useAuthStore.getState();
        if (!currentState.profile) {
          waitedForProfile = true;
        }
      }

      let orgs = await db.organizations.toArray();
      const currentProfile = useAuthStore.getState().profile || profile;
      const profileOrgId = currentProfile?.organizationId;
      const localOrgId = orgs.find(o => o.id === profileOrgId)?.id || orgs[0]?.id;
      const isSuperAdmin = currentProfile?.role === 'SUPER_ADMIN' || user?.email === 'superadmin@cifrix.com';

      if (!isSuperAdmin && profileOrgId && (!localOrgId || localOrgId !== profileOrgId)) {
        await syncAll(profileOrgId);
        orgs = await db.organizations.toArray();
      }

      if (orgs.length > 0) {
        const preferredOrg = orgs.find(o => o.id === profileOrgId) || orgs[0];
        setOrgId(preferredOrg.id);
      } else if (!isSyncing && profileOrgId) {
        await syncAll(profileOrgId);
      } else if (!isSyncing && !profileOrgId) {
        await syncAll();
        const postSyncOrgs = await db.organizations.toArray();
        if (postSyncOrgs.length > 0) {
          setOrgId(postSyncOrgs[0].id);
        }
      }
    };
    fetchOrg();
  }, [user, profile]);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const handleOnboardingComplete = (id: string) => {
    setOrgId(id);
    setShowOnboarding(false);
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  const startOfMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0], [currentDate]);
  const endOfMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0], [currentDate]);

  const recentTransactions = useLiveQuery(
    () => {
      if (!orgId) return [];
      return db.transactions
        .where('organization_id').equals(orgId)
        .filter(tx => tx.date >= startOfMonth && tx.date <= endOfMonth)
        .reverse()
        .limit(10)
        .toArray();
    },
    [orgId, startOfMonth, endOfMonth]
  );

  const monthTransactions = useLiveQuery(
    () => {
      if (!orgId) return [];
      return db.transactions
        .where('organization_id').equals(orgId)
        .filter(tx => tx.date >= startOfMonth && tx.date <= endOfMonth)
        .toArray();
    },
    [orgId, startOfMonth, endOfMonth]
  );

  const accounts = useLiveQuery(
    () => orgId ? db.accounts.where('organization_id').equals(orgId).toArray() : [],
    [orgId]
  );

  const journalEntries = useLiveQuery(async () => {
    if (!orgId) return [];
    const txs = await db.transactions.where('organization_id').equals(orgId).toArray();
    const txIds = txs.map(t => t.id);
    return db.journal_entries.where('transaction_id').anyOf(txIds).toArray();
  }, [orgId]);

  // Auto-seed accounts if missing (con tiempo de gracia)
  useEffect(() => {
    const checkAndSeedAccounts = async () => {
      // Solo sembrar si ha pasado el tiempo de gracia, no hay sync activo, 
      // y la lista de cuentas está vacía.
      if (initialCheckDone && !isSyncing && orgId && organization && accounts !== undefined && accounts.length === 0) {
        // Verificar si hay rastro de que se borraron cuentas (significa que el usuario no las quiere)
        // o si hay algún movimiento contable (aunque no haya cuentas, lo cual sería raro, pero cautela)
        const hasDeletedRecords = await db.deleted_records
          .where('table_name')
          .equals('accounts')
          .count() > 0;

        if (!hasDeletedRecords) {
          await seedDefaultAccounts(orgId);
        }
      }
    };
    checkAndSeedAccounts();
  }, [orgId, organization, accounts, isSyncing, initialCheckDone]);

  const chartData = useMemo(() => {
    if (!orgId || !journalEntries || !accounts || !monthTransactions) return null;

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const labels = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());

    const incomeData = new Array(daysInMonth).fill(0);
    const expenseData = new Array(daysInMonth).fill(0);
    const netData = new Array(daysInMonth).fill(0);

    // Group journal entries by transaction_id for efficiency
    const entriesByTx = new Map<string, typeof journalEntries>();
    journalEntries.forEach(entry => {
      if (!entriesByTx.has(entry.transaction_id)) {
        entriesByTx.set(entry.transaction_id, []);
      }
      entriesByTx.get(entry.transaction_id)?.push(entry);
    });

    // Calculate daily totals from real data
    monthTransactions.forEach(tx => {
      const date = new Date(tx.date);
      // Correct for timezone offset to get the local day
      const day = new Date(date.getTime() + date.getTimezoneOffset() * 60000).getDate() - 1;

      const txEntries = entriesByTx.get(tx.id) || [];

      txEntries.forEach(entry => {
        const account = accounts.find(a => a.id === entry.account_id);
        if (account) {
          if (account.type === 'INGRESO') incomeData[day] += entry.credit;
          if (account.type === 'EGRESO') expenseData[day] += entry.debit;
        }
      });
    });

    // Calculate net and fill netData
    for (let i = 0; i < daysInMonth; i++) {
      netData[i] = incomeData[i] - expenseData[i];
    }

    return {
      labels,
      datasets: [
        {
          label: organization?.type === 'IGLESIA' ? 'Diezmos' : 'Ingresos',
          data: incomeData,
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: organization?.type === 'IGLESIA' ? 'Gastos' : 'Egresos',
          data: expenseData,
          borderColor: '#EF4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Neto',
          data: netData,
          borderColor: '#3B82F6',
          borderDash: [5, 5],
          fill: false,
          tension: 0.4
        }
      ]
    };
  }, [orgId, journalEntries, accounts, monthTransactions, currentDate, organization]);

  useEffect(() => {
    if (!orgId || !journalEntries || !accounts) return;

    const calculateStats = async () => {
      let totalIncome = 0;
      let totalExpense = 0;

      const transactions = await db.transactions
        .where('organization_id').equals(orgId)
        .filter(tx => tx.date >= startOfMonth && tx.date <= endOfMonth)
        .toArray();

      const txIds = new Set(transactions.map(t => t.id));

      journalEntries.forEach(entry => {
        if (txIds.has(entry.transaction_id)) {
          const account = accounts.find(a => a.id === entry.account_id);
          if (account) {
            if (account.type === 'INGRESO') totalIncome += entry.credit;
            if (account.type === 'EGRESO') totalExpense += entry.debit;
          }
        }
      });

      const [membersCount, projectsCount, invoices] = await Promise.all([
        db.members.where('organization_id').equals(orgId).count(),
        db.projects.where('organization_id').equals(orgId).filter(p => p.status === 'activo').count(),
        db.invoices.where('organization_id').equals(orgId).toArray()
      ]);

      const totalAR = invoices.filter(inv => inv.status !== 'pagada').reduce((sum, inv) => sum + inv.total, 0);
      const totalAP = 0;

      setStats({
        income: totalIncome,
        expense: totalExpense,
        balance: totalIncome - totalExpense,
        incomeTrend: 0,
        expenseTrend: 0,
        ar: totalAR,
        ap: totalAP,
        totalMembers: membersCount,
        activeProjects: projectsCount
      });
    };

    calculateStats();
  }, [orgId, journalEntries, accounts, startOfMonth, endOfMonth]);

  const getTransactionAmount = (txId: string) => {
    const entries = journalEntries?.filter(e => e.transaction_id === txId) || [];
    return entries.reduce((sum, e) => sum + Math.max(e.debit, e.credit), 0) / 2;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const quickActions = useMemo(() => {
    const actions = [
      { id: 'accounting', label: 'Transacción', icon: PlusCircle, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', hover: 'hover:border-blue-500/50 hover:bg-blue-50/30', path: '/accounting' },
      {
        id: 'invoicing',
        label: 'Facturación',
        icon: Receipt,
        color: 'text-amber-600',
        bg: 'bg-amber-100 dark:bg-amber-900/30',
        hover: 'hover:border-amber-500/50 hover:bg-amber-50/30',
        path: '/invoicing'
      },
      {
        id: 'contributions',
        label: 'Diezmos',
        icon: Heart,
        color: 'text-rose-600',
        bg: 'bg-rose-100 dark:bg-rose-900/30',
        hover: 'hover:border-rose-500/50 hover:bg-rose-50/30',
        path: '/diezmos',
        hidden: organization?.type === 'EMPRESA'
      },
      {
        id: 'members',
        label: 'Miembros',
        icon: UserCheck,
        color: 'text-emerald-600',
        bg: 'bg-emerald-100 dark:bg-emerald-900/30',
        hover: 'hover:border-emerald-500/50 hover:bg-emerald-50/30',
        path: '/members',
        hidden: organization?.type === 'EMPRESA'
      },
      { id: 'reports', label: 'Reportes', icon: FileBarChart, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30', hover: 'hover:border-indigo-500/50 hover:bg-indigo-50/30', path: '/reports' },
      { id: 'settings', label: 'Ajustes', icon: Settings, color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-900/30', hover: 'hover:border-slate-500/50 hover:bg-slate-50/30', path: '/settings' },
    ];

    return actions.filter(action => {
      if (action.hidden) return false;

      // Organization Check
      const orgModules = (organization?.settings as any)?.modules;
      if (orgModules && orgModules[action.id] === false) return false;

      // Super Admin bypass
      if (profile?.role === 'SUPER_ADMIN') return true;

      // Core modules that should always be visible
      // No more force-allowing these, as they are now configurable
      // if (action.id === 'settings' || action.id === 'invoicing' || action.id === 'accounting') return true;

      // User Permission Check
      const userModules = profile?.allowedModules;
      if (userModules && userModules[action.id] === false) return false;

      return true;
    });
  }, [organization, profile]);

  return (
    <div className="space-y-5 pb-8 animate-in fade-in duration-500">
      {!orgId && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-6 rounded-xl flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-amber-800 dark:text-amber-200">Organización no encontrada</h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                No se ha encontrado ninguna organización vinculada.
              </p>
            </div>
            <button
              onClick={() => { window.location.reload(); }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg"
            >
              <Clock className="size-4" />
              Recargar Página
            </button>
          </div>

          {/* DEBUG INFO PANEL - Solo visible en desarrollo */}
          {import.meta.env.DEV && (
            <div className="bg-black/80 text-green-400 p-4 rounded-lg font-mono text-xs overflow-auto max-h-60">
              <p className="font-bold border-b border-green-500/30 mb-2 pb-1">DIAGNÓSTICO EN VIVO (Dev Only):</p>
              <p>User ID: {user?.id || 'No user'}</p>
              <p>Email: {user?.email || 'No email'}</p>
              <p className={profile?.organizationId ? "text-green-400" : "text-red-400 font-bold"}>
                Profile Org ID: {profile?.organizationId || 'NULL (Aquí está el problema)'}
              </p>
              <p>Profile Role: {profile?.role}</p>
              <p>Local Orgs Count: {organization ? 1 : 0} (ID actual: {orgId})</p>
              <div className="mt-2 pt-2 border-t border-white/10 text-white/70">
                <p>Si Profile Org ID es NULL: El usuario no tiene vínculo en Supabase.</p>
                <p>Verifica que el correo '{user?.email}' coincida con el script SQL ejecutado.</p>
              </div>
            </div>
          )}

          <button
            onClick={() => syncAll(profile?.organizationId)}
            disabled={isSyncing || !profile?.organizationId}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSyncing ? 'Sincronizando...' : 'Forzar Sincronización Manual'}
          </button>
        </div>
      )}
      {/* Greeting & Date Picker */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-foreground mb-1 tracking-tight">
            {getGreeting()}, {user?.user_metadata?.full_name?.split(' ')[0] || 'Tesorero'} 👋
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Resumen financiero al <span className="text-foreground font-bold underline decoration-primary/30 decoration-4 underline-offset-4">{new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </p>
        </div>

        <div className="flex items-center self-start sm:self-auto gap-2 bg-card border border-border p-1.5 rounded-xl shadow-sm text-foreground">
          <button
            onClick={() => changeMonth(-1)}
            className="p-1.5 hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors"
          >
            <ChevronLeft className="size-5" />
          </button>
          <span className="text-xs sm:text-sm font-black px-4 min-w-[100px] sm:min-w-[140px] text-center capitalize tracking-wide">
            {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={() => changeMonth(1)}
            className="p-1.5 hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <div className="size-10 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="size-5" />
            </div>
            <span className="text-xs font-black text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full border border-green-100 dark:border-green-900/50">+{stats.incomeTrend}%</span>
          </div>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{isChurch ? 'Diezmos y Ofrendas' : 'Ingresos'}</p>
          <h3 className="text-xl lg:text-2xl font-black mt-2 text-foreground tabular-nums">$ {formatCurrency(stats.income)}</h3>
        </div>

        <div className="bg-card p-4 rounded-xl border border-border shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <div className="size-10 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingDown className="size-5" />
            </div>
            <span className="text-xs font-black text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-full border border-red-100 dark:border-red-900/50">{stats.expenseTrend}%</span>
          </div>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{isChurch ? 'Gastos Ministeriales' : 'Egresos'}</p>
          <h3 className="text-xl lg:text-2xl font-black mt-2 text-foreground tabular-nums">$ {formatCurrency(stats.expense)}</h3>
        </div>

        <div className="bg-card p-4 rounded-xl border-2 border-primary/50 shadow-lg shadow-primary/10 hover:shadow-xl hover:shadow-primary/20 transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 -mr-8 -mt-8 rounded-full blur-2xl"></div>
          <div className="flex items-center justify-between mb-3 relative z-10">
            <div className="size-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Wallet className="size-5" />
            </div>
            <span className="text-xs font-black text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full border border-blue-100 dark:border-blue-900/50">Actualizado</span>
          </div>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider relative z-10">{isChurch ? 'Tesorería Neta' : 'Balance Neto'}</p>
          <h3 className="text-xl lg:text-2xl font-black mt-2 text-primary tabular-nums relative z-10">$ {formatCurrency(stats.balance)}</h3>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <div className="size-10 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="size-5" />
            </div>
            <span className="text-xs font-black text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full border border-amber-100 dark:border-amber-900/50">Pendientes</span>
          </div>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Por Cobrar/Pagar</p>
          <h3 className="text-xl lg:text-2xl font-black mt-2 text-foreground tabular-nums">
            $ {formatCurrency(stats.ar - stats.ap)}
          </h3>
        </div>
      </div>

      {/* Church Specific Stats */}
      {isChurch && (
        <>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Heart className="text-rose-500" />
            Panel Ministerial
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div className="bg-blue-600 p-5 rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-between text-white relative overflow-hidden group">
              <div className="relative z-10">
                <p className="text-blue-100 text-xs font-black uppercase tracking-widest mb-1">Membresía Total</p>
                <h3 className="text-2xl font-black">{stats.totalMembers} <span className="text-sm font-bold text-blue-200">fieles</span></h3>
                <button onClick={() => navigate('/members')} className="mt-4 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-xs font-black transition-all">Ver Directorio</button>
              </div>
              <Users className="size-24 text-white/10 absolute -right-4 -bottom-4 group-hover:scale-110 transition-transform" />
            </div>

            <div className="bg-slate-900 p-5 rounded-xl shadow-lg shadow-slate-900/20 flex items-center justify-between text-white relative overflow-hidden group">
              <div className="relative z-10">
                <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">Control de Diezmos</p>
                <h3 className="text-2xl font-black">{stats.activeProjects} <span className="text-sm font-bold text-slate-500">metas activas</span></h3>
                <button onClick={() => navigate('/diezmos')} className="mt-4 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-xs font-black transition-all">Gestionar Diezmos</button>
              </div>
              <Target className="size-24 text-white/5 absolute -right-4 -bottom-4 group-hover:scale-110 transition-transform" />
            </div>
          </div>
        </>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Chart Area */}
        <div className="lg:col-span-8 space-y-5">
          <div className="bg-card p-4 sm:p-5 rounded-xl border border-border shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h4 className="font-bold text-lg text-foreground">{isChurch ? 'Comportamiento de Diezmos' : 'Flujo de Efectivo'}</h4>
                <p className="text-xs text-slate-500">{isChurch ? 'Tendencia de ofrendas y gastos mensuales' : 'Comparativa diaria de ingresos y egresos'}</p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-green-500"></span>
                  <span className="text-[10px] font-bold uppercase text-slate-400">{isChurch ? 'Entradas' : 'Ingresos'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-red-500"></span>
                  <span className="text-[10px] font-bold uppercase text-slate-400">{isChurch ? 'Salidas' : 'Egresos'}</span>
                </div>
              </div>
            </div>

            <div className="h-64 lg:h-72 w-full">
              {chartData && (
                <Line
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: '#1e293b',
                        titleFont: { size: 12, weight: 'bold' },
                        bodyFont: { size: 12 },
                        padding: 12,
                        cornerRadius: 8,
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        grid: { color: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
                        ticks: { font: { size: 10 }, callback: (val) => `$${val}` }
                      },
                      x: {
                        grid: { display: false },
                        ticks: { font: { size: 10 } }
                      }
                    }
                  }}
                />
              )}
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={() => navigate(action.path)}
                className={`flex flex-col items-center justify-center p-3 lg:p-4 bg-card border border-border rounded-xl transition-all group ${action.hover}`}
              >
                <div className={`size-11 lg:size-12 ${action.bg} ${action.color} rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 group-hover:rotate-3 transition-transform`}>
                  <action.icon className="size-5 lg:size-6" />
                </div>
                <span className="text-xs lg:text-sm font-black text-muted-foreground uppercase tracking-tight">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Activity Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-card p-5 rounded-xl border border-border shadow-sm h-full flex flex-col hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-5">
              <h4 className="font-black text-lg text-foreground tracking-tight">Últimos Movimientos</h4>
              <button
                onClick={() => navigate('/accounting')}
                className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg transition-colors"
              >
                Ver todo
              </button>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto max-h-[450px] pr-2 custom-scrollbar">
              {!recentTransactions || recentTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="size-16 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4 border border-dashed border-slate-200 dark:border-slate-700">
                    <Clock className="size-8 text-slate-300 dark:text-slate-600" />
                  </div>
                  <p className="text-slate-400 text-sm font-medium">No hay actividad reciente</p>
                </div>
              ) : (
                recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center gap-4 p-4 rounded-xl hover:bg-muted/50 transition-all group border border-transparent hover:border-border">
                    <div className={`size-11 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform ${tx.type === 'ingreso' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-red-100 dark:bg-red-900/30 text-red-600'}`}>
                      {tx.type === 'ingreso' ? <TrendingUp className="size-5" /> : <TrendingDown className="size-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate text-foreground group-hover:text-primary transition-colors">{tx.description}</p>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">{formatDate(tx.date)}</p>
                    </div>
                    <p className={`text-sm font-black tabular-nums ${tx.type === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.type === 'ingreso' ? '+' : '-'}$ {formatCurrency(getTransactionAmount(tx.id))}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-border">
              <div className="bg-gradient-to-br from-muted/50 to-card p-5 rounded-2xl border border-border relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 -mr-4 -mt-4 rounded-full blur-xl group-hover:bg-primary/10 transition-colors"></div>
                <p className="text-[10px] font-black text-muted-foreground mb-4 uppercase tracking-[0.2em]">Sincronización Local</p>
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <div className={`size-2.5 rounded-full shadow-[0_0_12px_rgba(34,197,94,0.4)] ${isSyncing ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`}></div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-black tracking-tight">Estado: {isSyncing ? 'Sincronizando' : 'Conectado'}</p>
                  </div>
                  <button
                    onClick={() => syncAll()}
                    disabled={isSyncing}
                    className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all ${isSyncing ? 'text-slate-400 border-slate-200 dark:border-slate-800' : 'text-blue-600 border-blue-100 dark:border-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 active:scale-95'}`}
                  >
                    {isSyncing ? '...' : 'Sync'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showOnboarding && (
        <OnboardingWizard
          onComplete={handleOnboardingComplete}
        />
      )}
    </div>
  );
}
