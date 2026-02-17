/**
 * Generador de Reportes Exógenos desde Contabilidad
 * Extrae información de transacciones, recaudos y facturación para consolidar datos de terceros
 */

import { v4 as uuidv4 } from 'uuid';
import { db, Exogeno, Account, Transaction, JournalEntry, Member, Customer } from '../db';

/**
 * Generador de Reportes Exógenos desde Contabilidad
 * Extrae información de transacciones, recaudos y facturación para consolidar datos de terceros
 */

import { v4 as uuidv4 } from 'uuid';
import { db, Exogeno, Account, Transaction, JournalEntry, Member, Customer } from '../db';

export class ExogenosGenerator {
    /**
     * Genera registros exógenos basados en el movimiento contable del año
     */
    async generateFromAccounting(organizationId: string, year: number, formats: string[] = ['1001', '1007']): Promise<{ count: number; total: number }> {
        try {
            if (!organizationId) throw new Error("Organization ID is required");

            const startDate = `${year}-01-01`;
            const endDate = `${year}-12-31`;

            // 1. Cargar datos base (optimizacion: cargar en memoria lo necesario)
            const transactions = await db.transactions
                .where('organization_id').equals(organizationId)
                .and(t => t.date >= startDate && t.date <= endDate)
                .toArray();

            const txIds = transactions.map(t => t.id);
            const entries = await db.journal_entries
                .where('transaction_id').anyOf(txIds)
                .toArray();

            const accounts = await db.accounts.where('organization_id').equals(organizationId).toArray();
            const members = await db.members.where('organization_id').equals(organizationId).toArray();
            const customers = await db.customers.where('organization_id').equals(organizationId).toArray();

            // Mapas de búsqueda rápida
            const accountMap = new Map(accounts.map(a => [a.id, a]));
            const memberMap = new Map(members.map(m => [m.id, m]));
            const customerMap = new Map(customers.map(c => [c.id, c]));
            const txMap = new Map(transactions.map(t => [t.id, t]));

            const consolidated = new Map<string, {
                monto: number;
                retencion: number;
                nombre: string;
                nit: string;
                concepto: string;
                formato: string;
            }>();

            // 2. Procesar Movimientos
            for (const entry of entries) {
                const account = accountMap.get(entry.account_id);
                if (!account) continue;

                const tx = txMap.get(entry.transaction_id);
                if (!tx) continue;

                // Identificar concepto y formato según la cuenta
                let formato = '';
                let concepto = '';

                // Lógica simplificada de mapeo (Debería ser configurable en DB)
                if (formats.includes('1001') && (account.code.startsWith('5') || account.code.startsWith('15') || account.code.startsWith('2365'))) {
                    // Gastos, Activos Fijos, Retenciones
                    formato = '1001';
                    concepto = '5001'; // Default: Honorarios (Ejemplo)

                    if (account.code.startsWith('5110')) concepto = '5001'; // Honorarios
                    else if (account.code.startsWith('5120')) concepto = '5002'; // Arrendamientos
                    else if (account.code.startsWith('5135')) concepto = '5003'; // Servicios
                } else if (formats.includes('1007') && account.code.startsWith('4')) {
                    // Ingresos
                    formato = '1007';
                    concepto = '4001'; // Ingresos Brutos
                }

                if (!formato) continue;

                // Identificar tercero
                let nit = '';
                let nombre = '';

                // Prioridad 1: Tercero explicito en el asiento (Si existiera en el modelo journal_entry)
                // Prioridad 2: Miembro (Contributions)
                // Prioridad 3: Cliente (Facturas)
                // Implementación actual basada en lo disponible:

                // Intento simple: buscar en contributions ligadas a la Tx
                // Nota: Esto es lento dentro del loop, idealmente pre-cargar relaciones
                // Para MVP asumimos que el generador puede tomar tiempo

                // Si es ingreso (1007) y hay factura
                if (formato === '1007' && tx.reference_no) { // Asumimos reference_no es invoice_id o similar
                    // Buscar factura (optimizar con mapa si fuera necesario)
                    // Aquí simplificamos usando el cliente si existiera el link
                }

                // Fallback: Si no hay tercero, se asigna a 'Cuantías Menores' (222222222)
                if (!nit) {
                    nit = '222222222';
                    nombre = 'CUANTIAS MENORES';
                }

                const key = `${formato}-${nit}-${concepto}`;
                const prev = consolidated.get(key) || {
                    monto: 0, retencion: 0,
                    nit, nombre, concepto, formato
                };

                // Calcular valores
                // Para 1001 (Gastos): Débito aumenta el gasto
                // Para 1007 (Ingresos): Crédito aumenta el ingreso
                let valorBase = 0;
                if (formato === '1001') {
                    if (account.code.startsWith('2365')) {
                        // Es retención
                        prev.retencion += (entry.credit - entry.debit);
                    } else {
                        // Es gasto/costo - Valor deducible
                        valorBase = (entry.debit - entry.credit);
                    }
                } else if (formato === '1007') {
                    valorBase = (entry.credit - entry.debit);
                }

                consolidated.set(key, {
                    ...prev,
                    monto: prev.monto + valorBase,
                    retencion: prev.retencion // Se actualiza arriba si es cuenta de retención
                });
            }

            // 3. Persistir Resultados
            const finalExogenos: Exogeno[] = [];
            let totalVal = 0;

            // Limpiar datos previos GENERADOS del año para evitar duplicados
            const deleted = await db.exogenos
                .where('organization_id').equals(organizationId)
                .and(e => e.periodo_fiscal === year && e.archivo_origen === 'GENERADO_AUTOMATICO')
                .delete();

            console.log(`[Generator] Eliminados ${deleted} registros generados previamente para el año ${year}`);

            for (const [key, data] of consolidated) {
                if (data.monto <= 0 && data.retencion <= 0) continue;

                finalExogenos.push({
                    id: uuidv4(),
                    organization_id: organizationId,
                    tipo_exogeno: data.formato === '1001' ? '0210' : '0220', // TODO: Mapear códigos DIAN reales
                    periodo_fiscal: year,
                    nit_informante: '',
                    nit_contribuyente: data.nit,
                    nombre_contribuyente: data.nombre,
                    concepto: data.concepto,
                    monto: data.monto,
                    retencion: data.retencion,
                    fecha_movimiento: new Date().toISOString(),
                    procesado: false,
                    validado: true, // Se considera validado interno
                    archivo_origen: 'GENERADO_AUTOMATICO',
                    created_at: new Date().toISOString(),
                    sync_status: 'pendiente'
                });
                totalVal += data.monto;
            }

            if (finalExogenos.length > 0) {
                await db.exogenos.bulkAdd(finalExogenos);
            }

            return { count: finalExogenos.length, total: totalVal };

        } catch (error) {
            console.error('Error in generateFromAccounting:', error);
            throw error;
        }
    }
}

export const exogenosGenerator = new ExogenosGenerator();
