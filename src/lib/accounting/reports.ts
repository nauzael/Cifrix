import { db, Account, JournalEntry } from '../db';

export interface FinancialReportData {
    generatedAt: string;
    organizationName: string;
    period: string;
    currency: string;
    sections: ReportSection[];
    summary?: any;
}

export interface ReportSection {
    title: string;
    groups: ReportGroup[];
    total: number;
}

export interface ReportGroup {
    name: string;
    accounts: ReportAccount[];
    total: number;
}

export interface ReportAccount {
    code: string;
    name: string;
    balance: number;
    previousBalance?: number; // Para comparativos
}

export class FinancialReportsService {

    /**
     * Genera el Balance General (Estado de Situación Financiera)
     */
    async getBalanceSheet(organizationId: string, cutOffDate: string): Promise<FinancialReportData> {
        const org = await db.organizations.get(organizationId);
        if (!org) throw new Error('Organización no encontrada');

        // 1. Obtener cuentas y saldos
        const accounts = await db.accounts
            .where('organization_id').equals(organizationId)
            .filter(a => ['ACTIVO', 'PASIVO', 'PATRIMONIO'].includes(a.type))
            .toArray();

        const transactions = await db.transactions
            .where('organization_id').equals(organizationId)
            .and(t => t.date <= cutOffDate)
            .toArray();

        const transactionIds = transactions.map(t => t.id);
        const allEntries = await db.journal_entries
            .where('transaction_id').anyOf(transactionIds)
            .toArray();

        // 2. Calcular saldos
        const accountBalances = accounts.map(acc => {
            const entries = allEntries.filter(e => e.account_id === acc.id);
            const balance = this.calculateNetBalance(entries, acc.nature);
            return { ...acc, balance };
        }).filter(a => Math.abs(a.balance) > 0.01); // Filtrar saldo cero

        // 3. Calcular Resultado del Ejercicio (hasta la fecha de corte)
        // Esto es necesario porque el Balance debe cuadrar A = P + PT + Resultado
        const incomeExpenseBalance = await this.calculatePnLResult(organizationId, cutOffDate);

        // 4. Estructurar reporte
        const assets = accountBalances.filter(a => a.type === 'ACTIVO');
        const liabilities = accountBalances.filter(a => a.type === 'PASIVO');
        const equity = accountBalances.filter(a => a.type === 'PATRIMONIO');

        const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
        const totalLiabilities = liabilities.reduce((sum, a) => sum + a.balance, 0);
        const totalEquity = equity.reduce((sum, a) => sum + a.balance, 0) + incomeExpenseBalance;

        return {
            generatedAt: new Date().toISOString(),
            organizationName: org.name,
            period: `A corte de ${cutOffDate}`,
            currency: 'COP',
            sections: [
                {
                    title: 'ACTIVOS',
                    groups: [{ name: 'Activos', accounts: this.mapToReportAccounts(assets), total: totalAssets }],
                    total: totalAssets
                },
                {
                    title: 'PASIVOS',
                    groups: [{ name: 'Pasivos', accounts: this.mapToReportAccounts(liabilities), total: totalLiabilities }],
                    total: totalLiabilities
                },
                {
                    title: 'PATRIMONIO',
                    groups: [
                        { name: 'Patrimonio', accounts: this.mapToReportAccounts(equity), total: totalEquity - incomeExpenseBalance },
                        { name: 'Resultado del Ejercicio', accounts: [{ code: '3605', name: 'Utilidad/Pérdida del Ejercicio', balance: incomeExpenseBalance }], total: incomeExpenseBalance }
                    ],
                    total: totalEquity
                }
            ],
            summary: {
                isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
                difference: totalAssets - (totalLiabilities + totalEquity)
            }
        };
    }

