/**
 * Página principal del módulo de Exógenas
 * Permite importar reportes de terceros y conciliar inconsistencias
 */

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useExogenosStore } from '@/store/exogenosStore';
import { Upload, AlertCircle, FileText, CheckCircle, Search, Filter, Trash2, Calculator } from 'lucide-react';
import { toast } from '@/store/toastStore';
import { ComparisonCharts } from '@/components/exogenos/ComparisonCharts';

export default function Exogenos() {
    const { profile } = useAuthStore();
    const {
        reportes,
        inconsistencias,
        loading,
        error,
        cargarReportes,
        importarArchivo,
        validarTodo,
        resolverInconsistencia,
        eliminarReporte,
        generarDesdeContabilidad,
        limpiarTodo
    } = useExogenosStore();

    const [filter, setFilter] = useState('');
    const [activeTab, setActiveTab] = useState<'reportes' | 'inconsistencias'>('reportes');

    useEffect(() => {
        if (profile?.organizationId) {
            cargarReportes(profile.organizationId);
        }
    }, [profile?.organizationId, cargarReportes]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !profile?.organizationId) return;

        try {
            await importarArchivo(file, profile.organizationId);
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
        r.nombre_contribuyente.toLowerCase().includes(filter.toLowerCase()) ||
        r.nit_contribuyente.includes(filter)
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-2xl shadow-sm border border-border">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Reportes Exógenos</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Gestiona información de terceros y concilia discrepancias fiscales
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={async () => {
                            if (profile?.organizationId) {
                                const year = new Date().getFullYear();
                                await generarDesdeContabilidad(profile.organizationId, year);
                            }
                        }}
                        disabled={loading}
                        className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/20 transition-all font-bold text-sm disabled:opacity-50"
                    >
                        <Calculator className="size-4 mr-2" />
                        Generar desde Contabilidad
                    </button>
                    <label className="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/20 transition-all font-bold text-sm">
                        <Upload className="size-4 mr-2" />
                        Importar XML/CSV
                        <input type="file" className="hidden" accept=".xml,.csv" onChange={handleFileUpload} />
                    </label>
                    <button
                        onClick={() => validarTodo()}
                        disabled={loading || reportes.length === 0}
                        className="inline-flex items-center px-4 py-2 border border-border bg-card text-foreground rounded-xl hover:bg-accent transition-all font-bold text-sm shadow-sm disabled:opacity-50"
                    >
                        <CheckCircle className="size-4 mr-2 text-emerald-500" />
                        Validar Todo
                    </button>
                    {(reportes.length > 0 || inconsistencias.length > 0) && (
                        <button
                            onClick={async () => {
                                if (confirm('¿Está seguro de limpiar todos los datos de exógenos? Esta acción no se puede deshacer y borrará también las validaciones.') && profile?.organizationId) {
                                    await limpiarTodo(profile.organizationId);
                                }
                            }}
                            disabled={loading}
                            className="inline-flex items-center px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-xl transition-all font-bold text-sm disabled:opacity-50"
                        >
                            <Trash2 className="size-4 mr-2" />
                            Limpiar Datos
                        </button>
                    )}
                </div>
            </div>

            {/* Metrics */}
            <ComparisonCharts />

            {/* Tabs */}
            <div className="flex items-center p-1 bg-muted rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('reportes')}
                    className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'reportes'
                        ? 'bg-card text-primary shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    Reportes de Terceros
                    <span className="ml-2 px-2 py-0.5 bg-muted rounded-md text-[10px]">
                        {reportes.length}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('inconsistencias')}
                    className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'inconsistencias'
                        ? 'bg-card text-destructive shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    Inconsistencias
                    <span className={`ml-2 px-2 py-0.5 rounded-md text-[10px] ${inconsistencias.some(i => !i.resuelto)
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-muted'
                        }`}>
                        {inconsistencias.filter(i => !i.resuelto).length}
                    </span>
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-3 text-destructive">
                    <AlertCircle className="size-5" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {/* Main Content */}
            <div className="bg-card rounded-2xl shadow-sm border border-border min-h-[400px]">
                {/* Toolbar */}
                <div className="p-4 border-b border-border flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Buscar por NIT o nombre..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-muted/50 border-none rounded-xl focus:ring-2 focus:ring-primary text-sm transition-all"
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
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Tercero</th>
                                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Concepto</th>
                                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Tipo</th>
                                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Valor Reportado</th>
                                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">Cargando datos...</td>
                                    </tr>
                                ) : filteredReportes.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center">
                                                <FileText className="size-10 text-muted-foreground/30 mb-4" />
                                                <p>No se encontraron reportes</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredReportes.map((reporte) => (
                                        <tr key={reporte.id} className="hover:bg-accent transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-foreground text-sm">{reporte.nombre_contribuyente}</div>
                                                <div className="text-muted-foreground text-xs font-medium uppercase tracking-tight">{reporte.nit_contribuyente}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-medium text-muted-foreground">{reporte.concepto}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary">
                                                    {reporte.tipo_exogeno}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-sm font-bold text-foreground">{formatMoney(reporte.monto)}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => eliminarReporte(reporte.id)}
                                                    className="p-2 text-muted-foreground hover:text-destructive transition-colors"
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
                            <div className="py-12 text-center text-muted-foreground">
                                <CheckCircle className="size-10 text-emerald-500/30 mx-auto mb-4" />
                                <p>No se han detectado inconsistencias</p>
                            </div>
                        ) : (
                            inconsistencias.map((inc) => (
                                <div key={inc.id} className={`p-4 rounded-2xl border transition-all ${inc.resuelto
                                    ? 'bg-muted border-border opacity-70'
                                    : 'bg-card border-destructive/30'
                                    }`}>
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className={`p-3 rounded-xl ${inc.resuelto ? 'bg-muted text-muted-foreground' : 'bg-destructive/10 text-destructive'
                                                }`}>
                                                <AlertCircle className="size-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-foreground mb-1">{inc.notas}</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                                                    <div>
                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Monto Tercero</p>
                                                        <p className="text-sm font-bold text-foreground">{formatMoney(reportes.find(r => r.id === inc.exogeno_id)?.monto || 0)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Estado</p>
                                                        <p className="text-sm font-bold text-foreground">{inc.estado_validacion}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Diferencia</p>
                                                        <p className="text-sm font-bold text-destructive">{formatMoney(inc.diferencia_monto || 0)}</p>
                                                    </div>
                                                </div>
                                                {inc.resuelto && inc.notas && (
                                                    <div className="mt-4 p-3 bg-primary/10 text-primary rounded-xl text-xs font-medium border border-primary/20">
                                                        <strong>Resolución:</strong> {inc.notas}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {!inc.resuelto && (
                                            <button
                                                onClick={() => handleResolver(inc.id)}
                                                className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
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
