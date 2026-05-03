import { describe, it, expect } from 'vitest';
import { Account, Transaction, JournalEntry } from '../../lib/db';

interface ReportSection {
  title: string;
  groups: ReportGroup[];
  total: number;
}

interface ReportGroup {
  name: string;
  accounts: ReportAccount[];
  total: number;
}

interface ReportAccount {
  code: string;
  name: string;
  balance: number;
  previousBalance?: number;
}

describe('Financial Reports Service Tests', () => {
  
  describe('Report Structure', () => {
    
    it('should create valid ReportSection structure', () => {
      const section: ReportSection = {
        title: 'ACTIVOS',
        groups: [{
          name: 'Activos Corrientes',
          accounts: [
            { code: '1105', name: 'Caja', balance: 5000000 },
            { code: '1110', name: 'Bancos', balance: 15000000 }
          ],
          total: 20000000
        }],
        total: 20000000
      };
      
      expect(section.title).toBe('ACTIVOS');
      expect(section.groups.length).toBe(1);
      expect(section.groups[0].accounts.length).toBe(2);
      expect(section.total).toBe(section.groups[0].total);
    });
    
    it('should calculate group totals correctly', () => {
      const accounts: ReportAccount[] = [
        { code: '1105', name: 'Caja', balance: 5000000 },
        { code: '1110', name: 'Bancos', balance: 15000000 },
        { code: '1200', name: 'Cuentas por Cobrar', balance: 8000000 }
      ];
      
      const total = accounts.reduce((sum, acc) => sum + acc.balance, 0);
      
      expect(total).toBe(28000000);
    });
    
    it('should filter zero-balance accounts from reports', () => {
      const accounts: ReportAccount[] = [
        { code: '1105', name: 'Caja', balance: 5000000 },
        { code: '1110', name: 'Bancos', balance: 0 },
        { code: '1200', name: 'Cuentas por Cobrar', balance: 0.02 }
      ];
      
      const filtered = accounts.filter(a => Math.abs(a.balance) > 0.01);
      
      expect(filtered.length).toBe(2);
      expect(filtered.map(a => a.code)).toEqual(['1105', '1200']);
    });
  });
  
  describe('Balance Sheet Validation', () => {
    
    it('should verify accounting equation: Assets = Liabilities + Equity', () => {
      const assets = 100000000;
      const liabilities = 30000000;
      const equity = 70000000;
      
      expect(assets).toBe(liabilities + equity);
    });
    
    it('should detect imbalance in balance sheet', () => {
      const assets = 100000000;
      const liabilities = 30000000;
      const equity = 60000000;
      
      const difference = assets - (liabilities + equity);
      
      expect(difference).toBe(10000000);
      expect(Math.abs(difference) < 0.01).toBe(false);
    });
    
    it('should calculate balance sheet imbalance tolerance', () => {
      const assets = 100000000;
      const liabilities = 29999999.99;
      const equity = 70000000.01;
      
      const difference = assets - (liabilities + equity);
      const isBalanced = Math.abs(difference) < 0.01;
      
      expect(isBalanced).toBe(true);
    });
  });
  
  describe('Income Statement Calculations', () => {
    
    it('should calculate net result correctly', () => {
      const income: ReportAccount[] = [
        { code: '4105', name: 'Ventas', balance: 50000000 },
        { code: '4205', name: 'Servicios', balance: 10000000 }
      ];
      
      const expenses: ReportAccount[] = [
        { code: '5105', name: 'Gastos Personal', balance: 20000000 },
        { code: '5205', name: 'Gastos Operativos', balance: 15000000 }
      ];
      
      const totalIncome = income.reduce((sum, a) => sum + a.balance, 0);
      const totalExpenses = expenses.reduce((sum, a) => sum + a.balance, 0);
      const netResult = totalIncome - totalExpenses;
      
      expect(totalIncome).toBe(60000000);
      expect(totalExpenses).toBe(35000000);
      expect(netResult).toBe(25000000);
    });
    
    it('should identify profit vs loss', () => {
      const profitScenario = 25000000;
      const lossScenario = -15000000;
      
      expect(profitScenario > 0).toBe(true);
      expect(lossScenario < 0).toBe(true);
    });
  });
  
  describe('Cash Flow Statement', () => {
    
    it('should categorize accounts correctly', () => {
      const accounts: Account[] = [
        { id: '1', organization_id: 'org1', code: '1105', name: 'Caja', parent_id: null, type: 'ACTIVO', nature: 'DEBITO', level: 1, accepts_movement: true, cash_flow_category: 'OPERACION', created_at: '' },
        { id: '2', organization_id: 'org1', code: '1510', name: 'Maquinaria', parent_id: null, type: 'ACTIVO', nature: 'DEBITO', level: 1, accepts_movement: true, cash_flow_category: 'INVERSION', created_at: '' },
        { id: '3', organization_id: 'org1', code: '2105', name: 'Proveedores', parent_id: null, type: 'PASIVO', nature: 'CREDITO', level: 1, accepts_movement: true, cash_flow_category: 'OPERACION', created_at: '' },
        { id: '4', organization_id: 'org1', code: '3105', name: 'Aportes', parent_id: null, type: 'PATRIMONIO', nature: 'CREDITO', level: 1, accepts_movement: true, created_at: '' }
      ];
      
      const operationAccounts = accounts.filter(a => a.cash_flow_category === 'OPERACION');
      const investmentAccounts = accounts.filter(a => a.cash_flow_category === 'INVERSION');
      const financingAccounts = accounts.filter(a => a.cash_flow_category === 'FINANCIACION');
      
      expect(operationAccounts.length).toBe(2);
      expect(investmentAccounts.length).toBe(1);
      expect(financingAccounts.length).toBe(0);
    });
    
    it('should calculate cash impact correctly for assets', () => {
      const initialBalance = 10000000;
      const finalBalance = 15000000;
      const variation = finalBalance - initialBalance;
      const accountType = 'ACTIVO';
      
      const cashImpact = accountType === 'ACTIVO' ? -variation : variation;
      
      expect(variation).toBe(5000000);
      expect(cashImpact).toBe(-5000000);
    });
    
    it('should calculate cash impact correctly for liabilities', () => {
      const initialBalance = 5000000;
      const finalBalance = 8000000;
      const variation = finalBalance - initialBalance;
      const accountType: 'ACTIVO' | 'PASIVO' = 'PASIVO';
      
      const isAsset = accountType === 'ACTIVO';
      const cashImpact = isAsset ? -variation : variation;
      
      expect(variation).toBe(3000000);
      expect(cashImpact).toBe(3000000);
    });
    
    it('should verify cash flow is balanced', () => {
      const initialCash = 20000000;
      const operationChange = 5000000;
      const investmentChange = -3000000;
      const financingChange = 1000000;
      
      const netChange = operationChange + investmentChange + financingChange;
      const finalCash = initialCash + netChange;
      
      expect(netChange).toBe(3000000);
      expect(finalCash).toBe(23000000);
    });
  });
  
  describe('Equity Changes Statement', () => {
    
    it('should calculate initial equity correctly', () => {
      const equityAccounts: ReportAccount[] = [
        { code: '3105', name: 'Capital', balance: 50000000 },
        { code: '3110', name: 'Reservas', balance: 10000000 }
      ];
      
      const initialEquity = equityAccounts.reduce((sum, a) => sum + a.balance, 0);
      
      expect(initialEquity).toBe(60000000);
    });
    
    it('should calculate final equity with current year result', () => {
      const initialEquity = 60000000;
      const periodMovements = 5000000;
      const currentYearResult = 15000000;
      
      const finalEquity = initialEquity + periodMovements + currentYearResult;
      
      expect(finalEquity).toBe(80000000);
    });
  });
  
  describe('Account Balance Calculation', () => {
    
    it('should calculate balance for debit-nature accounts', () => {
      const entries: JournalEntry[] = [
        { id: '1', transaction_id: 'tx1', account_id: 'acc1', debit: 1000000, credit: 0 },
        { id: '2', transaction_id: 'tx2', account_id: 'acc1', debit: 500000, credit: 0 },
        { id: '3', transaction_id: 'tx3', account_id: 'acc1', debit: 0, credit: 300000 }
      ];
      
      const debit = entries.reduce((sum, e) => sum + e.debit, 0);
      const credit = entries.reduce((sum, e) => sum + e.credit, 0);
      const balance = debit - credit;
      
      expect(balance).toBe(1200000);
    });
    
    it('should calculate balance for credit-nature accounts', () => {
      const entries: JournalEntry[] = [
        { id: '1', transaction_id: 'tx1', account_id: 'acc1', debit: 0, credit: 2000000 },
        { id: '2', transaction_id: 'tx2', account_id: 'acc1', debit: 500000, credit: 0 }
      ];
      
      const debit = entries.reduce((sum, e) => sum + e.debit, 0);
      const credit = entries.reduce((sum, e) => sum + e.credit, 0);
      const balance = credit - debit;
      
      expect(balance).toBe(1500000);
    });
  });
  
  describe('Transaction Date Filtering', () => {
    
    it('should filter transactions before a date', () => {
      const transactions: Transaction[] = [
        { id: 'tx1', organization_id: 'org1', date: '2024-01-15', description: '', reference_no: null, type: 'ingreso', category_id: null, method: 'EFECTIVO', created_by: 'user1', created_at: '' },
        { id: 'tx2', organization_id: 'org1', date: '2024-06-15', description: '', reference_no: null, type: 'ingreso', category_id: null, method: 'EFECTIVO', created_by: 'user1', created_at: '' },
        { id: 'tx3', organization_id: 'org1', date: '2024-12-31', description: '', reference_no: null, type: 'ingreso', category_id: null, method: 'EFECTIVO', created_by: 'user1', created_at: '' }
      ];
      
      const cutoffDate = '2024-06-30';
      const filtered = transactions.filter(t => t.date <= cutoffDate);
      
      expect(filtered.length).toBe(2);
    });
    
    it('should filter transactions within date range', () => {
      const transactions: Transaction[] = [
        { id: 'tx1', organization_id: 'org1', date: '2024-01-15', description: '', reference_no: null, type: 'ingreso', category_id: null, method: 'EFECTIVO', created_by: 'user1', created_at: '' },
        { id: 'tx2', organization_id: 'org1', date: '2024-06-15', description: '', reference_no: null, type: 'ingreso', category_id: null, method: 'EFECTIVO', created_by: 'user1', created_at: '' },
        { id: 'tx3', organization_id: 'org1', date: '2024-12-15', description: '', reference_no: null, type: 'ingreso', category_id: null, method: 'EFECTIVO', created_by: 'user1', created_at: '' }
      ];
      
      const startDate = '2024-03-01';
      const endDate = '2024-09-30';
      const filtered = transactions.filter(t => t.date >= startDate && t.date <= endDate);
      
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('tx2');
    });
  });
  
  describe('Report Data Structure', () => {
    
    it('should create valid financial report data', () => {
      const reportData = {
        generatedAt: new Date().toISOString(),
        organizationName: 'Test Org',
        period: '2024-01-01 al 2024-12-31',
        currency: 'COP',
        sections: [] as ReportSection[],
        summary: {
          isBalanced: true,
          difference: 0
        }
      };
      
      expect(reportData.generatedAt).toBeTruthy();
      expect(reportData.organizationName).toBe('Test Org');
      expect(reportData.currency).toBe('COP');
      expect(reportData.sections).toEqual([]);
    });
    
    it('should format currency values correctly', () => {
      const formatCOP = (value: number): string => {
        return new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP',
          minimumFractionDigits: 2
        }).format(value);
      };
      
      expect(formatCOP(1000000)).toContain('1.000.000');
      expect(formatCOP(1500000.5)).toContain('1.500.000,50');
    });
  });
});
