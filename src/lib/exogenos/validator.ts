/**
 * Validador de inconsistencias en exógenas
 * Compara datos reportados por terceros contra transacciones internas de la empresa
 */

import { Exogeno, Transaction } from '@/lib/db';
import { db } from '@/lib/db';
import { calculateExpectedRetention } from './rates';

export interface InconsistencyResult {
    hayInconsistencia: boolean;
    tipo: 'VALOR_DISCORDANTE' | 'TERCERO_FALTANTE' | 'TERCERO_DESCONOCIDO' | 'RETENCION_ERRONEA';
    descripcion: string;
    valorReportado: number;
    valorInterno: number;
    diferencia: number;
}

export class ExogenosValidator {
    /**
     * Valida un registro de exógena (IMPORTADO) contra los datos contables internos (GENERADOS)
     * Requiere que previamente se haya ejecutado el Generador para el mismo periodo.
     */
    async validarContraContabilidad(exogenoImportado: Exogeno, generatedRecordsMap?: Map<string, Exogeno>): Promise<InconsistencyResult> {
        // 1. Calcular retención esperada según norma (teórico)
        const retencionEsperada = calculateExpectedRetention(
            exogenoImportado.periodo_fiscal,
            exogenoImportado.concepto,
            exogenoImportado.monto
        );

        // 2. Validación de Retención aritmética básica
        const margenErrorRetencion = 100;
        const diferenciaRetencion = Math.abs(exogenoImportado.retencion - retencionEsperada);

        if (diferenciaRetencion > margenErrorRetencion && retencionEsperada > 0) {
            return {
                hayInconsistencia: true,
                tipo: 'RETENCION_ERRONEA',
                descripcion: `Retención calculada incorrecta. Base: ${exogenoImportado.monto}, Tasa Sugerida, Esperado: ${retencionEsperada}, Reportado: ${exogenoImportado.retencion}`,
                valorReportado: exogenoImportado.retencion,
                valorInterno: retencionEsperada,
                diferencia: diferenciaRetencion
            };
        }

        // 3. Obtener Valor Interno (Contabilidad)
        // Estrategia: Buscar en los registros GENERADOS AUTOMATICAMENTE
        let valorInterno = 0;

        if (generatedRecordsMap) {
            // Busqueda rápida si se provee el mapa
            const key = `${exogenoImportado.nit_contribuyente}-${exogenoImportado.concepto}`;
            const match = generatedRecordsMap.get(key);
            if (match) valorInterno = match.monto;
        } else {
            // Búsqueda en DB (más lento)
            const match = await db.exogenos
                .where('organization_id').equals(exogenoImportado.organization_id)
                .and(e =>
                    e.periodo_fiscal === exogenoImportado.periodo_fiscal &&
                    e.nit_contribuyente === exogenoImportado.nit_contribuyente &&
                    e.concepto === exogenoImportado.concepto &&
                    e.archivo_origen === 'GENERADO_AUTOMATICO'
                )
                .first();

            if (match) valorInterno = match.monto;
        }

        // Comparar
        const UMBRAL = 1000; // Pesos
        const diferencia = Math.abs(exogenoImportado.monto - valorInterno);

        if (diferencia > UMBRAL) {
            // Casos especiales
            if (valorInterno === 0) {
                return {
                    hayInconsistencia: true,
                    tipo: 'TERCERO_FALTANTE', // Existe en reporte externo, no en contabilidad
                    descripcion: 'El tercero o concepto no aparece en la contabilidad interna',
                    valorReportado: exogenoImportado.monto,
                    valorInterno: 0,
                    diferencia: diferencia
                };
            }

            return {
                hayInconsistencia: true,
                tipo: 'VALOR_DISCORDANTE',
                descripcion: `Diferencia significativa entre valor reportado y contabilidad`,
                valorReportado: exogenoImportado.monto,
                valorInterno: valorInterno,
                diferencia: diferencia
            };
        }

        return {
            hayInconsistencia: false,
            tipo: 'VALOR_DISCORDANTE',
            descripcion: 'OK',
            valorReportado: exogenoImportado.monto,
            valorInterno: valorInterno,
            diferencia: diferencia
        };
    }

    /**
     * Realiza validación masiva de una lista de exógenos
     * Optimizado para cargar "Generados" una sola vez
     */
    async validarLote(exogenosImportados: Exogeno[]): Promise<Record<string, InconsistencyResult>> {
        if (exogenosImportados.length === 0) return {};

        const resultados: Record<string, InconsistencyResult> = {};
        const organizationId = exogenosImportados[0].organization_id;
        const year = exogenosImportados[0].periodo_fiscal;

        // Cargar todos los generados para este año/org para hacer cruce rápido
        const generated = await db.exogenos
            .where('organization_id').equals(organizationId)
            .and(e => e.periodo_fiscal === year && e.archivo_origen === 'GENERADO_AUTOMATICO')
            .toArray();

        // Crear Map clave: NIT-CONCEPTO
        const generatedMap = new Map<string, Exogeno>();
        generated.forEach(g => {
            generatedMap.set(`${g.nit_contribuyente}-${g.concepto}`, g);
        });

        for (const ex of exogenosImportados) {
            // Validar solo si es importado (tiene archivo origen y no es generado)
            if (ex.archivo_origen !== 'GENERADO_AUTOMATICO' && ex.archivo_origen) {
                resultados[ex.id] = await this.validarContraContabilidad(ex, generatedMap);
            }
        }

        return resultados;
    }
}

export const exogenosValidator = new ExogenosValidator();
