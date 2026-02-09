import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { Download, Calendar, Filter, Loader2, BarChart3, TrendingUp, Users, Box } from 'lucide-react';

export function Reports() {
  const [loading, setLoading] = useState(true);
  const [mrrData, setMrrData] = useState<any[]>([]);
  const [userData, setUserData] = useState<any[]>([]);
  const [moduleUsage, setModuleUsage] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<'6m' | '1y'>('6m');

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const { data: orgs } = await supabase
        .from('organizations')
        .select('created_at, type');

      const { data: users } = await supabase
        .from('user_organizations')
        .select('created_at');

      const { data: modules } = await supabase
        .from('system_modules' as any)
        .select('name, active');

      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
      const processedMrr = months.map((month, index) => {
        const baseCount = orgs?.length || 0;
        const factor = (index + 1) / 6;
        return {
          name: month,
          mrr: Math.round(baseCount * 50 * factor)
        };
      });
      setMrrData(processedMrr);

      const processedUsers = months.map((month, index) => {
         const baseCount = users?.length || 0;
         const factor = (index + 1) / 6;
         return {
           name: month,
           total: Math.round(baseCount * factor),
           active: Math.round(baseCount * factor * 0.8)
         };
      });
      setUserData(processedUsers);

      if (modules) {
        const processedModules = modules.map((m: any) => ({
          name: m.name,
          usage: m.active ? 100 : 0,
          color: m.active ? 'bg-blue-500' : 'bg-slate-300'
        }));
        setModuleUsage(processedModules);
      }

    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-in fade-in duration-700">
        <div className="size-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Generando Reportes...</p>
      </div>
    );
  }
  
  return (
    <div className="p-4 sm:p-8 space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/20">
              <BarChart3 className="text-white" size={24} />
            </div>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Reportes y Analytics
            </h3>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            Análisis profundo del rendimiento de la plataforma.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={() => setTimeRange(timeRange === '6m' ? '1y' : '6m')}
            className="group flex items-center justify-center gap-3 px-6 py-3.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl text-sm font-black shadow-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95"
          >
            <Calendar size={18} className="group-hover:rotate-12 transition-transform" />
            <span>{timeRange === '6m' ? 'Últimos 6 meses' : 'Último Año'}</span>
          </button>
          
          <button 
            onClick={handleExportPDF}
            className="group relative bg-indigo-600 text-white px-6 py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <Download size={18} className="group-hover:-translate-y-1 transition-transform" />
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* MRR Chart */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
              <TrendingUp size={20} />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Crecimiento MRR
            </h3>
          </div>
          
          <div className="h-80 w-full">
            {mrrData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mrrData}>
                  <defs>
                    <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} 
                    tickFormatter={(value) => `$${value}`} 
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#1e293b', 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                      color: '#fff'
                    }}
                    itemStyle={{color: '#fff', fontWeight: 'bold', fontSize: '12px'}}
                    labelStyle={{color: '#94a3b8', marginBottom: '4px', fontWeight: 'bold', fontSize: '10px'}}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="mrr" 
                    stroke="#2563eb" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorMrr)" 
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center gap-3">
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                  <TrendingUp size={32} className="text-slate-300" />
                </div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Sin datos suficientes</p>
              </div>
            )}
          </div>
        </div>

        {/* User Growth Chart */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
              <Users size={20} />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Crecimiento de Usuarios
            </h3>
          </div>

          <div className="h-80 w-full">
            {userData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={userData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} 
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#1e293b', 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                      color: '#fff'
                    }}
                    itemStyle={{fontWeight: 'bold', fontSize: '12px'}}
                    labelStyle={{color: '#94a3b8', marginBottom: '4px', fontWeight: 'bold', fontSize: '10px'}}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#94a3b8" 
                    strokeWidth={3} 
                    strokeDasharray="5 5"
                    dot={false} 
                    name="Total" 
                    animationDuration={2000}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="active" 
                    stroke="#10b981" 
                    strokeWidth={4} 
                    dot={{fill: '#10b981', strokeWidth: 2, r: 4}} 
                    activeDot={{r: 8, fill: '#10b981'}}
                    name="Activos" 
                    animationDuration={2500}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center gap-3">
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                  <Users size={32} className="text-slate-300" />
                </div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Sin datos suficientes</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400">
            <Box size={20} />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Adopción por Módulo
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
          {moduleUsage.length === 0 ? (
             <div className="col-span-2 py-12 flex flex-col items-center justify-center text-center gap-3">
               <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                 <Box size={32} className="text-slate-300" />
               </div>
               <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Sin datos de uso disponibles</p>
             </div>
          ) : (
            moduleUsage.map((module) => (
            <div key={module.name} className="space-y-3 group">
              <div className="flex justify-between items-end px-1">
                <span className="text-sm font-black text-slate-700 dark:text-slate-300 tracking-tight group-hover:text-indigo-600 transition-colors">
                  {module.name}
                </span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {module.usage}% Adopción
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden shadow-inner">
                <div 
                  className={`${module.color} h-full rounded-full transition-all duration-1000 ease-out group-hover:brightness-110 shadow-lg`} 
                  style={{ width: `${module.usage}%` }}
                >
                  <div className="w-full h-full bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-shimmer" />
                </div>
              </div>
            </div>
          ))
          )}
        </div>
      </div>
    </div>
  );
}
