/**
 * Validador de Declaraciones de Renta
 * Implementa reglas tributarias y validaciones de consistencia
 */

import { db, DeclaracionRenta, IngresoRenta, DeduccionRenta } from '../db';
import { rentaCalculator } from './calculator';

export interface ResultadoValidacion {
    valida: boolean;
    errores: string[];
    advertencias: string[];
    informacion: string[];
}

export interface ValidacionDetallada {
    campo: string;
    tipo: 'error' | 'advertencia' | 'info';
    mensaje: string;
    valorActual?: any;
    valorEsperado?: any;
}

/**
 * Validador principal de declaraciones de renta
 */
export class RentaValidator {
    /**
     * Valida una declaración completa
     */
    async validarDeclaracion(declaracionId: string): Promise<ResultadoValidacion> {
        const errores: string[] = [];
        const advertencias: string[] = [];
        const informacion: string[] = [];

        try {
            // 1. Cargar declaración
            const declaracion = await db.declaraciones_renta.get(declaracionId);
            if (!declaracion) {
                return {
                    valida: false,
                    errores: ['Declaración no encontrada'],
                    advertencias: [],
                    informacion: []
                };
            }

            // 2. Validaciones básicas
            this.validarCamposObligatorios(declaracion, errores);
            this.validarPeriodoFiscal(declaracion, errores, advertencias);
            this.validarEstado(declaracion, errores);

            // 3. Cargar datos relacionados
            const ingresos = await db.ingresos_renta
                .where({ declaracion_id: declaracionId })
                .toArray();

            const deducciones = await db.deducciones_renta
                .where({ declaracion_id: declaracionId })
                .toArray();

            // 4. Validar consistencia de montos
            await this.validarConsistenciaMontos(declaracion, ingresos, deducciones, errores, advertencias);

            // 5. Validar deducciones
            await this.validarDeducciones(declaracion, deducciones, errores, advertencias);

            // 6. Validar ingresos
            this.validarIngresos(ingresos, errores, advertencias);

            // 7. Validar obligación de declarar
            this.validarObligacionDeclarar(declaracion, informacion, advertencias);

            // 8. Validar cálculos
            this.validarCalculos(declaracion, errores, advertencias);

            return {
                valida: errores.length === 0,
                errores,
                advertencias,
                informacion
            };
        } catch (error) {
            return {
                valida: false,
                errores: [`Error durante validación: ${error}`],
                advertencias: [],
                informacion: []
            };
        }
    }

    /**
     * Valida campos obligatorios
     */
    private validarCamposObligatorios(
        declaracion: DeclaracionRenta,
        errores: string[]
    ): void {
        if (!declaracion.contribuyente_id || declaracion.contribuyente_id.trim() === '') {
            errores.push('El NIT/Cédula del contribuyente es obligatorio');
        }

        if (!declaracion.contribuyente_nombre || declaracion.contribuyente_nombre.trim() === '') {
            errores.push('El nombre del contribuyente es obligatorio');
        }

        if (!declaracion.periodo_fiscal) {
            errores.push('El período fiscal es obligatorio');
        }

        if (!declaracion.estado) {
            errores.push('El estado de la declaración es obligatorio');
        }
    }

    /**
     * Valida el período fiscal
     */
    private validarPeriodoFiscal(
        declaracion: DeclaracionRenta,
        errores: string[],
        advertencias: string[]
    ): void {
        const añoActual = new Date().getFullYear();
        const periodo = declaracion.periodo_fiscal;

        if (periodo < 2020) {
            errores.push(`Período fiscal inválido: ${periodo}. Debe ser 2020 o posterior`);
        }

        if (periodo > añoActual) {
            errores.push(`Período fiscal inválido: ${periodo}. No puede ser futuro`);
        }

        if (periodo < añoActual - 5) {
            advertencias.push(`Declaración de período antiguo (${periodo}). Verifique plazos de prescripción`);
        }
    }

