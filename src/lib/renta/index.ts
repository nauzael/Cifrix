/**
 * Índice de exportación para el módulo de Renta
 * Centraliza todas las exportaciones del módulo
 */

// Calculator
export {
    RentaCalculator,
    rentaCalculator,
    UVT_2024,
    type ResultadoCalculo,
    type DetalleCalculo,
    type TramoCalculado
} from './calculator';

// Validator
export {
    RentaValidator,
    rentaValidator,
    type ResultadoValidacion,
    type ValidacionDetallada
} from './validator';

// Generators
export {
    RentaPDFGenerator,
    rentaPDFGenerator,
    type OpcionesPDF
} from './generators/pdf';

export {
    DIANXMLGenerator,
    dianXMLGenerator
} from './generators/dian-xml';