    /**
     * Genera el Estado de Resultados (P&L)
     */
    async getIncomeStatement(organizationId: string, startDate: string, endDate: string): Promise<FinancialReportData> {
        const org = await db.organizations.get(organizationId);
        if (!org) throw new Error('Organización no encontrada');

        const accounts = await db.accounts
            .where('organization_id').equals(organizationId)
            .filter(a => ['INGRESO', 'EGRESO'].includes(a.type))
            .toArray();

        const transactions = await db.transactions
            .where('organization_id').equals(organizationId)
            .and(t => t.date >= startDate && t.date <= endDate)
            .toArray();

        const transactionIds = transactions.map(t => t.id);
        const allEntries = await db.journal_entries
            .where('transaction_id').anyOf(transactionIds)
            .toArray();

        const accountBalances = accounts.map(acc => {
            const entries = allEntries.filter(e => e.account_id === acc.id);
            const balance = this.calculateNetBalance(entries, acc.nature);
            return { ...acc, balance };
        }).filter(a => Math.abs(a.balance) > 0.01);

        const income = accountBalances.filter(a => a.type === 'INGRESO');
        const expenses = accountBalances.filter(a => a.type === 'EGRESO');

        const totalIncome = income.reduce((sum, a) => sum + a.balance, 0);
        const totalExpenses = expenses.reduce((sum, a) => sum + a.balance, 0);
        const netResult = totalIncome - totalExpenses;

        return {
            generatedAt: new Date().toISOString(),
            organizationName: org.name,
            period: `Del ${startDate} al ${endDate}`,
            currency: 'COP',
            sections: [
                {
                    title: 'INGRESOS',
                    groups: [{ name: 'Ingresos Operacionales', accounts: this.mapToReportAccounts(income), total: totalIncome }],
                    total: totalIncome
                },
                {
                    title: 'GASTOS',
                    groups: [{ name: 'Gastos Operacionales', accounts: this.mapToReportAccounts(expenses), total: totalExpenses }],
                    total: totalExpenses
                }
            ],
            summary: {
                netResult
            }
        };
    }

    /**
     * Genera el Estado de Flujo de Efectivo (Método Directo Simplificado)
     */
    async getCashFlowStatement(organizationId: string, startDate: string, endDate: string): Promise<FinancialReportData> {
        const org = await db.organizations.get(organizationId);
        if (!org) throw new Error('Organización no encontrada');

        // 1. Resultado del Ejercicio
        const netResult = await this.calculatePnLResult(organizationId, endDate);

        // 2. Obtener cuentas con categorías de flujo
        const accounts = await db.accounts
            .where('organization_id').equals(organizationId)
            .toArray();

        // 3. Calcular variaciones de saldos entre startDate (inicio) y endDate (fin)
        const categories = {
            OPERACION: [] as ReportAccount[],
            INVERSION: [] as ReportAccount[],
            FINANCIACION: [] as ReportAccount[]
        };

        let totalOperacion = netResult; // Iniciamos con la utilidad neta
        let totalInversion = 0;
        let totalFinanciacion = 0;

        for (const acc of accounts) {
            if (!acc.cash_flow_category) continue;

            const initialBalance = await this.calculateAccountBalance(acc.id, startDate, 'before');
            const finalBalance = await this.calculateAccountBalance(acc.id, endDate, 'on');
            const variation = finalBalance - initialBalance;

            if (Math.abs(variation) < 0.01) continue;

            // En el método indirecto:
            // - Aumento en Activo -> Salida de efectivo (-)
            // - Disminución en Activo -> Entrada de efectivo (+)
            // - Aumento en Pasivo/Patrimonio -> Entrada de efectivo (+)
            // - Disminución en Pasivo/Patrimonio -> Salida de efectivo (-)

            const cashImpact = acc.type === 'ACTIVO' ? -variation : variation;

            const reportAcc: ReportAccount = {
                code: acc.code,
                name: acc.name,
                balance: cashImpact
            };

            if (acc.cash_flow_category === 'OPERACION') {
                categories.OPERACION.push(reportAcc);
                totalOperacion += cashImpact;
            } else if (acc.cash_flow_category === 'INVERSION') {
                categories.INVERSION.push(reportAcc);
                totalInversion += cashImpact;
            } else if (acc.cash_flow_category === 'FINANCIACION') {
                categories.FINANCIACION.push(reportAcc);
                totalFinanciacion += cashImpact;
            }
        }

        const initialCash = await this.calculateAccountGroupBalance(organizationId, '11', startDate, 'before');
        const finalCash = await this.calculateAccountGroupBalance(organizationId, '11', endDate, 'on');

        return {
            generatedAt: new Date().toISOString(),
            organizationName: org.name,
            period: `Del ${startDate} al ${endDate}`,
            currency: 'COP',
            sections: [
                {
                    title: 'ACTIVIDADES DE OPERACIÓN',
                    groups: [
                        { name: 'Utilidad Neta del Ejercicio', accounts: [], total: netResult },
                        { name: 'Ajustes y Cambios en Capital de Trabajo', accounts: categories.OPERACION, total: totalOperacion - netResult }
                    ],
                    total: totalOperacion
                },
                {
                    title: 'ACTIVIDADES DE INVERSIÓN',
                    groups: [{ name: 'Movimientos de Inversión', accounts: categories.INVERSION, total: totalInversion }],
                    total: totalInversion
                },
                {
                    title: 'ACTIVIDADES DE FINANCIACIÓN',
                    groups: [{ name: 'Movimientos de Financiación', accounts: categories.FINANCIACION, total: totalFinanciacion }],
                    total: totalFinanciacion
                },
                {
                    title: 'RESUMEN DE EFECTIVO',
                    groups: [
                        { name: 'Saldo Inicial', accounts: [], total: initialCash },
                        { name: 'Aumento/Disminución Neto', accounts: [], total: totalOperacion + totalInversion + totalFinanciacion },
                        { name: 'Saldo Final (Verificado)', accounts: [], total: finalCash }
                    ],
                    total: finalCash
                }
            ],
            summary: {
                netChange: totalOperacion + totalInversion + totalFinanciacion,
                isBalanced: Math.abs((initialCash + (totalOperacion + totalInversion + totalFinanciacion)) - finalCash) < 1.0
            }
        };
    }

