/**
 * Motor de Cálculo de Impuesto de Renta
 * Implementa las tarifas marginales y reglas tributarias colombianas
 * Actualizado para año fiscal 2024
 */

import { DeclaracionRenta } from '../db';

// Valor UVT (Unidad de Valor Tributario) para 2024
// IMPORTANTE: Este valor debe actualizarse anualmente según DIAN
export const UVT_2024 = 47065;

/**
 * Estructura de tarifa marginal
 */
interface TramoPorcentaje {
    desde: number;      // UVT mínimo del tramo
    hasta: number;      // UVT máximo del tramo
    tarifa: number;     // Porcentaje a aplicar (0.15 = 15%)
    baseUVT: number;    // Impuesto base acumulado en UVT
}

/**
 * Tarifas marginales 2024 según tabla DIAN
 * Referencia: Estatuto Tributario Art. 241
 */
const TARIFAS_MARGINALES_2024: TramoPorcentaje[] = [
    { desde: 0, hasta: 95, tarifa: 0, baseUVT: 0 },
    { desde: 95, hasta: 150, tarifa: 0.19, baseUVT: 0 },
    { desde: 150, hasta: 360, tarifa: 0.28, baseUVT: 10.45 },
    { desde: 360, hasta: 640, tarifa: 0.33, baseUVT: 69.25 },
    { desde: 640, hasta: 945, tarifa: 0.35, baseUVT: 161.65 },
    { desde: 945, hasta: 2300, tarifa: 0.37, baseUVT: 268.4 },
    { desde: 2300, hasta: Infinity, tarifa: 0.39, baseUVT: 769.75 }
];

/**
 * Resultado del cálculo de impuestos
 */
export interface ResultadoCalculo {
    baseGravable: number;
    baseGravableUVT: number;
    impuestoBruto: number;
    creditosTributarios: number;
    impuestoNeto: number;
    // Nuevos campos para diferenciar tipo
    tipoContribuyente: 'PERSONA_NATURAL' | 'PERSONA_JURIDICA';
    tarifaAplicada: number | 'PROGRESIVA'; // número para jurídica, 'PROGRESIVA' para natural
    tablaProgresiva?: {
        rango: string;
        base: number;
        tarifa: number;
        impuesto: number;
    }[];
    detalleCalculo: DetalleCalculo;
}

export interface DetalleCalculo {
    totalIngresos: number;
    totalCostos: number;
    totalGastos: number;
    totalDeducciones: number;
    rentaLiquida: number;
    minimoNoGravable: number;
    tramoAplicado: string;
    tarifaEfectiva: number;
    calculoPorTramos: TramoCalculado[];
}

export interface TramoCalculado {
    tramo: string;
    baseTramo: number;
    tarifa: number;
    impuestoTramo: number;
}

/**
 * Calculadora principal de impuesto de renta
 */
export class RentaCalculator {
    private readonly uvt: number;

    constructor(uvt: number = UVT_2024) {
        this.uvt = uvt;
    }

    /**
     * Calcula el impuesto de renta completo para una declaración
     */
    calcularImpuesto(declaracion: DeclaracionRenta): ResultadoCalculo {
        if (declaracion.tipo_contribuyente === 'PERSONA_JURIDICA') {
            return this.calcularImpuestoPersonaJuridica(declaracion);
        } else {
            return this.calcularImpuestoPersonaNatural(declaracion);
        }
    }

