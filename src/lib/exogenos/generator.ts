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
    async generateFromAccounting(organizationId: string, year: number): Promise<{ count: number; total: number }> {
        try {
            if (!organizationId) throw new Error("Organization ID is required");

            const startDate = `${year}-01-01`;
            const endDate = `${year}-12-31`;

            // 1. Obtener todas las transacciones del periodo
            const transactions = await db.transactions
                .where('organization_id').equals(organizationId)
                .and(t => t.date >= startDate && t.date <= endDate)
                .toArray();

            // 2. Obtener asientos contables para esas transacciones
            const txIds = transactions.map(t => t.id);
            const entries = await db.journal_entries
                .where('transaction_id').anyOf(txIds)
                .toArray();

            // 3. Obtener cuentas para identificar tipos (Ingresos/Gastos)
            const accounts = await db.accounts
                .where('organization_id').equals(organizationId)
                .toArray();

            // 4. Mapear terceros (Miembros y Clientes)
            const members = await db.members.where('organization_id').equals(organizationId).toArray();
            const customers = await db.customers.where('organization_id').equals(organizationId).toArray();

            // Relaciones Transaction -> Contribution / Invoice
            const contributions = await db.contributions.where('transaction_id').anyOf(txIds).toArray();
            const invoices = await db.invoices.where('organization_id').equals(organizationId).toArray();
            const payments = await db.payments.where('organization_id').equals(organizationId).toArray();

            // Consolidar datos por Tercero + Concepto
            const consolidated = new Map<string, {
                monto: number;
                retencion: number;
                nombre: string;
                nit: string;
                concepto: string;
            }>();

            for (const tx of transactions) {
                const txEntries = entries.filter(e => e.transaction_id === tx.id);
                if (txEntries.length === 0) continue;

                // Intentar identificar el tercero
                let thirdParty: { nit: string; nombre: string } | null = null;

                // Caso A: Es una contribución (Miembro)
                const contribution = contributions.find(c => c.transaction_id === tx.id);
                if (contribution && contribution.member_id) {
                    const member = members.find(m => m.id === contribution.member_id);
                    if (member && member.document_id) {
                        thirdParty = { nit: member.document_id, nombre: member.full_name };
                    }
                }

                // Caso B: Está ligado a una factura (Cliente)
                // Buscamos si hay un pago ligado a esta transacción que a su vez liga a una factura
                const payment = payments.find(p => p.id === tx.reference_no); // Algunos sistemas ligan así
                // O buscamos en facturas directamente
                const invoice = invoices.find(inv => inv.id === tx.reference_no);

                if (invoice) {
                    const customer = customers.find(c => c.id === invoice.customer_id);
                    if (customer && customer.tax_id) {
                        thirdParty = { nit: customer.tax_id, nombre: customer.name };
                    }
                }

                if (!thirdParty) continue; // Si no hay tercero identificado, no se puede reportar en exógenas

                // Procesar cada asiento para identificar ingresos o retenciones
                for (const entry of txEntries) {
                    const acc = accounts.find(a => a.id === entry.account_id);
                    if (!acc) continue;

                    let monto = 0;
                    let retencion = 0;
                    let concepto = acc.code.substring(0, 4); // Concepto simplificado por cuenta

                    // Si es cuenta de ingreso (4) o egreso (5)
                    if (acc.type === 'INGRESO' || acc.type === 'EGRESO') {
                        monto = acc.nature === 'DEBITO' ? entry.debit - entry.credit : entry.credit - entry.debit;
                    }

                    // Si es cuenta de retención (ej: 2365)
                    if (acc.code.startsWith('2365') || acc.code.startsWith('1355')) {
                        retencion = Math.abs(entry.credit - entry.debit);
                    }

                    if (monto === 0 && retencion === 0) continue;

                    const key = `${thirdParty.nit}-${concepto}`;
                    const prev = consolidated.get(key) || {
                        monto: 0,
                        retencion: 0,
                        nit: thirdParty.nit,
                        nombre: thirdParty.nombre,
                        concepto
                    };

                    consolidated.set(key, {
                        ...prev,
                        monto: prev.monto + monto,
                        retencion: prev.retencion + retencion
                    });
                }
            }

            // 5. Guardar en la tabla de exógenos
            const finalExogenos: Exogeno[] = [];
            let totalVal = 0;

            for (const [key, data] of consolidated) {
                if (Math.abs(data.monto) < 0.01 && Math.abs(data.retencion) < 0.01) continue;

                finalExogenos.push({
                    id: uuidv4(),
                    organization_id: organizationId,
                    tipo_exogeno: '0210', // Predeterminado
                    periodo_fiscal: year,
                    nit_informante: '', // Se completa en el perfil
                    nit_contribuyente: data.nit,
                    nombre_contribuyente: data.nombre,
                    concepto: data.concepto,
                    monto: Math.abs(data.monto),
                    retencion: data.retencion,
                    fecha_movimiento: new Date().toISOString(),
                    procesado: false,
                    validado: true,
                    created_at: new Date().toISOString(),
                    sync_status: 'pendiente'
                });
                totalVal += Math.abs(data.monto);
            }

            if (finalExogenos.length > 0) {
                await db.exogenos.bulkAdd(finalExogenos);
            }

            return {
                count: finalExogenos.length,
                total: totalVal
            };
        } catch (error) {
            console.error('Error in generateFromAccounting:', error);
            throw error;
        }
    }
}

export const exogenosGenerator = new ExogenosGenerator();
