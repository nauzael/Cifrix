/**
 * Componente de gráficos comparativos para exógenas
 * Visualiza la relación entre reportes de terceros y contabilidad interna
 */

import { useExogenosStore } from '@/store/exogenosStore';
import { BarChart3, PieChart, TrendingDown, TrendingUp } from 'lucide-react';

export function ComparisonCharts() {
    const { reportes, inconsistencias } = useExogenosStore();

    const totalReportado = reportes.reduce((sum, r) => sum + r.valor_reportado, 0);
    const totalConciliado = inconsistencias
        .filter(i => i.estado === 'RESUELTO')
        .reduce((sum, i) => sum + i.valor_reportado, 0);

    const pendientesCount = inconsistencias.filter(i => i.estado === 'PENDIENTE').length;
    const resueltosCount = inconsistencias.filter(i => i.estado === 'RESUELTO').length;

    const formatMoney = (value: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0
        }).format(value);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <BarChart3 size={48} className="text-blue-600" />
                </div>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Total Reportado</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{formatMoney(totalReportado)}</p>
                <div className="mt-4 flex items-center gap-2">
                    <span className="flex items-center text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                        Terceros
                    </span>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <TrendingUp size={48} className="text-green-600" />
                </div>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Conciliado</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{formatMoney(totalConciliado)}</p>
                <div className="mt-4 flex items-center gap-2">
                    <span className="flex items-center text-[10px] font-bold text-green-600 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                        {resueltosCount} Resueltos
                    </span>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <TrendingDown size={48} className="text-red-600" />
                </div>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Discrepancias</p>
                <p className="text-2xl font-black text-red-600">{pendientesCount}</p>
                <div className="mt-4 flex items-center gap-2">
                    <span className="flex items-center text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded-full">
                        Pendientes
                    </span>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <PieChart size={48} className="text-purple-600" />
                </div>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Salud de Datos</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">
                    {reportes.length > 0 ? Math.round(((reportes.length - pendientesCount) / reportes.length) * 100) : 100}%
                </p>
                <div className="mt-4 flex items-center gap-2">
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                            className="bg-purple-600 h-full transition-all duration-1000"
                            style={{ width: `${reportes.length > 0 ? ((reportes.length - pendientesCount) / reportes.length) * 100 : 100}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
