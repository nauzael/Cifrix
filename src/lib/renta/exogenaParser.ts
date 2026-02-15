
import * as XLSX from 'xlsx';
import { IngresoRenta, ActivoPasivoRenta, DeduccionRenta } from '@/lib/db';

export interface ExogenaParsedData {
    ingresos: Partial<IngresoRenta>[];
    activosPasivos: Partial<ActivoPasivoRenta>[];
    retenciones: number; // Suma total de retenciones o lista detallada?
    detalleRetenciones: { nit: string; nombre: string; valor: number; concepto: string }[];
    informacion: string[];
}

export const parseExogena = async (file: File): Promise<ExogenaParsedData> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'array' });

                // Asumimos que la hoja relevante es la primera o se llama 'Reporte'
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];

                // Convertir a JSON array de arrays
                const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

                const result: ExogenaParsedData = {
                    ingresos: [],
                    activosPasivos: [],
                    retenciones: 0,
                    detalleRetenciones: [],
                    informacion: []
                };

                // Validar estructura básica (fila 13 debe tener encabezados esperados)
                if (rows.length < 14) {
                    throw new Error('El archivo no tiene el número mínimo de filas esperado.');
                }

                // Empezar a leer desde la fila 19 (índice 19, fila 20 en excel)
                // Las filas anteriores son metadatos y topes
                const DATA_START_ROW = 19;

                for (let i = DATA_START_ROW; i < rows.length; i++) {
                    const row = rows[i];
                    if (!row || row.length < 6) continue; // Fila vacía o incompleta

                    const nitReportante = row[0];
                    const nombreReportante = row[1];
                    // const nitContribuyente = row[2];
                    // const nombreContribuyente = row[3];
                    const concepto = row[4];
                    const valor = Number(row[5]) || 0;
                    const usoSugerido = String(row[6] || '');
                    // const infoAdicional = row[7];

                    // Lógica de Mapeo
                    if (usoSugerido.includes('R29') || usoSugerido.includes('Patrimonio bruto')) {
                        // Activo
                        result.activosPasivos.push({
                            tipo: 'ACTIVO',
                            categoria: 'PATRIMONIO_BRUTO',
                            descripcion: `${concepto} - ${nombreReportante} (${usoSugerido})`,
                            valor: valor,
                            fecha_adquisicion: new Date().toISOString() // Fecha actual como referencia
                        });
                    } else if (usoSugerido.includes('R30') || usoSugerido.includes('Deudas')) {
                        // Pasivo
                        result.activosPasivos.push({
                            tipo: 'PASIVO',
                            categoria: 'DEUDAS',
                            descripcion: `${concepto} - ${nombreReportante}`,
                            valor: valor
                        });
                    } else if (usoSugerido.includes('R132') || usoSugerido.includes('Retenciones')) {
                        // Retenciones
                        result.retenciones += valor;
                        result.detalleRetenciones.push({
                            nit: nitReportante,
                            nombre: nombreReportante,
                            valor: valor,
                            concepto: concepto
                        });
                    } else if (usoSugerido.includes('R43') || usoSugerido.includes('honorarios')) {
                        // Honorarios
                        result.ingresos.push({
                            tipo_ingreso: 'HONORARIOS',
                            concepto: `${concepto} - ${nombreReportante}`,
                            monto: valor,
                            retencion_aplicada: 0 // Se llenará si encontramos match o se deja en 0 y se usa el total de retenciones aparte
                        });
                    } else if (usoSugerido.includes('R58') || usoSugerido.includes('rentas de capital')) {
                        // Rentas de Capital
                        result.ingresos.push({
                            tipo_ingreso: 'CAPITAL',
                            concepto: `${concepto} - ${nombreReportante}`,
                            monto: valor,
                            retencion_aplicada: 0
                        });
                    } else if (usoSugerido.includes('R74') || usoSugerido.includes('no laborales')) {
                        // No Laborales
                        result.ingresos.push({
                            tipo_ingreso: 'OTROS', // O mapear a NO_LABORALES si existiera
                            concepto: `${concepto} - ${nombreReportante}`,
                            monto: valor,
                            retencion_aplicada: 0
                        });
                    } else if (usoSugerido.includes('Ingresos brutos')) {
                        // Genérico Ingreso
                        result.ingresos.push({
                            tipo_ingreso: 'OTROS',
                            concepto: `${concepto} - ${nombreReportante}`,
                            monto: valor,
                            retencion_aplicada: 0
                        });
                    }
                    // TODO: Mapear más casos (R59: No constitutivos, etc.)
                }

                resolve(result);

            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};
