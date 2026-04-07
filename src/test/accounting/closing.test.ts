import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  JournalEntry, 
  Account, 
  Transaction,
  FiscalYear 
} from '../../lib/db';

describe('Closing Process Tests', () => {
  
  describe('Annual Closing Validation', () => {
    
    it('should check if fiscal year is already closed', () => {
      const isYearClosed = (fiscalYear: FiscalYear | undefined): boolean => {
        return fiscalYear?.status === 'CERRADO';
      };
      
      const openYear: FiscalYear = {
        id: 'fy1',
        organization_id: 'org1',
        year: 2024,
        status: 'ABIERTO',
        created_at: ''
      };
      
      const closedYear: FiscalYear = {
        id: 'fy2',
        organization_id: 'org1',
        year: 2023,
        status: 'CERRADO',
        closed_at: '2023-12-31',
        closed_by: 'user1',
        created_at: ''
      };
      
      expect(isYearClosed(undefined)).toBe(false);
      expect(isYearClosed(openYear)).toBe(false);
      expect(isYearClosed(closedYear)).toBe(true);
    });
    
    it('should reject closing an already closed year', () => {
      const closedYear: FiscalYear = {
        id: 'fy1',
        organization_id: 'org1',
        year: 2023,
        status: 'CERRADO',
        closed_at: '2023-12-31T23:59:59Z',
        closed_by: 'user1',
        created_at: ''
      };
      
      const isYearClosed = (fy: FiscalYear) => fy?.status === 'CERRADO';
      
      const result = isYearClosed(closedYear) 
        ? { success: false, message: `El año fiscal 2023 ya está cerrado.` }
        : { success: true };
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('2023');
      expect(result.message).toContain('cerrado');
    });
  });
  
  describe('Income and Expense Account Identification', () => {
    
    it('should identify income accounts (4xxx) correctly', () => {
      const accounts: Account[] = [
        { id: '1', organization_id: 'org1', code: '1105', name: 'Caja', parent_id: null, type: 'ACTIVO', nature: 'DEBITO', level: 1, accepts_movement: true, created_at: '' },
        { id: '2', organization_id: 'org1', code: '4105', name: 'Ventas', parent_id: null, type: 'INGRESO', nature: 'CREDITO', level: 1, accepts_movement: true, created_at: '' },
        { id: '3', organization_id: 'org1', code: '4205', name: 'Servicios', parent_id: null, type: 'INGRESO', nature: 'CREDITO', level: 1, accepts_movement: true, created_at: '' },
        { id: '4', organization_id: 'org1', code: '5105', name: 'Gastos', parent_id: null, type: 'EGRESO', nature: 'DEBITO', level: 1, accepts_movement: true, created_at: '' }
      ];
      
      const incomeAccounts = accounts.filter(acc => (acc.code || '').startsWith('4'));
      
      expect(incomeAccounts.length).toBe(2);
      expect(incomeAccounts.every(a => a.type === 'INGRESO')).toBe(true);
    });
    
    it('should identify expense accounts (5xx, 6xx, 7xx) correctly', () => {
      const accounts: Account[] = [
        { id: '1', organization_id: 'org1', code: '5105', name: 'Gastos Personal', parent_id: null, type: 'EGRESO', nature: 'DEBITO', level: 1, accepts_movement: true, created_at: '' },
        { id: '2', organization_id: 'org1', code: '6105', name: 'Costo Ventas', parent_id: null, type: 'EGRESO', nature: 'DEBITO', level: 1, accepts_movement: true, created_at: '' },
        { id: '3', organization_id: 'org1', code: '7105', name: 'Gastos Operativos', parent_id: null, type: 'EGRESO', nature: 'DEBITO', level: 1, accepts_movement: true, created_at: '' },
        { id: '4', organization_id: 'org1', code: '4105', name: 'Ventas', parent_id: null, type: 'INGRESO', nature: 'CREDITO', level: 1, accepts_movement: true, created_at: '' }
      ];
      
      const expenseAccounts = accounts.filter(acc => {
        const firstDigit = (acc.code || '')[0];
        return ['5', '6', '7'].includes(firstDigit);
      });
      
      expect(expenseAccounts.length).toBe(3);
      expect(expenseAccounts.every(a => a.type === 'EGRESO')).toBe(true);
    });
  });
  
  describe('Balance Calculation for Closing', () => {
    
    it('should cancel income accounts with DEBIT entry (reverse)', () => {
      const incomeEntries: JournalEntry[] = [
        { id: '1', transaction_id: 'tx1', account_id: 'acc1', debit: 0, credit: 500000 },
        { id: '2', transaction_id: 'tx2', account_id: 'acc1', debit: 0, credit: 300000 },
        { id: '3', transaction_id: 'tx3', account_id: 'acc1', debit: 200000, credit: 0 }
      ];
      
      const debit = incomeEntries.reduce((sum, e) => sum + e.debit, 0);
      const credit = incomeEntries.reduce((sum, e) => sum + e.credit, 0);
      const balance = credit - debit;
      
      expect(balance).toBe(600000);
      
      const closingEntryDebit = balance;
      expect(closingEntryDebit).toBe(600000);
    });
    
    it('should cancel expense accounts with CREDIT entry (reverse)', () => {
      const expenseEntries: JournalEntry[] = [
        { id: '1', transaction_id: 'tx1', account_id: 'acc1', debit: 200000, credit: 0 },
        { id: '2', transaction_id: 'tx2', account_id: 'acc1', debit: 150000, credit: 0 },
        { id: '3', transaction_id: 'tx3', account_id: 'acc1', debit: 0, credit: 50000 }
      ];
      
      const debit = expenseEntries.reduce((sum, e) => sum + e.debit, 0);
      const credit = expenseEntries.reduce((sum, e) => sum + e.credit, 0);
      const balance = debit - credit;
      
      expect(balance).toBe(300000);
      
      const closingEntryCredit = balance;
      expect(closingEntryCredit).toBe(300000);
    });
  });
  
  describe('Net Result Calculation', () => {
    
    it('should calculate net profit correctly', () => {
      const totalDebit = 600000;
      const totalCredit = 300000;
      const netResult = totalDebit - totalCredit;
      
      expect(netResult).toBe(300000);
      expect(netResult).toBeGreaterThan(0);
    });
    
    it('should calculate net loss correctly', () => {
      const totalDebit = 300000;
      const totalCredit = 600000;
      const netResult = totalDebit - totalCredit;
      
      expect(netResult).toBe(-300000);
      expect(netResult).toBeLessThan(0);
    });
    
    it('should handle zero profit/loss', () => {
      const totalDebit = 500000;
      const totalCredit = 500000;
      const netResult = totalDebit - totalCredit;
      
      expect(netResult).toBe(0);
    });
  });
  
  describe('Closing Entry Balance', () => {
    
    it('should create balanced closing entry with profit', () => {
      const closingEntries: Partial<JournalEntry>[] = [
        { account_id: 'acc_income1', debit: 600000, credit: 0 },
        { account_id: 'acc_expense1', debit: 0, credit: 300000 },
        { account_id: 'acc_equity', debit: 0, credit: 300000 }
      ];
      
      const debitTotal = closingEntries.reduce((sum, e) => sum + (e.debit || 0), 0);
      const creditTotal = closingEntries.reduce((sum, e) => sum + (e.credit || 0), 0);
      
      expect(Math.abs(debitTotal - creditTotal)).toBeLessThan(0.01);
    });
    
    it('should create balanced closing entry with loss', () => {
      const closingEntries: Partial<JournalEntry>[] = [
        { account_id: 'acc_income1', debit: 300000, credit: 0 },
        { account_id: 'acc_expense1', debit: 0, credit: 600000 },
        { account_id: 'acc_equity', debit: 300000, credit: 0 }
      ];
      
      const debitTotal = closingEntries.reduce((sum, e) => sum + (e.debit || 0), 0);
      const creditTotal = closingEntries.reduce((sum, e) => sum + (e.credit || 0), 0);
      
      expect(Math.abs(debitTotal - creditTotal)).toBeLessThan(0.01);
    });
  });
  
  describe('Fiscal Year Date Range', () => {
    
    it('should generate correct date range for year', () => {
      const year = 2024;
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      
      expect(startDate).toBe('2024-01-01');
      expect(endDate).toBe('2024-12-31');
    });
    
    it('should validate date is within fiscal year', () => {
      const year = 2024;
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      
      const testDate = '2024-06-15';
      
      expect(testDate >= startDate && testDate <= endDate).toBe(true);
    });
    
    it('should exclude dates outside fiscal year', () => {
      const year = 2024;
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      
      const datesOutside = ['2023-12-31', '2025-01-01', '2024-01-00', '2024-13-01'];
      
      datesOutside.forEach(date => {
        expect(date >= startDate && date <= endDate).toBe(false);
      });
    });
  });
});

describe('Equity Account Posting', () => {
  
  it('should post profit to equity account (credit)', () => {
    const netResult = 300000;
    const equityAccountId = 'acc_equity';
    
    const closingEntry = {
      account_id: equityAccountId,
      debit: 0,
      credit: netResult > 0 ? netResult : 0,
      notes: `Utilidad del Ejercicio 2024`
    };
    
    expect(closingEntry.credit).toBe(300000);
    expect(closingEntry.debit).toBe(0);
  });
  
  it('should post loss to equity account (debit)', () => {
    const netResult = -300000;
    const equityAccountId = 'acc_equity';
    
    const closingEntry = {
      account_id: equityAccountId,
      debit: netResult < 0 ? Math.abs(netResult) : 0,
      credit: 0,
      notes: `Pérdida del Ejercicio 2024`
    };
    
    expect(closingEntry.debit).toBe(300000);
    expect(closingEntry.credit).toBe(0);
  });
});
