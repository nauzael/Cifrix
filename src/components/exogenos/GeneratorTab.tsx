import { useState } from 'react';
import { Calculator, Calendar, Loader2 } from 'lucide-react';
import { useExogenosStore } from '@/store/exogenosStore';
import { toast } from '@/store/toastStore';

interface GeneratorTabProps {
    organizationId: string;
}

export const GeneratorTab = ({ organizationId }: GeneratorTabProps) => {
    const { generarDesdeContabilidad, loading } = useExogenosStore();
    const [year, setYear] = useState(new Date().getFullYear());
    const [stats, setStats] = useState<{ count: number; total: number } | null>(null);

    const handleGenerate = async () => {
        try {
            const result = await generarDesdeContabilidad(organizationId, year);
            setStats(result);
            toast.success(`Generación completada: Se generaron ${result.count} registros por valor de $${result.total.toLocaleString()}`);
        } catch (error) {
            console.error(error);
            toast.error('Error al generar: Ocurrió un error al procesar la información contable');
        }
    };

    return (
        <div className="bg-card rounded-2xl p-8 border border-border shadow-sm">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Calculator className="size-5 text-emerald-500" />
                Generar desde Contabilidad
            </h2>
            <p className="text-muted-foreground mb-6 text-sm">
                Procesa las transacciones contables del año seleccionado para generar los reportes (Formatos 1001 y 1007).
            </p>

            <div className="flex flex-col gap-6 max-w-md">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Calendar className="size-4" />
                        Año Gravable
                    </label>
                    <input
                        type="number"
                        value={year}
                        onChange={(e) => setYear(parseInt(e.target.value))}
                        className="w-full px-4 py-3 bg-muted border-none rounded-xl focus:ring-2 focus:ring-primary text-foreground font-medium"
                        min="2020"
                        max="2030"
                    />
                </div>

                <div className="p-4 bg-muted/50 rounded-xl border border-border">
                    <h3 className="font-bold text-sm mb-2">Resumen de Generación</h3>
                    {stats ? (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-muted-foreground uppercase">Registros</p>
                                <p className="text-lg font-bold text-foreground">{stats.count}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase">Valor Total</p>
                                <p className="text-lg font-bold text-emerald-600">${stats.total.toLocaleString()}</p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No se ha generado información para este periodo.</p>
                    )}
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-500/20 transition-all font-bold text-sm disabled:opacity-50 flex justify-center items-center gap-2"
                >
                    {loading ? <Loader2 className="size-4 animate-spin" /> : <Calculator className="size-4" />}
                    Generar Reporte
                </button>
            </div>
        </div>
    );
};