    /**
     * Calcula el impuesto para Persona Natural (Tarifa Progresiva)
     */
    private calcularImpuestoPersonaNatural(declaracion: DeclaracionRenta): ResultadoCalculo {
        // 1. Calcular renta líquida
        const rentaLiquida = this.calcularRentaLiquida(declaracion);

        // 2. Calcular base gravable (renta líquida - mínimo no gravable)
        const minimoNoGravable = 95 * this.uvt;
        const baseGravable = Math.max(0, rentaLiquida - minimoNoGravable);
        const baseGravableUVT = baseGravable / this.uvt;

        // 3. Aplicar tarifas marginales
        const { impuesto, calculoPorTramos, tramoAplicado } = this.aplicarTarifaMarginal(baseGravableUVT);

        // 4. Calcular impuesto neto (restar créditos tributarios)
        const impuestoNeto = Math.max(0, impuesto - declaracion.creditos_tributarios);

        // 5. Calcular tarifa efectiva
        const tarifaEfectiva = rentaLiquida > 0 ? (impuesto / rentaLiquida) * 100 : 0;

        // Tabla para visualización
        const tablaProgresiva = calculoPorTramos.map(tramo => ({
            rango: tramo.tramo,
            base: tramo.baseTramo,
            tarifa: tramo.tarifa,
            impuesto: tramo.impuestoTramo
        }));

        return {
            baseGravable,
            baseGravableUVT,
            impuestoBruto: impuesto,
            creditosTributarios: declaracion.creditos_tributarios,
            impuestoNeto,
            tipoContribuyente: 'PERSONA_NATURAL',
            tarifaAplicada: 'PROGRESIVA',
            tablaProgresiva,
            detalleCalculo: {
                totalIngresos: declaracion.total_ingresos,
                totalCostos: declaracion.total_costos,
                totalGastos: declaracion.total_gastos,
                totalDeducciones: declaracion.total_deducciones,
                rentaLiquida,
                minimoNoGravable,
                tramoAplicado,
                tarifaEfectiva,
                calculoPorTramos
            }
        };
    }

    /**
     * Calcula el impuesto para Persona Jurídica (Tarifa Fija 35%)
     */
    private calcularImpuestoPersonaJuridica(declaracion: DeclaracionRenta): ResultadoCalculo {
        // 1. Calcular renta líquida
        const rentaLiquida = this.calcularRentaLiquida(declaracion);

        // 2. Para PJ, la base gravable suele ser la misma renta líquida (simplificado)
        // Se podrían restar rentas exentas específicas si se implementan
        const baseGravable = Math.max(0, rentaLiquida);
        const baseGravableUVT = baseGravable / this.uvt;

        // 3. Tarifa fija del 35% (Año Gravable 2023/2024)
        const TARIFA_PJ = 0.35;
        const impuesto = baseGravable * TARIFA_PJ;

        // 4. Calcular impuesto neto
        const impuestoNeto = Math.max(0, impuesto - declaracion.creditos_tributarios);

        // 5. Tarifa efectiva
        const tarifaEfectiva = rentaLiquida > 0 ? (impuesto / rentaLiquida) * 100 : 0;

        return {
            baseGravable,
            baseGravableUVT,
            impuestoBruto: impuesto,
            creditosTributarios: declaracion.creditos_tributarios,
            impuestoNeto,
            tipoContribuyente: 'PERSONA_JURIDICA',
            tarifaAplicada: TARIFA_PJ * 100,
            detalleCalculo: {
                totalIngresos: declaracion.total_ingresos,
                totalCostos: declaracion.total_costos,
                totalGastos: declaracion.total_gastos,
                totalDeducciones: declaracion.total_deducciones,
                rentaLiquida,
                minimoNoGravable: 0, // No aplica mínimo no gravable general
                tramoAplicado: `Tarifa Fija ${TARIFA_PJ * 100}%`,
                tarifaEfectiva,
                calculoPorTramos: [] // No aplica tramos
            }
        };
    }

    /**
     * Calcula la renta líquida
     * Fórmula: Ingresos - Costos - Gastos - Deducciones
     */
    private calcularRentaLiquida(declaracion: DeclaracionRenta): number {
        const { total_ingresos, total_costos, total_gastos, total_deducciones } = declaracion;

        const rentaLiquida = total_ingresos - total_costos - total_gastos - total_deducciones;

        return Math.max(0, rentaLiquida);
    }

    /**
     * Aplica las tarifas marginales según la tabla DIAN
     */
    private aplicarTarifaMarginal(baseUVT: number): {
        impuesto: number;
        calculoPorTramos: TramoCalculado[];
        tramoAplicado: string;
    } {
        let impuestoTotal = 0;
        const calculoPorTramos: TramoCalculado[] = [];
        let tramoAplicado = 'Exento';

        for (const tramo of TARIFAS_MARGINALES_2024) {
            if (baseUVT <= tramo.desde) {
                break; // No alcanza este tramo
            }

            // Calcular cuánto de la base cae en este tramo
            const baseEnTramo = Math.min(baseUVT, tramo.hasta) - tramo.desde;

            if (baseEnTramo > 0) {
                const impuestoTramo = baseEnTramo * this.uvt * tramo.tarifa;
                impuestoTotal += impuestoTramo;

                calculoPorTramos.push({
                    tramo: `${tramo.desde} - ${tramo.hasta === Infinity ? '∞' : tramo.hasta} UVT`,
                    baseTramo: baseEnTramo * this.uvt,
                    tarifa: tramo.tarifa * 100,
                    impuestoTramo
                });

                tramoAplicado = `${tramo.desde} - ${tramo.hasta === Infinity ? '∞' : tramo.hasta} UVT (${tramo.tarifa * 100}%)`;
            }
        }

        return {
            impuesto: impuestoTotal,
            calculoPorTramos,
            tramoAplicado
        };
    }

