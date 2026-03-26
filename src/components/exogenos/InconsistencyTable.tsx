import { useState } from 'react';
import { AlertCircle, CheckCircle, X, Save, List, Check } from 'lucide-react';
import { useExogenosStore } from '@/store/exogenosStore';
import { MapeoInconsistencia } from '@/lib/db';
import { toast } from '@/store/toastStore';
import { getFormatById } from '@/lib/exogenos/mappings';
import { ExogenosValidator } from '@/lib/exogenos';

interface InconsistencyTableProps {
    organizationId: string;
}

export const InconsistencyTable = ({ organizationId }: InconsistencyTableProps) => {
    const { inconsistencias, reportes, resolverInconsistencia, balanceLines } = useExogenosStore();
    const [selectedInconsistency, setSelectedInconsistency] = useState<MapeoInconsistencia | null>(null);
    const [resolutionNote, setResolutionNote] = useState('');
    const [adjustedValue, setAdjustedValue] = useState<string>('');

    const handleOpenResolve = (inc: MapeoInconsistencia) => {
        const reporte = reportes.find(r => r.id === inc.exogeno_id);
        setSelectedInconsistency(inc);
        // Pre-llenar con valores sugeridos o vacíos
        const valorReportado = reporte?.monto || 0;
        const valorDiferencia = inc.diferencia_monto || 0;
        const valorContable = valorReportado - valorDiferencia;

        setAdjustedValue(valorContable.toString());
        setResolutionNote('');
    };

    const handleCloseResolve = () => {
        setSelectedInconsistency(null);
        setResolutionNote('');
        setAdjustedValue('');
    };

    const handleConfirmResolve = async () => {
        if (!selectedInconsistency) return;

        if (!resolutionNote.trim()) {
            toast.error('Debe ingresar una nota de resolución.');
            return;
        }

        const notaFinal = `[Ajuste propuesto: ${formatMoney(parseFloat(adjustedValue) || 0)}] ${resolutionNote}`;

        await resolverInconsistencia(selectedInconsistency.id, notaFinal);
        toast.success('Inconsistencia resuelta correctamente.');
        handleCloseResolve();
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
                const valorReportado = reporte?.monto || 0;
                const diferencia = inc.diferencia_monto || 0;
                // Asumiendo que diferencia = reporte - contabilidad (o viceversa, ajustaremos logica)
                // Si la logica es: Diferencia = Reportado - Contabilidad
                // Entonces Contabilidad = Reportado - Diferencia
                const valorContable = valorReportado - diferencia;

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
                                        <p className="text-sm text-muted-foreground font-medium mb-2">
                                            {reporte?.concepto ? `Concepto: ${reporte.concepto}` : 'Sin concepto especificado'}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-xl border border-border/50">
                                        <div>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Valor Reportado (Exógena)</p>
                                            <p className="text-lg font-bold text-foreground">{formatMoney(valorReportado)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Valor Contabilidad (Balance)</p>
                                            <p className="text-lg font-bold text-blue-600">{formatMoney(valorContable)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Diferencia Detectada</p>
                                            <p className="text-lg font-bold text-destructive">{formatMoney(diferencia)}</p>
                                        </div>
                                    </div>

                                    {isResolved && inc.notas && (
                                        <div className="mt-2 text-xs text-emerald-600 bg-emerald-50 p-2 rounded border border-emerald-100">
                                            <span className="font-bold">Resolución:</span> {inc.notas}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {!isResolved && (
                                <button
                                    onClick={() => handleOpenResolve(inc)}
                                    className="px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex-shrink-0 whitespace-nowrap"
                                >
                                    Resolver Inconsistencia
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}

            {/* Modal de Resolución */}
            {selectedInconsistency && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-border">
                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <AlertCircle className="size-5 text-primary" />
                                Resolver Inconsistencia
                            </h3>
                            <button onClick={handleCloseResolve} className="text-muted-foreground hover:text-foreground">
                                <X className="size-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="bg-muted/30 p-4 rounded-xl border border-border/50 space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Tercero:</span>
                                    <span className="font-bold text-foreground text-right">{reportes.find(r => r.id === selectedInconsistency.exogeno_id)?.nombre_contribuyente}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">NIT:</span>
                                    <span className="font-mono text-foreground text-right">{reportes.find(r => r.id === selectedInconsistency.exogeno_id)?.nit_contribuyente}</span>
                                </div>
                                <div className="h-px bg-border/50 my-2"></div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-destructive">Diferencia a justificar:</span>
                                    <span className="text-lg font-bold text-destructive">{formatMoney(selectedInconsistency.diferencia_monto || 0)}</span>
                                </div>
                            </div>

                            {/* Desglose del Balance */}
                            <div className="space-y-3">
                                <label className="text-sm font-bold text-foreground flex items-center gap-2">
                                    <List className="size-4 text-blue-500" />
                                    Detalle del Balance (Cuentas relacionadas)
                                </label>
                                <div className="max-h-40 overflow-y-auto border border-border rounded-xl divide-y divide-border bg-muted/5">
                                    {(() => {
                                        const reporte = reportes.find(r => r.id === selectedInconsistency.exogeno_id);
                                        const mapping = getFormatById(reporte?.tipo_exogeno || '');
                                        const nitTarget = ExogenosValidator.normalizeNit(reporte?.nit_contribuyente || '');

                                        const relevant = balanceLines.filter(line => {
                                            const nitLine = ExogenosValidator.normalizeNit(line.nit_tercero);
                                            const matchesNit = nitLine === nitTarget;
                                            const matchesPUC = mapping
                                                ? mapping.prefijosPuc.some(p => line.cuenta.startsWith(p))
                                                : true;
                                            return matchesNit && matchesPUC;
                                        });

                                        if (relevant.length === 0) {
                                            return <p className="p-4 text-xs text-muted-foreground text-center italic">No se encontraron líneas individuales en el balance para este NIT y formato.</p>;
                                        }

                                        return relevant.map(line => (
                                            <div
                                                key={line.id}
                                                className="p-3 flex items-center justify-between hover:bg-muted/50 cursor-pointer transition-colors group"
                                                onClick={() => {
                                                    setAdjustedValue(line.saldo.toString());
                                                    setResolutionNote(prev => prev || `Referenciado a cuenta ${line.cuenta}`);
                                                }}
                                            >
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-foreground">Cuenta {line.cuenta}</span>
                                                    <span className="text-[10px] text-muted-foreground">{line.nombre_tercero || 'Tercero en Balance'}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="text-right">
                                                        <p className="text-xs font-mono font-bold text-blue-600">{formatMoney(line.saldo)}</p>
                                                        <p className="text-[9px] text-muted-foreground">D: {formatMoney(line.debito)} | C: {formatMoney(line.credito)}</p>
                                                    </div>
                                                    <div className="size-6 rounded-full border border-border flex items-center justify-center group-hover:border-primary group-hover:text-primary">
                                                        <Check className="size-3" />
                                                    </div>
                                                </div>
                                            </div>
                                        ));
                                    })()}
                                </div>
                                <p className="text-[10px] text-muted-foreground">Haga clic en una cuenta para usar su saldo individual como valor de ajuste.</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-bold text-foreground mb-1 block">Ajuste Contable (Valor Real)</label>
                                    <p className="text-xs text-muted-foreground mb-2">Edite este valor si el error estaba en el reporte o en la contabilidad.</p>
                                    <input
                                        type="number"
                                        className="w-full bg-background border border-border rounded-xl px-4 py-2 text-foreground focus:ring-2 focus:ring-primary/20 outline-none font-mono"
                                        value={adjustedValue}
                                        onChange={(e) => setAdjustedValue(e.target.value)}
                                        placeholder="0"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-bold text-foreground mb-1 block">Nota de Resolución</label>
                                    <textarea
                                        className="w-full bg-background border border-border rounded-xl px-4 py-2 text-foreground focus:ring-2 focus:ring-primary/20 outline-none resize-none h-24"
                                        placeholder="Explique la causa de la diferencia y la acción tomada (ej: 'Error de digitación en factura #123', 'Se ajusta contabilidad al valor real')..."
                                        value={resolutionNote}
                                        onChange={(e) => setResolutionNote(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-border bg-muted/10 flex justify-end gap-3 rounded-b-2xl">
                            <button
                                onClick={handleCloseResolve}
                                className="px-4 py-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmResolve}
                                className="px-6 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                            >
                                <Save className="size-4" />
                                Guardar Resolución
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
