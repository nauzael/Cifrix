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
        // 1. Buscar transacciones relacionadas con el tercero en el período
        // Nota: Esto es una simplificación, en la vida real se filtraría por año fiscal
        const transacciones = await db.transactions
            .where('contact_id')
            .equals(exogeno.tercero_id)
            .toArray();

        const valorInterno = transacciones.reduce((sum, t) => sum + t.amount, 0);
        const diferencia = Math.abs(exogeno.valor_reportado - valorInterno);

        // Umbral de materialidad (ej: 10,000 COP)
        const UMBRAL = 10000;

        if (diferencia > UMBRAL) {
            return {
                hayInconsistencia: true,
                tipo: 'VALOR_DISCORDANTE',
                descripcion: `El tercero reportó ${exogeno.valor_reportado} pero en contabilidad figura ${valorInterno}`,
                valorReportado: exogeno.valor_reportado,
                valorInterno: valorInterno,
                diferencia: diferencia
            };
        }

        return {
            hayInconsistencia: false,
            tipo: 'VALOR_DISCORDANTE',
            descripcion: 'Valores consistentes',
            valorReportado: exogeno.valor_reportado,
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
