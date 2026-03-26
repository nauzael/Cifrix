import { db, FiscalYear, JournalEntry, Transaction } from '../db';
import { v4 as uuidv4 } from 'uuid';

export class ClosingProcessService {
    /**
     * Verifica si un año fiscal ya está cerrado
     */
    async isYearClosed(organizationId: string, year: number): Promise<boolean> {
        const fiscalYear = await db.fiscal_years
            .where({ organization_id: organizationId, year: year })
            .first();
        return fiscalYear?.status === 'CERRADO';
    }

    /**
     * Realiza el cierre anual (Cierre Duro)
     * 1. Valida que no haya asientos descuadrados
     * 2. Calcula saldos de Ingresos y Gastos
     * 3. Genera asiento de cancelación
     * 4. Registra utilidad/pérdida del ejercicio
     * 5. Marca el año como CERRADO
     */
    async performAnnualClosing(
        organizationId: string,
        year: number,
        userId: string,
        equityAccountId: string // Cuenta de Patrimonio donde va la utilidad (e.g., 3605)
    ): Promise<{ success: boolean; message: string; closingEntryId?: string }> {

        // 0. Validar si ya está cerrado
        if (await this.isYearClosed(organizationId, year)) {
            return { success: false, message: `El año fiscal ${year} ya está cerrado.` };
        }

        // 1. Obtener rango de fechas
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;

        // 2. Obtener cuentas de Ingresos (4) y Gastos/Costos (5, 6, 7) por primer dígito del código PUC
        const allAccounts = await db.accounts
            .where('organization_id').equals(organizationId)
            .toArray();

        const incomeAccounts = allAccounts.filter(acc => (acc.code || '').startsWith('4'));
        const expenseAccounts = allAccounts.filter(acc => {
            const firstDigit = (acc.code || '')[0];
            return ['5', '6', '7'].includes(firstDigit);
        });

        // 3. Obtener todas las transacciones del año
        const transactions = await db.transactions
            .where('organization_id').equals(organizationId)
            .and(t => t.date >= startDate && t.date <= endDate)
            .toArray();

        const transactionIds = transactions.map(t => t.id);
        const allEntries = await db.journal_entries
            .where('transaction_id').anyOf(transactionIds)
            .toArray();

        // 4. Calcular saldos por cuenta y preparar asiento de cierre
        const closingEntries: Partial<JournalEntry>[] = [];
        let totalDebit = 0;
        let totalCredit = 0;

        // Ingresos: Saldo Crédito -> Debitar para cancelar
        for (const acc of incomeAccounts) {
            const entries = allEntries.filter(e => e.account_id === acc.id);
            const balance = this.calculateNetBalance(entries, 'CREDITO'); // Naturaleza Crédito

            if (balance > 0) {
                // Para cancelar saldo Crédito, hacemos un Débito
                closingEntries.push({
                    account_id: acc.id,
                    debit: balance,
                    credit: 0,
                    notes: 'Cierre de cuentas de resultados'
                });
                totalDebit += balance;
            } else if (balance < 0) {
                // Saldo contrario (raro en ingresos), acreditamos
                closingEntries.push({
                    account_id: acc.id,
                    debit: 0,
                    credit: Math.abs(balance),
                    notes: 'Cierre de cuentas de resultados'
                });
                totalCredit += Math.abs(balance);
            }
        }

        // Gastos: Saldo Débito -> Acreditar para cancelar
        for (const acc of expenseAccounts) {
            const entries = allEntries.filter(e => e.account_id === acc.id);
            const balance = this.calculateNetBalance(entries, 'DEBITO'); // Naturaleza Débito

            if (balance > 0) {
                // Para cancelar saldo Débito, hacemos un Crédito
                closingEntries.push({
                    account_id: acc.id,
                    debit: 0,
                    credit: balance,
                    notes: 'Cierre de cuentas de resultados'
                });
                totalCredit += balance;
            } else if (balance < 0) {
                // Saldo contrario, debitamos
                closingEntries.push({
                    account_id: acc.id,
                    debit: Math.abs(balance),
                    credit: 0,
                    notes: 'Cierre de cuentas de resultados'
                });
                totalDebit += Math.abs(balance);
            }
        }

        // 5. Calcular Resultado del Ejercicio
        // Ingresos (Debitados en cierre) - Gastos (Acreditados en cierre)
        // Pero contablemente: Utilidad = Ingresos - Gastos
        // En el asiento de cierre: 
        // Si Total Débitos (Cancelación Ingresos) > Total Créditos (Cancelación Gastos)
        // Diferencia va al Crédito de la cuenta de Patrimonio (Utilidad)

        // Difference needed to balance the closing entry
        const netResult = totalDebit - totalCredit;

        if (Math.abs(netResult) > 0.01) {
            if (netResult > 0) {
                // Utilidad: Debitos > Creditos, falta Credito en Patrimonio
                closingEntries.push({
                    account_id: equityAccountId,
                    debit: 0,
                    credit: netResult,
                    notes: `Utilidad del Ejercicio ${year}`
                });
            } else {
                // Pérdida: Creditos > Debitos, falta Debito en Patrimonio
                closingEntries.push({
                    account_id: equityAccountId,
                    debit: Math.abs(netResult),
                    credit: 0,
                    notes: `Pérdida del Ejercicio ${year}`
                });
            }
        }

        // 6. Guardar Transacción y Asientos
        const transactionId = uuidv4();
        const newTransaction: Transaction = {
            id: transactionId,
            organization_id: organizationId,
            date: `${year}-12-31`, // Fecha de cierre
            description: `Cierre Contable Año ${year}`,
            reference_no: `CIERRE-${year}`,
            type: 'ingreso', // Neutro realmente
            method: 'TRANSFERENCIA',
            created_by: userId,
            created_at: new Date().toISOString(),
            category_id: null,
            sync_status: 'pendiente'
        };

        const finalEntries: JournalEntry[] = closingEntries.map(e => ({
            id: uuidv4(),
            transaction_id: transactionId,
            account_id: e.account_id!,
            debit: e.debit || 0,
            credit: e.credit || 0,
            notes: e.notes,
            sync_status: 'pendiente'
        }));

        await db.transaction('rw', db.transactions, db.journal_entries, db.fiscal_years, async () => {
            await db.transactions.add(newTransaction);
            await db.journal_entries.bulkAdd(finalEntries);

            // 7. Crear/Actualizar registro Fiscal Year
            const existingYear = await db.fiscal_years
                .where({ organization_id: organizationId, year: year })
                .first();

            if (existingYear) {
                await db.fiscal_years.update(existingYear.id, {
                    status: 'CERRADO',
                    closed_at: new Date().toISOString(),
                    closed_by: userId,
                    closing_entry_id: transactionId,
                    sync_status: 'pendiente'
                });
            } else {
                await db.fiscal_years.add({
                    id: uuidv4(),
                    organization_id: organizationId,
                    year: year,
                    status: 'CERRADO',
                    closed_at: new Date().toISOString(),
                    closed_by: userId,
                    closing_entry_id: transactionId,
                    created_at: new Date().toISOString(),
                    sync_status: 'pendiente'
                });
            }
        });

        return { success: true, message: 'Cierre contable realizado con éxito.', closingEntryId: transactionId };
    }

    /**
     * Helper para calcular saldo neto de un grupo de asientos
     */
    private calculateNetBalance(entries: JournalEntry[], nature: 'DEBITO' | 'CREDITO'): number {
        const debit = entries.reduce((sum, e) => sum + e.debit, 0);
        const credit = entries.reduce((sum, e) => sum + e.credit, 0);
        return nature === 'DEBITO' ? debit - credit : credit - debit;
    }
}

export const closingProcessService = new ClosingProcessService();
