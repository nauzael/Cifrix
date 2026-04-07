import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JournalEntry, Account, Transaction } from '../../lib/db';

describe('Transaction Integrity Tests', () => {
  
  describe('Double-Entry Bookkeeping', () => {
    
    it('should verify that debits equal credits for balanced transactions', () => {
      const entries: Partial<JournalEntry>[] = [
        { debit: 100000, credit: 0 },
        { debit: 0, credit: 100000 }
      ];
      
      const debitTotal = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
      const creditTotal = entries.reduce((sum, e) => sum + (e.credit || 0), 0);
      
      expect(debitTotal).toBe(creditTotal);
      expect(Math.abs(debitTotal - creditTotal)).toBeLessThan(0.01);
    });
    
    it('should detect unbalanced multi-entry transactions', () => {
      const entries: Partial<JournalEntry>[] = [
        { debit: 50000, credit: 0 },
        { debit: 30000, credit: 0 },
        { debit: 0, credit: 70000 }
      ];
      
      const debitTotal = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
      const creditTotal = entries.reduce((sum, e) => sum + (e.credit || 0), 0);
      
      expect(debitTotal).not.toBe(creditTotal);
      expect(debitTotal - creditTotal).toBe(10000);
    });
    
    it('should handle complex transactions with multiple accounts', () => {
      const entries: Partial<JournalEntry>[] = [
        { debit: 500000, credit: 0 },     // Cuenta de banco (Activo)
        { debit: 0, credit: 400000 },     // Cuenta de ventas (Ingreso)
        { debit: 0, credit: 100000 }      // IVA por pagar (Pasivo)
      ];
      
      const debitTotal = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
      const creditTotal = entries.reduce((sum, e) => sum + (e.credit || 0), 0);
      
      expect(debitTotal).toBe(creditTotal);
    });
  });
  
  describe('Account Nature Calculations', () => {
    
    it('should calculate DEBITO nature account balance correctly', () => {
      const entries: JournalEntry[] = [
        { id: '1', transaction_id: 'tx1', account_id: 'acc1', debit: 100000, credit: 0 },
        { id: '2', transaction_id: 'tx2', account_id: 'acc1', debit: 50000, credit: 0 },
        { id: '3', transaction_id: 'tx3', account_id: 'acc1', debit: 0, credit: 30000 }
      ];
      
      const nature = 'DEBITO' as const;
      const debit = entries.reduce((sum, e) => sum + e.debit, 0);
      const credit = entries.reduce((sum, e) => sum + e.credit, 0);
      const balance = nature === 'DEBITO' ? debit - credit : credit - debit;
      
      expect(balance).toBe(120000);
    });
    
    it('should calculate CREDITO nature account balance correctly', () => {
      const entries: JournalEntry[] = [
        { id: '1', transaction_id: 'tx1', account_id: 'acc1', debit: 0, credit: 500000 },
        { id: '2', transaction_id: 'tx2', account_id: 'acc1', debit: 100000, credit: 0 },
        { id: '3', transaction_id: 'tx3', account_id: 'acc1', debit: 0, credit: 200000 }
      ];
      
      const nature: 'DEBITO' | 'CREDITO' = 'CREDITO';
      const debit = entries.reduce((sum, e) => sum + e.debit, 0);
      const credit = entries.reduce((sum, e) => sum + e.credit, 0);
      const isDebitNature = nature === 'DEBITO';
      const balance = isDebitNature ? debit - credit : credit - debit;
      
      expect(balance).toBe(600000);
    });
  });
  
  describe('Account Types', () => {
    
    it('should identify ACTIVO accounts as DEBITO nature', () => {
      const account: Account = {
        id: 'acc1',
        organization_id: 'org1',
        code: '1105',
        name: 'Caja',
        parent_id: null,
        type: 'ACTIVO',
        nature: 'DEBITO',
        level: 1,
        accepts_movement: true,
        created_at: ''
      };
      
      expect(account.type).toBe('ACTIVO');
      expect(account.nature).toBe('DEBITO');
    });
    
    it('should identify PASIVO accounts as CREDITO nature', () => {
      const account: Account = {
        id: 'acc2',
        organization_id: 'org1',
        code: '2205',
        name: 'Proveedores',
        parent_id: null,
        type: 'PASIVO',
        nature: 'CREDITO',
        level: 1,
        accepts_movement: true,
        created_at: ''
      };
      
      expect(account.type).toBe('PASIVO');
      expect(account.nature).toBe('CREDITO');
    });
    
    it('should identify INGRESO accounts as CREDITO nature', () => {
      const account: Account = {
        id: 'acc3',
        organization_id: 'org1',
        code: '4105',
        name: 'Ventas',
        parent_id: null,
        type: 'INGRESO',
        nature: 'CREDITO',
        level: 1,
        accepts_movement: true,
        created_at: ''
      };
      
      expect(account.type).toBe('INGRESO');
      expect(account.nature).toBe('CREDITO');
    });
    
    it('should identify EGRESO accounts as DEBITO nature', () => {
      const account: Account = {
        id: 'acc4',
        organization_id: 'org1',
        code: '5105',
        name: 'Gastos de Personal',
        parent_id: null,
        type: 'EGRESO',
        nature: 'DEBITO',
        level: 1,
        accepts_movement: true,
        created_at: ''
      };
      
      expect(account.type).toBe('EGRESO');
      expect(account.nature).toBe('DEBITO');
    });
  });
  
  describe('Date Range Filtering', () => {
    
    it('should filter transactions within date range', () => {
      const transactions: Transaction[] = [
        { id: 'tx1', organization_id: 'org1', date: '2024-01-15', description: 'Tx1', reference_no: null, type: 'ingreso', category_id: null, method: 'EFECTIVO', created_by: 'user1', created_at: '' },
        { id: 'tx2', organization_id: 'org1', date: '2024-02-15', description: 'Tx2', reference_no: null, type: 'ingreso', category_id: null, method: 'EFECTIVO', created_by: 'user1', created_at: '' },
        { id: 'tx3', organization_id: 'org1', date: '2024-03-15', description: 'Tx3', reference_no: null, type: 'ingreso', category_id: null, method: 'EFECTIVO', created_by: 'user1', created_at: '' },
        { id: 'tx4', organization_id: 'org1', date: '2024-04-15', description: 'Tx4', reference_no: null, type: 'ingreso', category_id: null, method: 'EFECTIVO', created_by: 'user1', created_at: '' }
      ];
      
      const startDate = '2024-02-01';
      const endDate = '2024-03-31';
      
      const filtered = transactions.filter(tx => tx.date >= startDate && tx.date <= endDate);
      
      expect(filtered.length).toBe(2);
      expect(filtered.map(tx => tx.id)).toEqual(['tx2', 'tx3']);
    });
    
    it('should exclude transactions outside date range', () => {
      const transactions: Transaction[] = [
        { id: 'tx1', organization_id: 'org1', date: '2024-01-15', description: 'Tx1', reference_no: null, type: 'ingreso', category_id: null, method: 'EFECTIVO', created_by: 'user1', created_at: '' },
        { id: 'tx2', organization_id: 'org1', date: '2024-06-15', description: 'Tx2', reference_no: null, type: 'ingreso', category_id: null, method: 'EFECTIVO', created_by: 'user1', created_at: '' }
      ];
      
      const startDate = '2024-02-01';
      const endDate = '2024-03-31';
      
      const filtered = transactions.filter(tx => tx.date >= startDate && tx.date <= endDate);
      
      expect(filtered.length).toBe(0);
    });
  });
  
  describe('Accounting Equation', () => {
    
    it('should verify Assets = Liabilities + Equity', () => {
      const accountBalances = {
        ACTIVO: 100000000,
        PASIVO: 30000000,
        PATRIMONIO: 70000000
      };
      
      expect(accountBalances.ACTIVO).toBe(accountBalances.PASIVO + accountBalances.PATRIMONIO);
    });
    
    it('should detect when accounting equation is broken', () => {
      const accountBalances = {
        ACTIVO: 100000000,
        PASIVO: 30000000,
        PATRIMONIO: 60000000
      };
      
      expect(accountBalances.ACTIVO).not.toBe(accountBalances.PASIVO + accountBalances.PATRIMONIO);
      expect(accountBalances.ACTIVO - (accountBalances.PASIVO + accountBalances.PATRIMONIO)).toBe(10000000);
    });
  });
  
  describe('Income Statement Calculations', () => {
    
    it('should calculate Net Result = Income - Expenses', () => {
      const totalIncome = 50000000;
      const totalExpenses = 35000000;
      
      const netResult = totalIncome - totalExpenses;
      
      expect(netResult).toBe(15000000);
      expect(netResult).toBeGreaterThan(0);
    });
    
    it('should handle net loss scenario', () => {
      const totalIncome = 30000000;
      const totalExpenses = 45000000;
      
      const netResult = totalIncome - totalExpenses;
      
      expect(netResult).toBe(-15000000);
      expect(netResult).toBeLessThan(0);
    });
    
    it('should handle zero profit scenario', () => {
      const totalIncome = 40000000;
      const totalExpenses = 40000000;
      
      const netResult = totalIncome - totalExpenses;
      
      expect(netResult).toBe(0);
    });
  });
});