    private async calculateAccountBalance(accountId: string, date: string, mode: 'on' | 'before'): Promise<number> {
        const acc = await db.accounts.get(accountId);
        if (!acc) return 0;

        const transactions = await db.transactions
            .where('organization_id').equals(acc.organization_id)
            .and(t => mode === 'on' ? t.date <= date : t.date < date)
            .toArray();

        const txIds = transactions.map(t => t.id);
        const entries = await db.journal_entries
            .where('transaction_id').anyOf(txIds)
            .filter(e => e.account_id === accountId)
            .toArray();

        return this.calculateNetBalance(entries, acc.nature);
    }

    /**
     * Genera el Estado de Cambios en el Patrimonio
     */
    async getEquityChangesStatement(organizationId: string, startDate: string, endDate: string): Promise<FinancialReportData> {
        const org = await db.organizations.get(organizationId);
        if (!org) throw new Error('Organización no encontrada');

        // Saldo inicial de patrimonio
        const initialEquity = await this.calculateAccountGroupBalance(organizationId, '3', startDate, 'before');

        // Resultado del periodo anterior (acumulado)
        // Movimientos del periodo en cuentas 3xxx
        const equityAccounts = await db.accounts
            .where('organization_id').equals(organizationId)
            .filter(a => a.code.startsWith('3'))
            .toArray();

        const transactions = await db.transactions
            .where('organization_id').equals(organizationId)
            .and(t => t.date >= startDate && t.date <= endDate)
            .toArray();

        const transactionIds = transactions.map(t => t.id);
        const entries = await db.journal_entries
            .where('transaction_id').anyOf(transactionIds)
            .filter(e => equityAccounts.map(a => a.id).includes(e.account_id))
            .toArray();

        // Agrupar por cuenta
        const equityMovements = equityAccounts.map(acc => {
            const accEntries = entries.filter(e => e.account_id === acc.id);
            const netMovement = this.calculateNetBalance(accEntries, acc.nature); // Movimiento neto del periodo
            return {
                code: acc.code,
                name: acc.name,
                balance: netMovement // Aquí balance representa la variación
            };
        }).filter(a => Math.abs(a.balance) > 0.01);

        const totalVariations = equityMovements.reduce((sum, a) => sum + a.balance, 0);

        // Resultado del ejercicio actual
        const currentResult = await this.calculatePnLResult(organizationId, endDate); // Resultado acumulado a la fecha final

        // Ajuste: El resultado del ejercicio actual es parte del patrimonio final, pero no necesariamente una "variación" de cuenta 3xxx directa si no se ha cerrado.
        // Si el año NO se ha cerrado, el resultado está en P&L (cuentas 4, 5, 6) y se suma al patrimonio final.
        // Si el año YA se ha cerrado, el resultado ya está en una cuenta 3xxx (Resultado del Ejercicio) y se incluye en equityMovements.
        // Asumiremos lógica de reporte "en proceso" donde sumamos el resultado actual.

        const finalEquity = initialEquity + totalVariations + currentResult;

        return {
            generatedAt: new Date().toISOString(),
            organizationName: org.name,
            period: `Del ${startDate} al ${endDate}`,
            currency: 'COP',
            sections: [
                {
                    title: 'PATRIMONIO INICIAL',
                    groups: [{ name: 'Saldo al Inicio', accounts: [], total: initialEquity }],
                    total: initialEquity
                },
                {
                    title: 'VARIACIONES DEL PERIODO',
                    groups: [{ name: 'Movimientos Patrimoniales', accounts: this.mapToReportAccounts(equityMovements), total: totalVariations }],
                    total: totalVariations
                },
                {
                    title: 'RESULTADO DEL EJERCICIO',
                    groups: [{ name: 'Utilidad/Pérdida Neta', accounts: [], total: currentResult }],
                    total: currentResult
                },
                {
                    title: 'PATRIMONIO FINAL',
                    groups: [],
                    total: initialEquity + totalVariations + currentResult
                }
            ],
            summary: {
                totalEquity: finalEquity
            }
        };
    }

