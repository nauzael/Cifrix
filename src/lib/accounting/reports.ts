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
    previousBalance?: number;
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
     * Genera el Estado de Flujo de Efectivo (Método Indirecto Simplificado)
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

        // 3. Calcular variaciones
        const categories = {
            OPERACION: [] as ReportAccount[],
            INVERSION: [] as ReportAccount[],
            FINANCIACION: [] as ReportAccount[]
        };

        let totalOperacion = netResult; 
        let totalInversion = 0;
        let totalFinanciacion = 0;

        for (const acc of accounts) {
            if (!acc.cash_flow_category) continue;

            const initialBalance = await this.calculateAccountBalance(acc.id, startDate, 'before');
            const finalBalance = await this.calculateAccountBalance(acc.id, endDate, 'on');
            const variation = finalBalance - initialBalance;

            if (Math.abs(variation) < 0.01) continue;

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
                isBalanced: Math.abs((initialCash + (totalOperacion + totalInversion + totalFinanciacion)) - finalCash) < 1.0,
                difference: (initialCash + (totalOperacion + totalInversion + totalFinanciacion)) - finalCash
            }
        };
    }

    /**
     * Genera el Estado de Cambios en el Patrimonio
     */
    async getEquityChangesStatement(organizationId: string, startDate: string, endDate: string): Promise<FinancialReportData> {
        const org = await db.organizations.get(organizationId);
        if (!org) throw new Error('Organización no encontrada');

        const initialEquity = await this.calculateAccountGroupBalance(organizationId, '3', startDate, 'before');

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
            .toArray();

        const equityMovements = equityAccounts.map(acc => {
            const accEntries = entries.filter(e => e.account_id === acc.id);
            const netMovement = this.calculateNetBalance(accEntries, acc.nature);
            return { code: acc.code, name: acc.name, balance: netMovement };
        }).filter(a => Math.abs(a.balance) > 0.01);

        const totalVariations = equityMovements.reduce((sum, a) => sum + a.balance, 0);
        const currentResult = await this.calculatePnLResult(organizationId, endDate);
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
                    total: finalEquity
                }
            ],
            summary: {
                totalEquity: finalEquity
            }
        };
    }

    /**
     * Genera los datos resumidos para la renovación de Cámara de Comercio (RUES)
     */
    async getRUESData(organizationId: string, year: number): Promise<any> {
        const org = await db.organizations.get(organizationId);
        if (!org) throw new Error('Organización no encontrada');

        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;

        const accounts = await db.accounts
            .where('organization_id').equals(organizationId)
            .toArray();

        const transactions = await db.transactions
            .where('organization_id').equals(organizationId)
            .and(t => t.date <= endDate)
            .toArray();

        const txIds = transactions.map(t => t.id);
        const entries = await db.journal_entries
            .where('transaction_id').anyOf(txIds)
            .toArray();

        const balances = accounts.map(acc => {
            const accEntries = entries.filter(e => e.account_id === acc.id);
            const yearEntries = accEntries.filter(e => {
                const tx = transactions.find(t => t.id === e.transaction_id);
                return tx && tx.date >= startDate && tx.date <= endDate;
            });

            const isPnL = ['4', '5', '6', '7'].includes(acc.code[0]);
            const balance = this.calculateNetBalance(isPnL ? yearEntries : accEntries, acc.nature);
            return { code: acc.code, balance };
        }).filter(b => Math.abs(b.balance) > 0.01);

        const getGroupBalance = (prefixes: string[]) => 
            balances.filter(b => prefixes.some(p => b.code.startsWith(p)))
                    .reduce((sum, b) => sum + b.balance, 0);

        const activoCorriente = getGroupBalance(['11', '12', '13', '14', '19']);
        const activoNoCorriente = getGroupBalance(['15', '16', '17', '18']);
        const pasivoCorriente = getGroupBalance(['21', '22', '23', '24', '25', '26', '27']);
        const pasivoNoCorriente = getGroupBalance(['29']);
        const patrimonioNeto = getGroupBalance(['3']);

        const ingresosOrdinarios = getGroupBalance(['41']);
        const otrosIngresos = getGroupBalance(['42']);
        const costoVentas = getGroupBalance(['6']);
        const gastosAdmin = getGroupBalance(['51']);
        const gastosVenta = getGroupBalance(['52']);
        const gastosFinancieros = getGroupBalance(['5305']);
        const otrosGastos = getGroupBalance(['53', '54', '59']) - gastosFinancieros;

        const utilidadOperacional = ingresosOrdinarios - (gastosAdmin + gastosVenta + costoVentas);
        const utilidadNeta = (ingresosOrdinarios + otrosIngresos) - (gastosAdmin + gastosVenta + costoVentas + otrosGastos + gastosFinancieros);

        return {
            year,
            organizationName: org.name,
            taxId: org.tax_id,
            data: {
                activoCorriente,
                activoNoCorriente,
                activoTotal: activoCorriente + activoNoCorriente,
                pasivoCorriente,
                pasivoNoCorriente,
                pasivoTotal: pasivoCorriente + pasivoNoCorriente,
                patrimonioNeto: patrimonioNeto + utilidadNeta,
                pasivoPatrimonio: (pasivoCorriente + pasivoNoCorriente) + (patrimonioNeto + utilidadNeta),
                ingresosOrdinarios,
                otrosIngresos,
                ingresosTotales: ingresosOrdinarios + otrosIngresos,
                costoVentas,
                gastosAdmin,
                gastosVenta,
                otrosGastos,
                gastosFinancieros,
                utilidadOperacional,
                utilidadNeta
            }
        };
    }

    // Helpers privados
    
    private calculateNetBalance(entries: JournalEntry[], nature: 'DEBITO' | 'CREDITO'): number {
        const debit = entries.reduce((sum, e) => sum + e.debit, 0);
        const credit = entries.reduce((sum, e) => sum + e.credit, 0);
        return nature === 'DEBITO' ? debit - credit : credit - debit;
    }

    private async calculatePnLResult(organizationId: string, cutOffDate: string): Promise<number> {
        const year = new Date(cutOffDate).getFullYear();
        const startDate = `${year}-01-01`;
        const pnL = await this.getIncomeStatement(organizationId, startDate, cutOffDate);
        return pnL.summary.netResult;
    }

    private mapToReportAccounts(accounts: any[]): ReportAccount[] {
        return accounts.map(a => ({
            code: a.code,
            name: a.name,
            balance: a.balance
        }));
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

    private async calculateAccountGroupBalance(organizationId: string, codePrefix: string, date: string, mode: 'on' | 'before'): Promise<number> {
        const accounts = await db.accounts
            .where('organization_id').equals(organizationId)
            .filter(a => a.code.startsWith(codePrefix))
            .toArray();

        const transactions = await db.transactions
            .where('organization_id').equals(organizationId)
            .toArray();

        const validTransactions = transactions.filter(t => mode === 'on' ? t.date <= date : t.date < date);
        const validTxIds = validTransactions.map(t => t.id);

        const entries = await db.journal_entries
            .where('transaction_id').anyOf(validTxIds)
            .toArray();

        let total = 0;
        const accountIds = new Set(accounts.map(a => a.id));
        
        for (const acc of accounts) {
            const accEntries = entries.filter(e => e.account_id === acc.id);
            total += this.calculateNetBalance(accEntries, acc.nature);
        }
        return total;
    }
}

export const financialReportsService = new FinancialReportsService();
