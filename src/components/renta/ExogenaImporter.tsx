
import { useState } from 'react';
import { useRentaStore } from '@/store/rentaStore';
import { parseExogena, ExogenaParsedData } from '@/lib/renta/exogenaParser';
import { Upload, FileSpreadsheet, Check, AlertCircle } from 'lucide-react';

export function ExogenaImporter() {
    const { declaracionActual, agregarIngreso, agregarDeduccion, agregarActivoPasivo, actualizarDeclaracion, cargarDeclaracion } = useRentaStore();
    const [analyzing, setAnalyzing] = useState(false);
    const [parsedData, setParsedData] = useState<ExogenaParsedData | null>(null);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setAnalyzing(true);
        setError(null);
        setSuccess(false);
        setParsedData(null);

        try {
            const data = await parseExogena(file, declaracionActual.tipo_contribuyente);
            setParsedData(data);
        } catch (err) {
            console.error(err);
            setError(`Error al analizar: ${(err as Error).message || 'Formato inválido'}`);
        } finally {
            setAnalyzing(false);
        }
    };

    const handleImport = async () => {
        if (!parsedData || !declaracionActual) return;
        setImporting(true);

        try {
            // Importar Ingresos
            for (const item of parsedData.ingresos) {
                await agregarIngreso({
                    ...item,
                    declaracion_id: declaracionActual.id,
                    tipo_ingreso: item.tipo_ingreso as any // Cast perdonable aquí
                } as any);
            }

            // Importar Activos/Pasivos (si existe la función en el store, si no, hay que añadirla)
            // Asumimos que existe agregarActivoPasivo o similar, si no, lo comentamos o lo añadimos
            if (agregarActivoPasivo) {
                for (const item of parsedData.activosPasivos) {
                    await agregarActivoPasivo({
                        ...item,
                        declaracion_id: declaracionActual.id,
                        tipo: item.tipo as any
                    } as any);
                }
            }

            // Importar Retenciones como Deducción/Crédito?
            // Si hay retenciones, sumarlas a creditos_tributarios de la declaración
            if (parsedData.retenciones > 0) {
                const currentCreditos = declaracionActual.creditos_tributarios || 0;
                await actualizarDeclaracion(declaracionActual.id, {
                    creditos_tributarios: currentCreditos + parsedData.retenciones
                });
            }

            // Recargar declaración para asegurar que la UI se actualice
            await cargarDeclaracion(declaracionActual.id);

            setSuccess(true);
            setParsedData(null); // Limpiar previo
        } catch (err) {
            console.error(err);
            setError('Error al importar los datos a la declaración.');
        } finally {
            setImporting(false);
        }
    };

    if (!declaracionActual) return null;

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <FileSpreadsheet className="h-5 w-5 mr-2 text-green-600" />
                Importar Exógena (Excel)
            </h3>

            <p className="text-sm text-gray-500">
                Sube tu reporte de exógena (Excel) para pre-llenar tu declaración sugerida.
            </p>

            <div className="flex items-center space-x-4">
                <label className="flex flex-col items-center px-4 py-2 bg-white text-blue-600 rounded-lg shadow-sm tracking-wide uppercase border border-blue cursor-pointer hover:bg-blue-50">
                    <span className="flex items-center text-sm font-medium">
                        <Upload className="w-4 h-4 mr-2" />
                        Seleccionar Archivo
                    </span>
                    <input
                        type='file'
                        className="hidden"
                        accept=".xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                        onChange={handleFileChange}
                        onClick={(e) => (e.currentTarget.value = '')}
                    />
                </label>

                {analyzing && <span className="text-sm text-gray-500">Analizando archivo...</span>}
            </div>

            {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    {error}
                </div>
            )}

            {success && (
                <div className="p-3 bg-green-50 text-green-700 rounded-md text-sm flex items-center">
                    <Check className="h-4 w-4 mr-2" />
                    Datos importados correctamente. Revisa las secciones de Ingresos y Patrimonio.
                </div>
            )}

            {parsedData && (
                <div className="mt-4 border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Resumen del Archivo:</h4>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                        <li>Ingresos encontrados: <strong>{parsedData.ingresos.length}</strong></li>
                        <li>Activos/Pasivos encontrados: <strong>{parsedData.activosPasivos.length}</strong></li>
                        <li>Retenciones totales: <strong>${parsedData.retenciones.toLocaleString()}</strong></li>
                        <li className="text-gray-500 italic mt-1">
                            Modo de análisis: {declaracionActual.tipo_contribuyente === 'PERSONA_NATURAL' ? 'Persona Natural' : 'Persona Jurídica'}
                        </li>
                    </ul>

                    <div className="mt-4">
                        <button
                            onClick={handleImport}
                            disabled={importing}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                        >
                            {importing ? 'Importando...' : 'Confirmar e Importar'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