    /**
     * Valida el estado de la declaración
     */
    private validarEstado(
        declaracion: DeclaracionRenta,
        errores: string[]
    ): void {
        const estadosValidos = ['BORRADOR', 'PRESENTADA', 'CORREGIDA', 'ANULADA'];

        if (!estadosValidos.includes(declaracion.estado)) {
            errores.push(`Estado inválido: ${declaracion.estado}`);
        }

        if (declaracion.estado === 'PRESENTADA' && !declaracion.fecha_presentacion) {
            errores.push('Declaración marcada como PRESENTADA pero sin fecha de presentación');
        }

        if (declaracion.estado === 'ANULADA' && declaracion.impuesto_neto > 0) {
            errores.push('Declaración ANULADA no puede tener impuesto a pagar');
        }
    }

    /**
     * Valida consistencia entre montos declarados y detalle
     */
    private async validarConsistenciaMontos(
        declaracion: DeclaracionRenta,
        ingresos: IngresoRenta[],
        deducciones: DeduccionRenta[],
        errores: string[],
        advertencias: string[]
    ): Promise<void> {
        // Sumar ingresos
        const sumaIngresos = ingresos.reduce((sum, ing) => sum + ing.monto, 0);
        const diferenciaIngresos = Math.abs(sumaIngresos - declaracion.total_ingresos);

        if (diferenciaIngresos > 1) { // Tolerancia de $1 por redondeos
            errores.push(
                `Inconsistencia en ingresos: Suma de detalle ($${sumaIngresos.toFixed(2)}) ` +
                `no coincide con total declarado ($${declaracion.total_ingresos.toFixed(2)})`
            );
        }

        // Sumar deducciones
        const sumaDeducciones = deducciones.reduce((sum, ded) => sum + (ded.monto_deducido || ded.monto), 0);
        const diferenciaDeducciones = Math.abs(sumaDeducciones - declaracion.total_deducciones);

        if (diferenciaDeducciones > 1) {
            errores.push(
                `Inconsistencia en deducciones: Suma de detalle ($${sumaDeducciones.toFixed(2)}) ` +
                `no coincide con total declarado ($${declaracion.total_deducciones.toFixed(2)})`
            );
        }

        // Validar que haya al menos un ingreso si total_ingresos > 0
        if (declaracion.total_ingresos > 0 && ingresos.length === 0) {
            advertencias.push('Se declararon ingresos pero no hay detalle de los mismos');
        }
    }

    /**
     * Valida deducciones contra límites legales
     */
    private async validarDeducciones(
        declaracion: DeclaracionRenta,
        deducciones: DeduccionRenta[],
        errores: string[],
        advertencias: string[]
    ): Promise<void> {
        for (const deduccion of deducciones) {
            // Calcular límite legal
            const limiteCalculado = rentaCalculator.calcularLimiteDeduccion(
                deduccion.tipo_deduccion,
                declaracion.total_ingresos
            );

            // Validar que monto_deducido no exceda el monto solicitado
            if (deduccion.monto_deducido && deduccion.monto_deducido > deduccion.monto) {
                errores.push(
                    `Deducción "${deduccion.concepto}": Monto deducido ($${deduccion.monto_deducido}) ` +
                    `excede monto solicitado ($${deduccion.monto})`
                );
            }

            // Validar contra límite legal
            const montoAValidar = deduccion.monto_deducido || deduccion.monto;
            if (montoAValidar > limiteCalculado) {
                advertencias.push(
                    `Deducción "${deduccion.concepto}" (${deduccion.tipo_deduccion}): ` +
                    `Monto ($${montoAValidar.toFixed(2)}) excede límite legal ($${limiteCalculado.toFixed(2)})`
                );
            }

            // Validar documento soporte para montos altos
            if (montoAValidar > 1000000 && !deduccion.documento_soporte) {
                advertencias.push(
                    `Deducción "${deduccion.concepto}": Monto alto sin documento soporte`
                );
            }
        }
    }

