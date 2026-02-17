import { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Check, ArrowRight } from 'lucide-react';
import { useExogenosStore } from '@/store/exogenosStore';
import { toast } from '@/store/toastStore';

interface FileImporterProps {
    organizationId: string;
}

export const FileImporter = ({ organizationId }: FileImporterProps) => {
    const { importarArchivo, importarBalance, loading } = useExogenosStore();
    const [dragActive, setDragActive] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const [tipoArchivo, setTipoArchivo] = useState<'exogeno' | 'balance'>('balance');
    const [balanceCargado, setBalanceCargado] = useState(false);

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
            if (tipoArchivo === 'balance') {
                await importarBalance(file, organizationId);
                setBalanceCargado(true);
                toast.success('Balance cargado. Ahora puede cargar el archivo exógeno.');
                setTimeout(() => {
                    setTipoArchivo('exogeno');
                    setFileName(null);
                }, 1500);
            } else {
                await importarArchivo(file, organizationId);
                toast.success(`Archivo importado: Se procesó ${file.name} correctamente`);
            }
        } catch (error) {
            console.error(error);
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
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <Upload className="size-5 text-primary" />
                        Asistente de Importación
                    </h2>
                </div>

                {/* Stepper Visual */}
                <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-xl border border-border/50">
                    <button
                        onClick={() => setTipoArchivo('balance')}
                        className={`flex-1 flex items-center gap-3 p-3 rounded-lg transition-all text-left ${tipoArchivo === 'balance' ? 'bg-background shadow border border-primary/20' : 'opacity-60 hover:opacity-100'
                            }`}
                    >
                        <div className={`size-8 rounded-full flex items-center justify-center font-bold text-sm ${balanceCargado ? 'bg-emerald-500 text-white' : (tipoArchivo === 'balance' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')
                            }`}>
                            {balanceCargado ? <Check className="size-4" /> : '1'}
                        </div>
                        <div>
                            <p className="font-bold text-sm text-foreground">Cargar Balance</p>
                            <p className="text-[10px] text-muted-foreground">Base contable (CSV/Excel)</p>
                        </div>
                    </button>

                    <ArrowRight className="size-4 text-muted-foreground" />

                    <button
                        disabled={!balanceCargado}
                        onClick={() => balanceCargado && setTipoArchivo('exogeno')}
                        className={`flex-1 flex items-center gap-3 p-3 rounded-lg transition-all text-left ${tipoArchivo === 'exogeno' ? 'bg-background shadow border border-primary/20' : 'opacity-60'
                            } ${!balanceCargado ? 'cursor-not-allowed grayscale' : 'hover:opacity-100'}`}
                    >
                        <div className={`size-8 rounded-full flex items-center justify-center font-bold text-sm ${tipoArchivo === 'exogeno' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                            }`}>
                            2
                        </div>
                        <div>
                            <p className="font-bold text-sm text-foreground">Cargar Exógenos</p>
                            <p className="text-[10px] text-muted-foreground">Reporte DIAN/Terceros (XML/Excel)</p>
                        </div>
                    </button>
                </div>
            </div>

            <p className="text-muted-foreground mb-6 text-sm flex items-center gap-2">
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">
                    Paso {tipoArchivo === 'balance' ? '1' : '2'}
                </span>
                {tipoArchivo === 'balance'
                    ? 'Suba el Archivo Plano o Excel de su Balance de Comprobación anual.'
                    : 'Suba los reportes exógenos recibidos para cruzar contra el balance.'}
            </p>

            <div
                className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-2xl transition-all ${dragActive ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'
                    }`}
                onDragEnter={handleDrag}
                // ...
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