    // Helper privado para calcular resultado del ejercicio
    private async calculatePnLResult(organizationId: string, cutOffDate: string): Promise<number> {
        // Asumimos desde el inicio del año fiscal hasta la fecha de corte
        const year = new Date(cutOffDate).getFullYear();
        const startDate = `${year}-01-01`;

        // Reutilizamos la lógica de P&L pero solo retornando el neto
        const pnL = await this.getIncomeStatement(organizationId, startDate, cutOffDate);
        return pnL.summary.netResult;
    }

    private calculateNetBalance(entries: JournalEntry[], nature: 'DEBITO' | 'CREDITO'): number {
        const debit = entries.reduce((sum, e) => sum + e.debit, 0);
        const credit = entries.reduce((sum, e) => sum + e.credit, 0);
        return nature === 'DEBITO' ? debit - credit : credit - debit;
    }

    private async calculateAccountGroupBalance(organizationId: string, codePrefix: string, date: string, mode: 'on' | 'before'): Promise<number> {
        const operator = mode === 'on' ? '<=' : '<';

        const accounts = await db.accounts
            .where('organization_id').equals(organizationId)
            .filter(a => a.code.startsWith(codePrefix))
            .toArray();

        const transactions = await db.transactions
            .where('organization_id').equals(organizationId)
            .and(t => t.date <= date && (mode === 'on' || t.date < date)) // Dexie string comparison
            .toArray();

        // Fix logic: Dexie filter above is approximate for operators on strings if not indexed exactly.
        // Better filter manually:
        const validTransactions = transactions.filter(t => mode === 'on' ? t.date <= date : t.date < date);
        const validTxIds = validTransactions.map(t => t.id);

        const entries = await db.journal_entries
            .where('transaction_id').anyOf(validTxIds)
            .filter(e => accounts.map(a => a.id).includes(e.account_id))
            .toArray();

        let total = 0;
        for (const acc of accounts) {
            const accEntries = entries.filter(e => e.account_id === acc.id);
            total += this.calculateNetBalance(accEntries, acc.nature);
        }
        return total;
    }

    private mapToReportAccounts(accounts: any[]): ReportAccount[] {
        return accounts.map(a => ({
            code: a.code,
            name: a.name,
            balance: a.balance
        }));
    }
}

export const financialReportsService = new FinancialReportsService();
