/**
 * Componente de gráficos comparativos para exógenas
 * Visualiza la relación entre reportes de terceros y contabilidad interna
 */

import { useExogenosStore } from '@/store/exogenosStore';
import { BarChart3, PieChart, TrendingDown, TrendingUp } from 'lucide-react';

export function ComparisonCharts() {
    const { reportes, inconsistencias } = useExogenosStore();

    const totalReportado = reportes.reduce((sum, r) => sum + r.monto, 0);
    const totalConciliado = reportes
        .filter(r => inconsistencias.some(i => i.exogeno_id === r.id && i.resuelto))
        .reduce((sum, r) => sum + r.monto, 0);

    const pendientesCount = inconsistencias.filter(i => !i.resuelto && i.estado_validacion === 'PENDIENTE').length;
    const resueltosCount = inconsistencias.filter(i => i.resuelto).length;

    const formatMoney = (value: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0
        }).format(value);
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Total Reportado */}
            <div className="bg-card p-4 rounded-xl border border-border shadow-sm group hover:border-primary/20 transition-colors">
                <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Reportado</p>
                    <BarChart3 size={16} className="text-blue-500 opacity-40 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="flex items-baseline justify-between gap-2">
                    <p className="text-lg font-black text-foreground truncate">{formatMoney(totalReportado)}</p>
                    <span className="text-[9px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-md">
                        TERCEROS
                    </span>
                </div>
            </div>

            {/* Conciliado */}
            <div className="bg-card p-4 rounded-xl border border-border shadow-sm group hover:border-emerald-500/20 transition-colors">
                <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Conciliado</p>
                    <TrendingUp size={16} className="text-emerald-500 opacity-40 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="flex items-baseline justify-between gap-2">
                    <p className="text-lg font-black text-foreground truncate">{formatMoney(totalConciliado)}</p>
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-md">
                        {resueltosCount} OK
                    </span>
                </div>
            </div>

            {/* Discrepancias */}
            <div className="bg-card p-4 rounded-xl border border-border shadow-sm group hover:border-rose-500/20 transition-colors">
                <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Discrepancias</p>
                    <TrendingDown size={16} className="text-rose-500 opacity-40 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="flex items-baseline justify-between gap-2">
                    <p className="text-lg font-black text-rose-600 truncate">{pendientesCount}</p>
                    <span className="text-[9px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-900/30 px-1.5 py-0.5 rounded-md uppercase">
                        Pendientes
                    </span>
                </div>
            </div>

            {/* Salud de Datos */}
            <div className="bg-card p-4 rounded-xl border border-border shadow-sm group hover:border-purple-500/20 transition-colors">
                <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Salud de Datos</p>
                    <PieChart size={16} className="text-purple-500 opacity-40 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="space-y-2">
                    <div className="flex items-baseline justify-between">
                        <p className="text-lg font-black text-foreground">
                            {reportes.length > 0 ? Math.round(((reportes.length - pendientesCount) / reportes.length) * 100) : 100}%
                        </p>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                        <div
                            className="bg-purple-500 h-full transition-all duration-1000"
                            style={{ width: `${reportes.length > 0 ? ((reportes.length - pendientesCount) / reportes.length) * 100 : 100}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