    /**
     * Valida ingresos
     */
    private validarIngresos(
        ingresos: IngresoRenta[],
        errores: string[],
        advertencias: string[]
    ): void {
        for (const ingreso of ingresos) {
            // Validar monto positivo
            if (ingreso.monto <= 0) {
                errores.push(`Ingreso "${ingreso.concepto}": Monto debe ser positivo`);
            }

            // Validar mes si está presente
            if (ingreso.mes && (ingreso.mes < 1 || ingreso.mes > 12)) {
                errores.push(`Ingreso "${ingreso.concepto}": Mes inválido (${ingreso.mes})`);
            }

            // Validar retención
            if (ingreso.retencion_aplicada < 0) {
                errores.push(`Ingreso "${ingreso.concepto}": Retención no puede ser negativa`);
            }

            if (ingreso.retencion_aplicada > ingreso.monto) {
                advertencias.push(
                    `Ingreso "${ingreso.concepto}": Retención ($${ingreso.retencion_aplicada}) ` +
                    `excede monto del ingreso ($${ingreso.monto})`
                );
            }
        }
    }

    /**
     * Valida si el contribuyente está obligado a declarar
     */
    private validarObligacionDeclarar(
        declaracion: DeclaracionRenta,
        informacion: string[],
        advertencias: string[]
    ): void {
        // Esta validación requeriría más datos (patrimonio, consumos, etc.)
        // Por ahora solo validamos ingresos
        const resultado = rentaCalculator.estaObligadoDeclarar({
            ingresosBrutos: declaracion.total_ingresos,
            patrimonioBruto: 0, // TODO: Implementar cuando tengamos activos/pasivos
            consumosTarjeta: 0,
            compras: 0,
            consignaciones: 0
        });

        if (resultado.obligado) {
            informacion.push('Contribuyente OBLIGADO a declarar renta');
            informacion.push(...resultado.razones);
        } else {
            advertencias.push('Contribuyente NO obligado a declarar según topes actuales');
        }
    }

    /**
     * Valida que los cálculos sean correctos
     */
    private validarCalculos(
        declaracion: DeclaracionRenta,
        errores: string[],
        advertencias: string[]
    ): void {
        // Validar base gravable
        const baseCalculada = declaracion.total_ingresos -
            declaracion.total_costos -
            declaracion.total_gastos -
            declaracion.total_deducciones;

        const diferenciaBase = Math.abs(baseCalculada - declaracion.base_gravable);
        if (diferenciaBase > 1) {
            errores.push(
                `Base gravable incorrecta: Calculada ($${baseCalculada.toFixed(2)}) ` +
                `vs Declarada ($${declaracion.base_gravable.toFixed(2)})`
            );
        }

        // Validar impuesto neto
        const impuestoNetoCalculado = Math.max(0, declaracion.impuesto_calculado - declaracion.creditos_tributarios);
        const diferenciaImpuesto = Math.abs(impuestoNetoCalculado - declaracion.impuesto_neto);

        if (diferenciaImpuesto > 1) {
            errores.push(
                `Impuesto neto incorrecto: Calculado ($${impuestoNetoCalculado.toFixed(2)}) ` +
                `vs Declarado ($${declaracion.impuesto_neto.toFixed(2)})`
            );
        }

        // Validar que montos no sean negativos
        if (declaracion.total_ingresos < 0) errores.push('Total ingresos no puede ser negativo');
        if (declaracion.total_costos < 0) errores.push('Total costos no puede ser negativo');
        if (declaracion.total_gastos < 0) errores.push('Total gastos no puede ser negativo');
        if (declaracion.total_deducciones < 0) errores.push('Total deducciones no puede ser negativo');
        if (declaracion.impuesto_neto < 0) errores.push('Impuesto neto no puede ser negativo');
    }

    /**
     * Validación rápida de NIT/Cédula colombiana
     */
    validarNIT(nit: string): { valido: boolean; mensaje: string } {
        // Remover puntos, guiones y espacios
        const nitLimpio = nit.replace(/[.\-\s]/g, '');

        // Validar longitud
        if (nitLimpio.length < 6 || nitLimpio.length > 10) {
            return {
                valido: false,
                mensaje: 'NIT/Cédula debe tener entre 6 y 10 dígitos'
            };
        }

        // Validar que solo contenga números
        if (!/^\d+$/.test(nitLimpio)) {
            return {
                valido: false,
                mensaje: 'NIT/Cédula solo debe contener números'
            };
        }

        return {
            valido: true,
            mensaje: 'NIT/Cédula válido'
        };
    }
}

/**
 * Instancia singleton del validador
 */
export const rentaValidator = new RentaValidator();
