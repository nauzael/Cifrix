/**
 * Validador de inconsistencias en exógenas
 * Compara datos reportados por terceros contra transacciones internas de la empresa
 */

import { Exogeno, Transaction } from '@/lib/db';
import { db } from '@/lib/db';
import { calculateExpectedRetention } from './rates';

export interface InconsistencyResult {
    hayInconsistencia: boolean;
    tipo: 'VALOR_DISCORDANTE' | 'TERCERO_FALTANTE' | 'TERCERO_DESCONOCIDO' | 'RETENCION_ERRONEA' | 'DIFERENCIA_SALDO' | 'DIFERENCIA_VALOR';
    descripcion: string;
    valorReportado: number;
    valorInterno: number;
    diferencia: number;
    nombreTercero?: string;
}

export class ExogenosValidator {
    /**
     * Normaliza un NIT para comparaciones consistentes:
     * Elimina puntos, comas, espacios y guiones (incluyendo el dígito de verificación si existe)
     */
    static normalizeNit(nit: string | number): string {
        if (!nit) return '';
        let str = String(nit).trim().replace(/[\.\,\s]/g, '');
        // Si tiene guión, tomar solo la parte izquierda (NIT base)
        if (str.includes('-')) {
            str = str.split('-')[0];
        }
        // Retener solo dígitos
        return str.replace(/[^0-9]/g, '');
    }

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
        const nitNormalizado = ExogenosValidator.normalizeNit(exogenoImportado.nit_contribuyente);

        if (generatedRecordsMap) {
            // Busqueda rápida si se provee el mapa
            const key = `${nitNormalizado}-${exogenoImportado.concepto}`;
            const match = generatedRecordsMap.get(key);
            if (match) valorInterno = match.monto;
        } else {
            // Búsqueda en DB (más lento)
            const match = await db.exogenos
                .where('organization_id').equals(exogenoImportado.organization_id)
                .and(e =>
                    e.periodo_fiscal === exogenoImportado.periodo_fiscal &&
                    ExogenosValidator.normalizeNit(e.nit_contribuyente) === nitNormalizado &&
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
            const key = `${ExogenosValidator.normalizeNit(g.nit_contribuyente)}-${g.concepto}`;
            generatedMap.set(key, g);
        });

        for (const ex of exogenosImportados) {
            // Validar solo si es importado (tiene archivo origen y no es generado)
            if (ex.archivo_origen !== 'GENERADO_AUTOMATICO' && ex.archivo_origen) {
                resultados[ex.id] = await this.validarContraContabilidad(ex, generatedMap);
            }
        }

        return resultados;
    }

    /**
     * Valida un NIT de forma consolidada: Suma todos los reportes exógenos para ese NIT y compara con el saldo en balance.
     */
    validarNitConsolidado(
        nit: string,
        reportes: Exogeno[],
        balanceMap: Map<string, { debito: number, credito: number, saldo: number, nombre_tercero?: string }>
    ): InconsistencyResult | null {
        // Normalización estricta para búsqueda
        const nitClean = ExogenosValidator.normalizeNit(nit);

        // 1. Calcular total reportado en exógena para este NIT
        // Sumamos 'monto' de todos los reportes asociados
        const totalReportado = reportes.reduce((acc, r) => acc + (r.monto || 0), 0);

        // 2. Obtener saldo contable
        const balanceData = balanceMap.get(nitClean);
        const saldoContable = balanceData ? balanceData.saldo : 0;

        // 3. Comparar
        // Tolerancia de $1000 pesos por temas de redondeo
        const diferencia = Math.abs(totalReportado - saldoContable);

        if (diferencia > 1000) {
            // Intentar obtener el nombre desde el balance si no está en los reportes
            const nombreBalance = balanceData?.nombre_tercero;
            const nombreReporte = reportes.find(r => r.nombre_contribuyente && r.nombre_contribuyente !== 'Desconocido')?.nombre_contribuyente;

            return {
                hayInconsistencia: true,
                tipo: 'DIFERENCIA_SALDO',
                descripcion: `El valor total reportado ($${totalReportado.toLocaleString()}) no cruza con el saldo contable ($${saldoContable.toLocaleString()}).`,
                valorReportado: totalReportado,
                valorInterno: saldoContable,
                diferencia: totalReportado - saldoContable,
                nombreTercero: nombreReporte || nombreBalance
            };
        }

        return null;
    }

    /**
     * Valida un reporte exógeno contra un mapa de saldos de balance
     */
    validarContraBalance(exogeno: Exogeno, balanceMap: Map<string, { debito: number, credito: number, saldo: number }>): InconsistencyResult {
        // Normalización básica de NIT reportado
        const nit = ExogenosValidator.normalizeNit(exogeno.nit_contribuyente);

        const balanceData = balanceMap.get(nit);

        // Caso 1: Tercero no existe en el balance
        if (!balanceData) {
            // Un tercero reportado en exógena DEBERÍA estar en contabilidad si hubo movimiento.
            // Si el monto es significativo, es error.
            if (exogeno.monto > 1000) {
                return {
                    hayInconsistencia: true,
                    tipo: 'TERCERO_FALTANTE',
                    descripcion: 'El tercero reportado no tiene movimientos en el Balance de Prueba cargado.',
                    valorReportado: exogeno.monto,
                    valorInterno: 0,
                    diferencia: exogeno.monto
                };
            }
        } else {
            // Caso 2: Tercero existe. Comparar valores.
            const { debito, credito, saldo } = balanceData;

            // Buscamos coincidencia con Debito, Credito o Saldo Neto
            const diffDebito = Math.abs(exogeno.monto - debito);
            const diffCredito = Math.abs(exogeno.monto - credito);
            const diffSaldo = Math.abs(exogeno.monto - Math.abs(saldo));

            const minDiff = Math.min(diffDebito, diffCredito, diffSaldo);
            const UMBRAL = 1000; // Tolerancia

            if (minDiff > UMBRAL) {
                return {
                    hayInconsistencia: true,
                    tipo: 'VALOR_DISCORDANTE',
                    descripcion: `Monto no coincide con Balance. Balance (D: ${debito}, C: ${credito}, Saldo: ${saldo}).`,
                    valorReportado: exogeno.monto,
                    valorInterno: saldo, // Mostramos saldo como referencia principal
                    diferencia: minDiff
                };
            }
        }

        return {
            hayInconsistencia: false,
            tipo: 'VALOR_DISCORDANTE',
            descripcion: 'OK - Coincide con Balance',
            valorReportado: exogeno.monto,
            valorInterno: balanceData?.saldo || 0,
            diferencia: 0
        };
    }
}

export const exogenosValidator = new ExogenosValidator();
