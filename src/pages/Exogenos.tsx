/**
 * Página principal del módulo de Exógenas
 * Permite importar reportes de terceros y conciliar inconsistencias
 */

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useExogenosStore } from '@/store/exogenosStore';
import { Upload, AlertCircle, FileText, CheckCircle, Users, Download, Trash2, Calculator, RefreshCw } from 'lucide-react';
import { ComparisonCharts } from '@/components/exogenos/ComparisonCharts';
import { FileImporter } from '@/components/exogenos/FileImporter';
import { GeneratorTab } from '@/components/exogenos/GeneratorTab';
import { ThirdPartyTable } from '@/components/exogenos/ThirdPartyTable';
import { InconsistencyTable } from '@/components/exogenos/InconsistencyTable';
import { ExporterTab } from '@/components/exogenos/ExporterTab';
import { ProcessingModal } from '@/components/exogenos/ProcessingModal';

export default function Exogenos() {
    const { profile } = useAuthStore();
    const {
        reportes,
        inconsistencias,
        loading,
        error,
        cargarReportes,
        validarTodo,
        limpiarTodo,
        sincronizarConNube
    } = useExogenosStore();

    const [activeTab, setActiveTab] = useState<'importar' | 'generar' | 'terceros' | 'inconsistencias' | 'exportar'>('generar');

    useEffect(() => {
        if (profile?.organizationId) {
            cargarReportes(profile.organizationId);
        }
    }, [profile?.organizationId, cargarReportes]);

    const stats = {
        reportes: reportes.length,
        inconsistencias: inconsistencias.filter(i => !i.resuelto).length
    };

    return (
        <div className="space-y-6">
            <ProcessingModal />
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
                                await sincronizarConNube(profile.organizationId);
                            }
                        }}
                        disabled={loading}
                        className="inline-flex items-center px-4 py-2 bg-slate-800 text-white hover:bg-slate-900 rounded-xl transition-all font-bold text-sm shadow-md"
                    >
                        <RefreshCw className="size-4 mr-2" />
                        Sincronizar
                    </button>
                    <button
                        onClick={() => validarTodo()}
                        disabled={loading || reportes.length === 0}
                        className="inline-flex items-center px-4 py-2 border border-border bg-card text-foreground rounded-xl hover:bg-accent transition-all font-bold text-sm shadow-sm disabled:opacity-50"
                    >
                        <CheckCircle className="size-4 mr-2 text-emerald-500" />
                        Validar Todo
                    </button>
                    <button
                        onClick={async () => {
                            if (window.confirm('¿Está seguro de limpiar todos los datos de exógenos? Esta acción no se puede deshacer.') && profile?.organizationId) {
                                await limpiarTodo(profile.organizationId);
                            }
                        }}
                        disabled={loading}
                        className="inline-flex items-center px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-lg shadow-rose-500/20 transition-all font-bold text-sm disabled:opacity-50"
                    >
                        <Trash2 className="size-4 mr-2" />
                        Limpiar Datos
                    </button>
                </div>
            </div>

            {/* Metrics */}
            <ComparisonCharts />

            {/* Navigation Tabs */}
            <div className="flex items-center p-1 bg-muted rounded-xl w-fit overflow-x-auto">
                <button
                    onClick={() => setActiveTab('generar')}
                    className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'generar'
                        ? 'bg-card text-primary shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <Calculator className="size-4" />
                    1. Generar
                </button>
                <button
                    onClick={() => setActiveTab('importar')}
                    className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'importar'
                        ? 'bg-card text-primary shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <Upload className="size-4" />
                    2. Importar
                </button>
                <button
                    onClick={() => setActiveTab('terceros')}
                    className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'terceros'
                        ? 'bg-card text-primary shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <Users className="size-4" />
                    3. Terceros
                </button>
                <button
                    onClick={() => setActiveTab('inconsistencias')}
                    className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'inconsistencias'
                        ? 'bg-card text-destructive shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <AlertCircle className="size-4" />
                    4. Inconsistencias
                    <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] ${stats.inconsistencias > 0
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-muted'
                        }`}>
                        {stats.inconsistencias}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('exportar')}
                    className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'exportar'
                        ? 'bg-card text-blue-500 shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <Download className="size-4" />
                    5. Exportar
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-3 text-destructive">
                    <AlertCircle className="size-5" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {/* Content Area */}
            <div className="min-h-[400px]">
                {profile?.organizationId && (
                    <>
                        {activeTab === 'generar' && <GeneratorTab organizationId={profile.organizationId} />}
                        {activeTab === 'importar' && (
                            <FileImporter
                                organizationId={profile.organizationId}
                                onComplete={() => setActiveTab('terceros')}
                            />
                        )}
                        {activeTab === 'terceros' && <ThirdPartyTable organizationId={profile.organizationId} />}
                        {activeTab === 'inconsistencias' && <InconsistencyTable organizationId={profile.organizationId} />}
                        {activeTab === 'exportar' && <ExporterTab organizationId={profile.organizationId} />}
                    </>
                )}
            </div>
        </div>
    );
}

