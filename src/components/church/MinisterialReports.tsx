import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Target, 
  Download,
  Calendar,
  Filter,
  PieChart,
  UserCheck
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title 
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

interface MinisterialReportsProps {
  organizationId: string;
}

export function MinisterialReports({ organizationId }: MinisterialReportsProps) {
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const contributions = useLiveQuery(
    () => {
      if (!organizationId) return [];
      return db.contributions
        .where('organization_id').equals(organizationId)
        .filter(c => {
          const d = (c.date || '').substring(0, 10); // YYYY-MM-DD
          return d >= dateRange.start && d <= dateRange.end;
        })
        .toArray();
    },
    [organizationId, dateRange]
  );

  const members = useLiveQuery(() => db.members.where('organization_id').equals(organizationId).toArray(), [organizationId]);
  const projects = useLiveQuery(() => db.projects.where('organization_id').equals(organizationId).toArray(), [organizationId]);

  const stats = useMemo(() => {
    if (!contributions || !members || !projects) return null;

    const totalIncome = contributions.reduce((sum, c) => sum + c.amount, 0);
    const byCategory = {
      DIEZMO: contributions.filter(c => c.category === 'DIEZMO').reduce((sum, c) => sum + c.amount, 0),
      OFRENDA: contributions.filter(c => c.category === 'OFRENDA').reduce((sum, c) => sum + c.amount, 0),
      ESPECIAL: contributions.filter(c => c.category === 'ESPECIAL').reduce((sum, c) => sum + c.amount, 0),
    };

    const activeMembers = members.filter(m => m.status === 'activo').length;
    const projectProgress = projects.map(p => {
      const raised = contributions.filter(c => c.project_id === p.id).reduce((sum, c) => sum + c.amount, 0);
      return {
        ...p,
        raised,
        percent: p.target_amount > 0 ? Math.round((raised / p.target_amount) * 100) : 0
      };
    });

    return {
      totalIncome,
      byCategory,
      activeMembers,
      totalMembers: members.length,
      projectProgress
    };
  }, [contributions, members, projects]);

  const pieData = {
    labels: ['Diezmos', 'Ofrendas', 'Especiales'],
    datasets: [{
      data: [stats?.byCategory.DIEZMO || 0, stats?.byCategory.OFRENDA || 0, stats?.byCategory.ESPECIAL || 0],
      backgroundColor: ['#3B82F6', '#10B981', '#F59E0B'],
      borderWidth: 0,
    }]
  };

  const barData = {
    labels: stats?.projectProgress.map(p => p.name.substring(0, 15) + '...') || [],
    datasets: [
      {
        label: 'Recaudado',
        data: stats?.projectProgress.map(p => p.raised) || [],
        backgroundColor: '#3B82F6',
      },
      {
        label: 'Meta',
        data: stats?.projectProgress.map(p => p.target_amount) || [],
        backgroundColor: '#E2E8F0',
      }
    ]
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-slate-400" />
            <input 
              type="date" 
              value={dateRange.start}
              onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="bg-transparent border-none text-sm font-bold focus:ring-0 outline-none" 
            />
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={dateRange.end}
              onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="bg-transparent border-none text-sm font-bold focus:ring-0 outline-none" 
            />
          </div>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
          <Download size={16} /> Exportar PDF
        </button>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ingresos Totales</p>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">$ {formatCurrency(stats?.totalIncome || 0)}</h3>
          <div className="mt-2 flex items-center gap-1 text-green-600 text-xs font-bold">
            <TrendingUp size={14} /> Periodo Seleccionado
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Membresía Activa</p>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">{stats?.activeMembers} / {stats?.totalMembers}</h3>
          <div className="mt-2 flex items-center gap-1 text-blue-600 text-xs font-bold">
            <UserCheck size={14} /> Miembros Registrados
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Promedio Aporte</p>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">$ {formatCurrency((stats?.totalIncome || 0) / (contributions?.length || 1))}</h3>
          <div className="mt-2 flex items-center gap-1 text-amber-600 text-xs font-bold">
            <BarChart3 size={14} /> Por Transacción
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Proyectos Activos</p>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">{stats?.projectProgress.filter(p => p.status === 'activo').length}</h3>
          <div className="mt-2 flex items-center gap-1 text-purple-600 text-xs font-bold">
            <Target size={14} /> Campañas en Curso
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Category Breakdown */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h4 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
              <PieChart size={20} className="text-blue-600" /> Distribución de Ingresos
            </h4>
          </div>
          <div className="h-64 flex items-center justify-center">
            <Pie data={pieData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
          </div>
          <div className="mt-8 space-y-3">
            {Object.entries(stats?.byCategory || {}).map(([cat, amount]) => (
              <div key={cat} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <span className="text-sm font-bold text-slate-600 dark:text-slate-400 capitalize">{cat.toLowerCase()}s</span>
                <span className="text-sm font-black text-slate-900 dark:text-white">$ {formatCurrency(amount)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Project Progress */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h4 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Target size={20} className="text-blue-600" /> Avance de Proyectos
            </h4>
          </div>
          <div className="space-y-6">
            {stats?.projectProgress.map(project => (
              <div key={project.id} className="space-y-2">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-sm font-black text-slate-900 dark:text-white">{project.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Meta: $ {formatCurrency(project.target_amount)}</p>
                  </div>
                  <span className="text-sm font-black text-blue-600">{project.percent}%</span>
                </div>
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-1000" 
                    style={{ width: `${Math.min(project.percent, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-bold text-slate-500">
                  <span>Recaudado: $ {formatCurrency(project.raised)}</span>
                  <span>Faltante: $ {formatCurrency(Math.max(0, project.target_amount - project.raised))}</span>
                </div>
              </div>
            ))}
            {stats?.projectProgress.length === 0 && (
              <div className="text-center py-20 text-slate-400">
                <Target size={48} className="mx-auto opacity-20 mb-4" />
                <p className="font-bold">No hay proyectos registrados para este periodo.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
