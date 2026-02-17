import { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useExogenosStore } from '@/store/exogenosStore';
import { toast } from '@/store/toastStore';

interface FileImporterProps {
    organizationId: string;
}

export const FileImporter = ({ organizationId }: FileImporterProps) => {
    const { importarArchivo, loading } = useExogenosStore();
    const [dragActive, setDragActive] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);

    const handleFile = async (file: File) => {
        if (!file) return;

        const validExtensions = ['xml', 'csv', 'xlsx', 'xls'];
        const extension = file.name.split('.').pop()?.toLowerCase();

        if (!extension || !validExtensions.includes(extension)) {
            toast.error('Formato no soportado. Use archivos XML, CSV o Excel (.xlsx)');
            return;
        }

        setFileName(file.name);
        try {
            await importarArchivo(file, organizationId);
            toast.success(`Archivo importado: Se procesó ${file.name} correctamente`);
        } catch (error) {
            console.error(error);
            toast.error('Error al importar: No se pudo procesar el archivo');
            setFileName(null);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    return (
        <div className="bg-card rounded-2xl p-8 border border-border shadow-sm">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Upload className="size-5 text-primary" />
                Importar Archivo
            </h2>
            <p className="text-muted-foreground mb-6 text-sm">
                Cargue los reportes exógenos de terceros (XML DIAN, Excel o CSV) para conciliación.
            </p>

            <div
                className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-2xl transition-all ${dragActive ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'
                    }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                {loading ? (
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="size-10 text-primary animate-spin" />
                        <p className="text-sm font-medium text-muted-foreground animate-pulse">Procesando archivo...</p>
                    </div>
                ) : fileName ? (
                    <div className="flex flex-col items-center gap-3 text-center">
                        <div className="p-4 bg-emerald-500/10 rounded-full text-emerald-500">
                            <CheckCircle className="size-8" />
                        </div>
                        <div>
                            <p className="font-bold text-foreground">{fileName}</p>
                            <p className="text-xs text-muted-foreground">Importado correctamente</p>
                        </div>
                        <button
                            onClick={() => setFileName(null)}
                            className="mt-2 text-primary hover:underline text-xs"
                        >
                            Importar otro archivo
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="p-4 bg-background rounded-full shadow-sm mb-4">
                            <FileText className="size-8 text-muted-foreground" />
                        </div>
                        <p className="font-medium text-foreground">Arrastre su archivo aquí</p>
                        <p className="text-sm text-muted-foreground mt-1 mb-4">o haga clic para seleccionar</p>
                        <label className="relative inline-flex items-center px-6 py-2.5 bg-primary text-primary-foreground font-bold text-sm rounded-xl cursor-pointer hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                            Explorar Archivos
                            <input
                                type="file"
                                className="hidden"
                                accept=".xml,.csv,.xlsx,.xls"
                                onChange={handleChange}
                            />
                        </label>
                        <p className="text-xs text-muted-foreground mt-4">
                            Soporta: XML (DIAN), Excel (.xlsx), CSV
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};
