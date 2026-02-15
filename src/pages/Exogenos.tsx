/**
 * Página principal del módulo de Exógenas
 * Permite importar reportes de terceros y conciliar inconsistencias
 */

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useExogenosStore } from '@/store/exogenosStore';
import { Upload, AlertCircle, FileText, CheckCircle, Search, Filter, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ComparisonCharts } from '@/components/exogenos/ComparisonCharts';

export default function Exogenos() {
    const { currentOrganization } = useAuthStore();
    const {
        reportes,
        inconsistencias,
        loading,
        cargarReportes,
        importarArchivo,
        validarTodo,
        resolverInconsistencia,
        eliminarReporte
    } = useExogenosStore();

    const [filter, setFilter] = useState('');
    const [activeTab, setActiveTab] = useState<'reportes' | 'inconsistencias'>('reportes');

    useEffect(() => {
        if (currentOrganization?.id) {
            cargarReportes(currentOrganization.id);
        }
    }, [currentOrganization?.id, cargarReportes]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !currentOrganization?.id) return;

        try {
            await importarArchivo(file, currentOrganization.id);
            // Reset input
            e.target.value = '';
        } catch (error) {
            console.error('Error uploading file:', error);
        }
    };

    const handleResolver = async (id: string) => {
        const comentario = prompt('Ingrese una explicación para la resolución de esta inconsistencia:');
        if (comentario) {
            await resolverInconsistencia(id, comentario);
        }
    };

    const formatMoney = (value: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(value);
    };

    const filteredReportes = reportes.filter(r =>
        r.tercero_nombre.toLowerCase().includes(filter.toLowerCase()) ||
        r.tercero_id.includes(filter)
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reportes Exógenos</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        Gestiona información de terceros y concilia discrepancias fiscales
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <label className="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/20 transition-all font-bold text-sm">
                        <Upload className="size-4 mr-2" />
                        Importar XML/CSV
                        <input type="file" className="hidden" accept=".xml,.csv" onChange={handleFileUpload} />
                    </label>
                    <button
                        onClick={() => validarTodo()}
                        disabled={loading || reportes.length === 0}
                        className="inline-flex items-center px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-750 transition-all font-bold text-sm shadow-sm disabled:opacity-50"
                    >
                        <CheckCircle className="size-4 mr-2 text-green-500" />
                        Validar Todo
                    </button>
                </div>
            </div>

            {/* Metrics */}
            <ComparisonCharts />

            {/* Tabs */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('reportes')}
                    className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'reportes'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                >
                    Reportes de Terceros
                    <span className="ml-2 px-2 py-0.5 bg-slate-200 dark:bg-slate-600 rounded-md text-[10px]">
                        {reportes.length}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('inconsistencias')}
                    className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'inconsistencias'
                        ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                >
                    Inconsistencias
                    <span className={`ml-2 px-2 py-0.5 rounded-md text-[10px] ${inconsistencias.some(i => i.estado === 'PENDIENTE')
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
                        : 'bg-slate-200 dark:bg-slate-600'
                        }`}>
                        {inconsistencias.filter(i => i.estado === 'PENDIENTE').length}
                    </span>
                </button>
            </div>

            {/* Main Content */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 min-h-[400px]">
                {/* Toolbar */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por NIT o nombre..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                            <Filter className="size-4" />
                        </button>
                    </div>
                </div>

                {activeTab === 'reportes' ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tercero</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Concepto</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tipo</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Valor Reportado</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">Cargando datos...</td>
                                    </tr>
                                ) : filteredReportes.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                            <div className="flex flex-col items-center">
                                                <FileText className="size-10 text-slate-300 mb-4" />
                                                <p>No se encontraron reportes</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredReportes.map((reporte) => (
                                        <tr key={reporte.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900 dark:text-white text-sm">{reporte.tercero_nombre}</div>
                                                <div className="text-slate-500 text-xs font-medium uppercase tracking-tight">{reporte.tercero_id}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{reporte.concepto}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${reporte.tipo_movimiento === 'INGRESO' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                    reporte.tipo_movimiento === 'EGRESO' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                    }`}>
                                                    {reporte.tipo_movimiento}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-sm font-bold text-slate-900 dark:text-white">{formatMoney(reporte.valor_reportado)}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => eliminarReporte(reporte.id)}
                                                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 className="size-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-4 space-y-4">
                        {inconsistencias.length === 0 ? (
                            <div className="py-12 text-center text-slate-500">
                                <CheckCircle className="size-10 text-green-300 mx-auto mb-4" />
                                <p>No se han detectado inconsistencias</p>
                            </div>
                        ) : (
                            inconsistencias.map((inc) => (
                                <div key={inc.id} className={`p-4 rounded-2xl border transition-all ${inc.estado === 'RESUELTO'
                                    ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-70'
                                    : 'bg-white dark:bg-slate-900 border-red-200 dark:border-red-900/30'
                                    }`}>
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className={`p-3 rounded-xl ${inc.estado === 'RESUELTO' ? 'bg-slate-200 text-slate-500' : 'bg-red-100 text-red-600'
                                                }`}>
                                                <AlertCircle className="size-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 dark:text-white mb-1">{inc.descripcion}</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Valor Reportado (Tercero)</p>
                                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{formatMoney(inc.valor_reportado)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Valor Interno (Contabilidad)</p>
                                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{formatMoney(inc.valor_contable)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Diferencia</p>
                                                        <p className="text-sm font-bold text-red-600">{formatMoney(inc.diferencia)}</p>
                                                    </div>
                                                </div>
                                                {inc.explicacion_ajuste && (
                                                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-medium border border-blue-100 dark:border-blue-900/30">
                                                        <strong>Resolución:</strong> {inc.explicacion_ajuste}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {inc.estado === 'PENDIENTE' && (
                                            <button
                                                onClick={() => handleResolver(inc.id)}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                                            >
                                                Resolver
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
