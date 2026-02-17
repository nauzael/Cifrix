import { AlertCircle, CheckCircle } from 'lucide-react';
import { useExogenosStore } from '@/store/exogenosStore';

interface InconsistencyTableProps {
    organizationId: string;
}

export const InconsistencyTable = ({ organizationId }: InconsistencyTableProps) => {
    const { inconsistencias, reportes, resolverInconsistencia } = useExogenosStore();

    const handleResolver = async (id: string) => {
        const comentario = prompt('Ingrese una explicación para la resolución de esta inconsistencia (ej: "Error de digitación", "Ajuste contable realizado"):');
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

    if (inconsistencias.length === 0) {
        return (
            <div className="bg-card rounded-2xl border border-border shadow-sm p-12 text-center text-muted-foreground min-h-[400px] flex flex-col items-center justify-center">
                <CheckCircle className="size-16 text-emerald-500/20 mb-4" />
                <h3 className="text-lg font-bold text-foreground">Todo en Orden</h3>
                <p>No se han detectado inconsistencias entre los reportes y la contabilidad.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {inconsistencias.map((inc) => {
                const reporte = reportes.find(r => r.id === inc.exogeno_id);
                const isResolved = inc.resuelto;

                return (
                    <div key={inc.id} className={`p-6 rounded-2xl border transition-all ${isResolved
                        ? 'bg-muted/50 border-border opacity-60'
                        : 'bg-card border-destructive/20 shadow-sm hover:border-destructive/40'
                        }`}>
                        <div className="flex flex-col md:flex-row items-start justify-between gap-6">
                            <div className="flex items-start gap-4 flex-1">
                                <div className={`p-3 rounded-xl flex-shrink-0 ${isResolved ? 'bg-muted text-muted-foreground' : 'bg-destructive/10 text-destructive'
                                    }`}>
                                    <AlertCircle className="size-6" />
                                </div>
                                <div className="space-y-4 flex-1">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-bold text-foreground text-lg">{reporte?.nombre_contribuyente || 'Desconocido'}</h4>
                                            <span className="text-xs px-2 py-0.5 bg-muted rounded text-muted-foreground font-mono">{reporte?.nit_contribuyente}</span>
                                        </div>
                                        <p className="text-sm text-foreground font-medium">{inc.notas}</p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-xl border border-border/50">
                                        <div>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Concepto</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-bold text-foreground">{reporte?.concepto || 'N/A'}</p>
                                                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">Exógena</span>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Valor Reportado (Exógena)</p>
                                            <p className="text-lg font-bold text-foreground">{formatMoney(reporte?.monto || 0)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Valor Contabilidad (Balance)</p>
                                            {/* Si la diferencia es positiva, contab = reporte - dif. Si es negativa, ??. Asumimos valor absoluto en diferencia. */}
                                            {/* Mejor mostrar: Reportado - Diferencia = Contabilidad Aprox */}
                                            <p className="text-lg font-bold text-blue-600">
                                                {formatMoney((reporte?.monto || 0) - (inc.diferencia_monto || 0))}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Diferencia Detectada</p>
                                            <p className="text-lg font-bold text-destructive">{formatMoney(inc.diferencia_monto || 0)}</p>
                                        </div>
                                    </div>

                                    {isResolved && inc.notas && (
                                        <div className="mt-2 text-xs text-muted-foreground">
                                            <span className="font-bold text-foreground">Resolución:</span> {inc.notas}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {!isResolved && (
                                <button
                                    onClick={() => handleResolver(inc.id)}
                                    className="px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex-shrink-0 whitespace-nowrap"
                                >
                                    Resolver Inconsistencia
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