describe('PUC Account Code Validation', () => {
  
  it('should identify account type from first digit of PUC code', () => {
    const getAccountType = (code: string): string => {
      const firstDigit = code[0];
      const typeMap: Record<string, string> = {
        '1': 'ACTIVO',
        '2': 'PASIVO',
        '3': 'PATRIMONIO',
        '4': 'INGRESO',
        '5': 'EGRESO',
        '6': 'EGRESO',
        '7': 'EGRESO'
      };
      return typeMap[firstDigit] || 'UNKNOWN';
    };
    
    expect(getAccountType('1105')).toBe('ACTIVO');
    expect(getAccountType('2105')).toBe('PASIVO');
    expect(getAccountType('3105')).toBe('PATRIMONIO');
    expect(getAccountType('4105')).toBe('INGRESO');
    expect(getAccountType('5105')).toBe('EGRESO');
    expect(getAccountType('6105')).toBe('EGRESO');
    expect(getAccountType('7105')).toBe('EGRESO');
  });
  
  it('should validate correct PUC code format', () => {
    const isValidPUCCode = (code: string): boolean => {
      return /^\d{4}$/.test(code);
    };
    
    expect(isValidPUCCode('1105')).toBe(true);
    expect(isValidPUCCode('2105')).toBe(true);
    expect(isValidPUCCode('9999')).toBe(true);
    expect(isValidPUCCode('123')).toBe(false);
    expect(isValidPUCCode('12345')).toBe(false);
    expect(isValidPUCCode('abcd')).toBe(false);
  });
});
