/**
 * Index de servicios para el módulo de Exógenos
 */

export * from './parser';
export * from './validator';

import { exogenosParser } from './parser';
import { exogenosValidator } from './validator';

export const exogenosService = {
    parser: exogenosParser,
    validator: exogenosValidator
};
