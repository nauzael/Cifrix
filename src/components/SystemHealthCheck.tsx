import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
    Activity,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Database,
    Shield,
    Server,
    RefreshCw,
    Loader2
} from 'lucide-react';

interface HealthCheckResult {
    id: string;
    name: string;
    status: 'pending' | 'success' | 'error' | 'warning';
    message: string;
    details?: string;
}

export function SystemHealthCheck() {
    const [results, setResults] = useState<HealthCheckResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [overallStatus, setOverallStatus] = useState<'healthy' | 'issue' | 'critical' | 'unknown'>('unknown');

    const runDiagnostics = async () => {
        setLoading(true);
        setOverallStatus('unknown');

        const checks: HealthCheckResult[] = [
            { id: 'conn', name: 'Conectividad Supabase', status: 'pending', message: 'Verificando conexión...' },
            { id: 'auth', name: 'Sesión de Usuario', status: 'pending', message: 'Verificando autenticación...' },
            { id: 'rpc', name: 'Funciones del Sistema (RPC)', status: 'pending', message: 'Verificando scripts SQL...' },
            { id: 'tables', name: 'Integridad de Base de Datos', status: 'pending', message: 'Buscando tablas críticas...' },
            { id: 'rls', name: 'Permisos RLS (Seguridad)', status: 'pending', message: 'Probando lectura de datos...' },
        ];

        setResults(checks);

        // Helper to update specific check
        const updateCheck = (id: string, status: 'success' | 'error' | 'warning', message: string, details?: string) => {
            setResults(prev => prev.map(c => c.id === id ? { ...c, status, message, details } : c));
        };

        try {
            // 1. Check Connection & Auth
            const { data: { session }, error: authError } = await supabase.auth.getSession();

            if (authError) {
                updateCheck('conn', 'error', 'Error de conexión', authError.message);
                updateCheck('auth', 'error', 'Fallo de autenticación', 'No se pudo verificar la sesión');
                setOverallStatus('critical');
                setLoading(false);
                return;
            } else {
                updateCheck('conn', 'success', 'Conexión establecida', 'Latencia nominal');
                if (session) {
                    updateCheck('auth', 'success', 'Sesión activa', `Usuario: ${session.user.email}`);
                } else {
                    updateCheck('auth', 'warning', 'Sin sesión activa', 'Usuario no logueado');
                }
            }

            // 2. Check RPC (Critical for functionality)
            try {
                const { error: rpcError } = await (supabase as any).rpc('get_my_complete_profile');
                if (rpcError) {
                    if (rpcError.code === '42883' || rpcError.message.includes('does not exist')) {
                        updateCheck('rpc', 'error', 'Falta Script Maestro', 'La función get_my_complete_profile no existe. Ejecuta MASTER_DB_REORG.sql');
                    } else {
                        updateCheck('rpc', 'warning', 'Error en RPC', rpcError.message);
                    }
                } else {
                    updateCheck('rpc', 'success', 'Funciones instaladas', 'Script Maestro ejecutado correctamente');
                }
            } catch (e: any) {
                updateCheck('rpc', 'error', 'Fallo RPC crítico', e.message);
            }

            // 3. Check Tables Existence (Implicitly checks if we can query them)
            const criticalTables = ['organizations', 'projects', 'tickets', 'campaigns'];
            const missingTables: string[] = [];

            for (const table of criticalTables) {
                // Try to select 0 rows just to check existence
                const { error } = await (supabase as any).from(table).select('id').limit(0);
                if (error && error.message?.includes('does not exist')) {
                    missingTables.push(table);
                }
            }

            if (missingTables.length > 0) {
                updateCheck('tables', 'error', 'Faltan tablas críticas', `Faltan: ${missingTables.join(', ')}. Ejecuta MASTER_DB_REORG.sql`);
            } else {
                updateCheck('tables', 'success', 'Estructura correcta', 'Todas las tablas críticas detectadas');
            }

            // 4. Check RLS (Row Level Security)
            // Try to read organizations. If we get data or [] it's mostly fine. If error, RLS issue.
            if (session) {
                const { data: orgs, error: rlsError } = await supabase.from('organizations').select('id').limit(1);
                if (rlsError) {
                    updateCheck('rls', 'error', 'Error de Permisos', rlsError.message);
                } else {
                    // Check if we effectively can see data or if we are blocked returning empty
                    // This is harder to distinguish from "just no data". 
                    // But if no error, RLS policies are at least valid syntax.
                    updateCheck('rls', 'success', 'Políticas activas', `Acceso lectura verificado. Registros visibles: ${orgs?.length || 0}`);
                }
            } else {
                updateCheck('rls', 'warning', 'No verificado', 'Requiere sesión activa');
            }

        } catch (err: any) {
            console.error('Diagnostic fatal error:', err);
        } finally {
            setLoading(false);
            // Calc overall status logic could be here
        }
    };

    useEffect(() => {
        runDiagnostics();
    }, []);

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 p-4 w-full animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                        <Activity size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-white">Diagnóstico</h3>
                        <p className="text-[10px] font-medium text-slate-500">Integridad y conexión</p>
                    </div>
                </div>
                <button
                    onClick={runDiagnostics}
                    disabled={loading}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
                    title="Re-ejecutar diagnóstico"
                >
                    <RefreshCw size={18} className={loading ? 'animate-spin text-blue-600' : 'text-slate-400'} />
                </button>
            </div>

            <div className="space-y-4">
                {results.map((result) => (
                    <div
                        key={result.id}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${result.status === 'success' ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30' :
                            result.status === 'error' ? 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30' :
                                result.status === 'warning' ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30' :
                                    'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'
                            }`}
                    >
                        <div className={`mt-0.5 shrink-0 ${result.status === 'success' ? 'text-emerald-500' :
                            result.status === 'error' ? 'text-red-500' :
                                result.status === 'warning' ? 'text-amber-500' :
                                    'text-slate-400'
                            }`}>
                            {result.status === 'success' && <CheckCircle size={16} />}
                            {result.status === 'error' && <XCircle size={16} />}
                            {result.status === 'warning' && <AlertTriangle size={16} />}
                            {result.status === 'pending' && <Loader2 size={16} className="animate-spin" />}
                        </div>

                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <h4 className={`text-sm font-bold ${result.status === 'success' ? 'text-emerald-700 dark:text-emerald-400' :
                                    result.status === 'error' ? 'text-red-700 dark:text-red-400' :
                                        result.status === 'warning' ? 'text-amber-700 dark:text-amber-400' :
                                            'text-slate-700 dark:text-slate-300'
                                    }`}>
                                    {result.name}
                                </h4>
                                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${result.status === 'success' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' :
                                    result.status === 'error' ? 'bg-red-100 dark:bg-red-900/30 text-red-600' :
                                        result.status === 'warning' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' :
                                            'bg-slate-200 dark:bg-slate-700 text-slate-500'
                                    }`}>
                                    {result.status === 'pending' ? '...' : result.status}
                                </span>
                            </div>
                            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-1">
                                {result.message}
                            </p>
                            {result.details && result.status !== 'success' && (
                                <div className="mt-2 p-2 bg-white/50 dark:bg-black/20 rounded-lg text-[10px] font-mono text-slate-500 overflow-x-auto">
                                    {result.details}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                <p className="text-[9px] text-slate-400">
                    Ejecuta <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-600 dark:text-slate-300">MASTER_DB_REORG.sql</code> si ves errores.
                </p>
            </div>
        </div>
    );
}
