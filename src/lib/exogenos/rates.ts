/**
 * Tasas de Retención en la Fuente - Colombia
 * Este archivo centraliza los porcentajes de retención según el año fiscal y el concepto
 * Referencia: Estatuto Tributario
 */

export interface TaxRate {
    year: number;
    concept: string;
    rate: number; // Decimal (0.025 = 2.5%)
    threshold_uvt?: number; // Base mínima en UVT si aplica
}

const UVT_VALUES: Record<number, number> = {
    2024: 47065,
    2023: 42412,
    2022: 38004
};

export function getUVTForYear(year: number): number {
    return UVT_VALUES[year] || UVT_VALUES[2024]; // Fallback to 2024
}

const RETENTION_RATES: TaxRate[] = [
    // --- AÑO 2024 ---
    { year: 2024, concept: '5001', rate: 0.0, threshold_uvt: 0 }, // Laboral (progresivo, simplificado aquí)
    { year: 2024, concept: '5002', rate: 0.11 }, // Honorarios PJ
    { year: 2024, concept: '5003', rate: 0.11 }, // Comisiones
    { year: 2024, concept: '5004', rate: 0.04, threshold_uvt: 4 }, // Servicios
    { year: 2024, concept: '5005', rate: 0.035, threshold_uvt: 27 }, // Arrendamientos
    { year: 2024, concept: '5006', rate: 0.025, threshold_uvt: 27 }, // Compras
    { year: 2024, concept: '5007', rate: 0.11 }, // Seguros

    // --- AÑO 2023 ---
    { year: 2023, concept: '5001', rate: 0.0 },
    { year: 2023, concept: '5002', rate: 0.11 },
    { year: 2023, concept: '5004', rate: 0.04, threshold_uvt: 4 },
    { year: 2023, concept: '5005', rate: 0.035, threshold_uvt: 27 },
    { year: 2023, concept: '5006', rate: 0.025, threshold_uvt: 27 },
];

/**
 * Obtiene la tasa de retención aplicable para un año y concepto
 */
export function getRetentionRate(year: number, concept: string): number {
    // Intentar encontrar la tasa específica
    const rate = RETENTION_RATES.find(r => r.year === year && r.concept === concept);
    if (rate) return rate.rate;

    // Fallback: Buscar el concepto en el año más reciente anterior al solicitado
    const fallback = RETENTION_RATES
        .filter(r => r.concept === concept && r.year <= year)
        .sort((a, b) => b.year - a.year)[0];

    return fallback ? fallback.rate : 0;
}

/**
 * Calcula la retención esperada
 */
export function calculateExpectedRetention(year: number, concept: string, amount: number): number {
    const uvtValue = getUVTForYear(year);
    const rateInfo = RETENTION_RATES.find(r => r.year === year && r.concept === concept);
    if (!rateInfo) return 0;

    // Verificar base mínima
    if (rateInfo.threshold_uvt) {
        const threshold = rateInfo.threshold_uvt * uvtValue;
        if (amount < threshold) return 0;
    }

    return Math.round(amount * rateInfo.rate);
}
