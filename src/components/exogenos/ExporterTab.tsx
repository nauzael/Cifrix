import { FileText, Download, Loader2 } from 'lucide-react';
import { useExogenosStore } from '@/store/exogenosStore';
import { exogenosExporter } from '@/lib/exogenos/exporter';
import { toast } from '@/store/toastStore';
import { saveAs } from 'file-saver';

interface ExporterTabProps {
    organizationId: string;
}

export const ExporterTab = ({ organizationId }: ExporterTabProps) => {
    const { reportes, loading } = useExogenosStore();

    // Filter out only validated if needed? For now export all
    // const validReportes = reportes.filter(r => r.validado);

    const handleExportXML = async (formato: number) => {
        try {
            const xmlContent = await exogenosExporter.exportToXML(reportes, formato);
            const blob = new Blob([xmlContent], { type: "text/xml;charset=iso-8859-1" });
            saveAs(blob, `Exogena_${formato}_${new Date().getFullYear()}.xml`);
            toast.success(`Exportación XML exitosa: Archivo formato ${formato} descargado.`);
        } catch (error) {
            console.error(error);
            toast.error('Error al exportar XML: Verifique que existan datos generados.');
        }
    };

    const handleExportExcel = () => {
        try {
            exogenosExporter.exportToExcel(reportes, `Reporte_Exogena_${new Date().getFullYear()}.xlsx`);
            toast.success('Exportación Excel exitosa');
        } catch (error) {
            console.error(error);
            toast.error('Error al exportar Excel');
        }
    };

    return (
        <div className="bg-card rounded-2xl p-8 border border-border shadow-sm">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Download className="size-5 text-blue-500" />
                Exportar Reportes
            </h2>
            <p className="text-muted-foreground mb-6 text-sm">
                Descargue los archivos finales para presentación ante la DIAN o para revisión interna.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                <div className="p-4 bg-muted/30 border border-border rounded-xl space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                            <FileText className="size-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-foreground">Formato 1001 (XML)</h3>
                            <p className="text-xs text-muted-foreground">Pagos y Retenciones</p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleExportXML(1001)}
                        disabled={loading || reportes.length === 0}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm font-bold text-xs transition-all disabled:opacity-50"
                    >
                        Descargar XML
                    </button>
                </div>

                <div className="p-4 bg-muted/30 border border-border rounded-xl space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg">
                            <FileText className="size-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-foreground">Formato 1007 (XML)</h3>
                            <p className="text-xs text-muted-foreground">Ingresos Recibidos</p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleExportXML(1007)}
                        disabled={loading || reportes.length === 0}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm font-bold text-xs transition-all disabled:opacity-50"
                    >
                        Descargar XML
                    </button>
                </div>

                <div className="p-4 bg-muted/30 border border-border rounded-xl space-y-4 md:col-span-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-lg">
                            <FileText className="size-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-foreground">Excel de Trabajo</h3>
                            <p className="text-xs text-muted-foreground">Reporte completo para auditoría</p>
                        </div>
                    </div>
                    <button
                        onClick={handleExportExcel}
                        disabled={loading || reportes.length === 0}
                        className="w-full py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg shadow-sm font-bold text-xs transition-all disabled:opacity-50"
                    >
                        Descargar Excel
                    </button>
                </div>
            </div>
        </div>
    );
};