    /**
     * Calcula el límite de deducciones permitido
     * Según normativa, las deducciones no pueden exceder ciertos límites
     */
    calcularLimiteDeduccion(tipo: string, ingresosTotales: number): number {
        switch (tipo) {
            case 'SALUD':
                // Máximo 16 UVT mensuales = 192 UVT anuales
                return Math.min(192 * this.uvt, ingresosTotales * 0.1);

            case 'EDUCACION':
                // Sin límite específico, pero debe ser razonable
                return ingresosTotales * 0.15;

            case 'INTERESES_VIVIENDA':
                // Máximo 1200 UVT anuales
                return 1200 * this.uvt;

            case 'DEPENDIENTES':
                // 32 UVT mensuales por dependiente = 384 UVT anuales
                return 384 * this.uvt;

            // Límites para Personas Jurídicas (generalmente sin tope fijo por norma general, sino por soporte)
            // Se retorna un valor muy alto para indicar 'sin límite' o se maneja lógica específica
            case 'COSTO_MERCANCIA':
            case 'NOMINA':
            case 'SERVICIOS':
                return Infinity; // Deducible al 100% si tiene soporte

            case 'DEPRECIACION':
                // Depende del activo, retornamos Infinity por ahora
                return Infinity;

            default:
                return ingresosTotales * 0.1; // Default
        }
    }

    /**
     * Verifica si un contribuyente está obligado a declarar
     */
    estaObligadoDeclarar(params: {
        ingresosBrutos: number;
        patrimonioBruto: number;
        consumosTarjeta: number;
        compras: number;
        consignaciones: number;
    }): { obligado: boolean; razones: string[] } {
        const razones: string[] = [];
        let obligado = false;

        // Tope 1: Patrimonio bruto > 4500 UVT
        if (params.patrimonioBruto > 4500 * this.uvt) {
            obligado = true;
            razones.push(`Patrimonio bruto superior a 4500 UVT (${this.formatMoney(4500 * this.uvt)})`);
        }

        // Tope 2: Ingresos brutos > 1400 UVT
        if (params.ingresosBrutos > 1400 * this.uvt) {
            obligado = true;
            razones.push(`Ingresos brutos superiores a 1400 UVT (${this.formatMoney(1400 * this.uvt)})`);
        }

        // Tope 3: Consumos con tarjeta > 1400 UVT
        if (params.consumosTarjeta > 1400 * this.uvt) {
            obligado = true;
            razones.push(`Consumos con tarjeta superiores a 1400 UVT (${this.formatMoney(1400 * this.uvt)})`);
        }

        // Tope 4: Compras y consumos > 1400 UVT
        if (params.compras > 1400 * this.uvt) {
            obligado = true;
            razones.push(`Compras y consumos superiores a 1400 UVT (${this.formatMoney(1400 * this.uvt)})`);
        }

        // Tope 5: Consignaciones bancarias > 1400 UVT
        if (params.consignaciones > 1400 * this.uvt) {
            obligado = true;
            razones.push(`Consignaciones bancarias superiores a 1400 UVT (${this.formatMoney(1400 * this.uvt)})`);
        }

        if (!obligado) {
            razones.push('No cumple ningún tope para declarar');
        }

        return { obligado, razones };
    }

    /**
     * Formatea un valor monetario en pesos colombianos
     */
    private formatMoney(value: number): string {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(value);
    }

    /**
     * Obtiene el valor UVT actual
     */
    getUVT(): number {
        return this.uvt;
    }
}

/**
 * Instancia singleton del calculador con UVT 2024
 */
export const rentaCalculator = new RentaCalculator(UVT_2024);
