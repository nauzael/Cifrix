
import * as XLSX from 'xlsx';
import { IngresoRenta, ActivoPasivoRenta, DeduccionRenta } from '@/lib/db';

export interface ExogenaParsedData {
    ingresos: Partial<IngresoRenta>[];
    activosPasivos: Partial<ActivoPasivoRenta>[];
    retenciones: number; // Suma total de retenciones o lista detallada?
    detalleRetenciones: { nit: string; nombre: string; valor: number; concepto: string }[];
    informacion: string[];
}

export const parseExogena = async (file: File, tipoContribuyente: 'PERSONA_NATURAL' | 'PERSONA_JURIDICA' = 'PERSONA_NATURAL'): Promise<ExogenaParsedData> => {
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
                    // === LÓGICA DE MAPEO COMÚN (ACTIVOS/PASIVOS) ===
                    if (usoSugerido.includes('R29') || usoSugerido.includes('Patrimonio bruto') || usoSugerido.includes('Saldo')) {
                        // Activo
                        result.activosPasivos.push({
                            tipo: 'ACTIVO',
                            categoria: 'PATRIMONIO_BRUTO',
                            descripcion: `${concepto} - ${nombreReportante} (${usoSugerido})`,
                            valor: valor,
                            fecha_adquisicion: new Date().toISOString()
                        });
                        continue;
                    }

                    if (usoSugerido.includes('R30') || usoSugerido.includes('Deudas') || usoSugerido.includes('Pasivo')) {
                        // Pasivo
                        result.activosPasivos.push({
                            tipo: 'PASIVO',
                            categoria: 'DEUDAS',
                            descripcion: `${concepto} - ${nombreReportante}`,
                            valor: valor
                        });
                        continue;
                    }

                    // === LÓGICA DE MAPEO DE RETENCIONES ===
                    if (usoSugerido.includes('R132') || usoSugerido.includes('Retenciones') || usoSugerido.includes('Retención')) {
                        result.retenciones += valor;
                        result.detalleRetenciones.push({
                            nit: nitReportante,
                            nombre: nombreReportante,
                            valor: valor,
                            concepto: concepto
                        });
                        continue;
                    }

                    // === LÓGICA DE MAPEO DE INGRESOS (DIFERENCIADA) ===
                    let tipoIngreso: any = 'OTROS';
                    const esIngreso = usoSugerido.includes('Ingresos') || usoSugerido.includes('Rentas') || usoSugerido.includes('Honorarios') || usoSugerido.includes('Servicios') || usoSugerido.includes('Comisiones') || usoSugerido.includes('Dividendos') || usoSugerido.includes('Intereses');

                    if (esIngreso) {
                        if (tipoContribuyente === 'PERSONA_NATURAL') {
                            if (usoSugerido.includes('R43') || usoSugerido.includes('honorarios') || usoSugerido.includes('servicios')) {
                                tipoIngreso = 'HONORARIOS';
                            } else if (usoSugerido.includes('R58') || usoSugerido.includes('rentas de capital') || usoSugerido.includes('Intereses') || usoSugerido.includes('Rendimientos')) {
                                tipoIngreso = 'CAPITAL';
                            } else if (usoSugerido.includes('laboral') || usoSugerido.includes('Salarios')) {
                                tipoIngreso = 'LABORAL';
                            } else if (usoSugerido.includes('Dividendos')) {
                                tipoIngreso = 'DIVIDENDOS';
                            }
                        } else {
                            // PERSONA JURIDICA
                            if (usoSugerido.includes('Financiero') || usoSugerido.includes('Intereses') || usoSugerido.includes('Rendimientos')) {
                                tipoIngreso = 'FINANCIERO';
                            } else if (usoSugerido.includes('Dividendos')) {
                                tipoIngreso = 'FINANCIERO'; // O DIVIDENDOS si existe
                            } else if (usoSugerido.includes('Extraordinario') || usoSugerido.includes('recuperaciones')) {
                                tipoIngreso = 'EXTRAORDINARIO';
                            } else {
                                // Por defecto asumimos Operacional para empresas si es ingreso genérico
                                tipoIngreso = 'OPERACIONAL';
                            }
                        }

                        result.ingresos.push({
                            tipo_ingreso: tipoIngreso,
                            concepto: `${concepto} - ${nombreReportante}`,
                            monto: valor,
                            retencion_aplicada: 0,
                            notas: `Importado de Exógena: ${usoSugerido}`
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
