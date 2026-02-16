/**
 * Index de servicios para el módulo de Exógenos
 */

export * from './parser';
export * from './validator';
export * from './generator';

import { exogenosParser } from './parser';
import { exogenosValidator } from './validator';
import { exogenosGenerator } from './generator';

export const exogenosService = {
    parser: exogenosParser,
    validator: exogenosValidator,
    generator: exogenosGenerator
};
