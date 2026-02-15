/**
 * Validador de inconsistencias en exógenas
 * Compara datos reportados por terceros contra transacciones internas de la empresa
 */

import { Exogeno, Transaction } from '@/lib/db';
import { db } from '@/lib/db';

export interface InconsistencyResult {
    hayInconsistencia: boolean;
    tipo: 'VALOR_DISCORDANTE' | 'TERCERO_FALTANTE' | 'TERCERO_DESCONOCIDO';
    descripcion: string;
    valorReportado: number;
    valorInterno: number;
    diferencia: number;
}

export class ExogenosValidator {
    /**
     * Valida un registro de exógena contra los datos contables internos
     */
    async validarContraContabilidad(exogeno: Exogeno): Promise<InconsistencyResult> {
        // 1. Buscar transacciones relacionadas con el contribuyente
        // En esta versión, buscamos en facturas o contribuciones que coincidan con el NIT
        const facturas = await db.invoices
            .where('organization_id')
            .equals(exogeno.organization_id)
            .toArray();

        // Filtrar localmente por NIT (ya que el tax_id del cliente es lo que tenemos)
        // Esto es una simplificación
        const valorInterno = 0; // En una versión real buscaríamos facturas del cliente con ese NIT

        const diferencia = Math.abs(exogeno.monto - valorInterno);

        // Umbral de materialidad (ej: 10,000 COP)
        const UMBRAL = 10000;

        if (diferencia > UMBRAL) {
            return {
                hayInconsistencia: true,
                tipo: 'VALOR_DISCORDANTE',
                descripcion: `El tercero reportó ${exogeno.monto} pero en contabilidad figura ${valorInterno}`,
                valorReportado: exogeno.monto,
                valorInterno: valorInterno,
                diferencia: diferencia
            };
        }

        return {
            hayInconsistencia: false,
            tipo: 'VALOR_DISCORDANTE',
            descripcion: 'Valores consistentes',
            valorReportado: exogeno.monto,
            valorInterno: valorInterno,
            diferencia: diferencia
        };
    }

    /**
     * Realiza validación masiva de una lista de exógenos
     */
    async validarLote(exogenos: Exogeno[]): Promise<Record<string, InconsistencyResult>> {
        const resultados: Record<string, InconsistencyResult> = {};

        for (const ex of exogenos) {
            resultados[ex.id] = await this.validarContraContabilidad(ex);
        }

        return resultados;
    }
}

export const exogenosValidator = new ExogenosValidator();
