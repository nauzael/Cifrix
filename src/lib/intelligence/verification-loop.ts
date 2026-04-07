import { db, JournalEntry, Account, Transaction } from '../db';

export interface VerificationResult {
  verified: boolean;
  errors: VerificationError[];
  warnings: VerificationWarning[];
  metadata: Record<string, any>;
}

export interface VerificationError {
  code: string;
  message: string;
  entity?: string;
  entityId?: string;
  severity: 'blocking' | 'critical';
}

export interface VerificationWarning {
  code: string;
  message: string;
  entity?: string;
  entityId?: string;
}

export interface VerificationCheck {
  name: string;
  check: () => Promise<VerificationResult>;
  critical: boolean;
}

export class VerificationLoop {
  private checks: Map<string, VerificationCheck> = new Map();
  private maxIterations = 3;
  private tolerance = 0.01;

  constructor() {
    this.registerDefaultChecks();
  }

  private registerDefaultChecks(): void {
    this.registerCheck('balance_integrity', async () => {
      return this.verifyBalanceIntegrity();
    }, true);

    this.registerCheck('double_entry', async () => {
      return this.verifyDoubleEntry();
    }, true);

    this.registerCheck('account_nature', async () => {
      return this.verifyAccountNature();
    }, false);

    this.registerCheck('transaction_dates', async () => {
      return this.verifyTransactionDates();
    }, false);

    this.registerCheck('fiscal_year_consistency', async () => {
      return this.verifyFiscalYearConsistency();
    }, true);
  }

  registerCheck(name: string, check: VerificationCheck['check'], critical: boolean): void {
    this.checks.set(name, { name, check, critical });
  }

  async verifyAll(): Promise<VerificationResult> {
    const results: VerificationResult[] = [];
    const errors: VerificationError[] = [];
    const warnings: VerificationWarning[] = [];

    for (const [name, check] of this.checks) {
      try {
        const result = await check.check();
        results.push(result);
        errors.push(...result.errors);
        warnings.push(...result.warnings);
      } catch (error) {
        errors.push({
          code: 'VERIFICATION_FAILED',
          message: `Check "${name}" failed: ${(error as Error).message}`,
          severity: check.critical ? 'blocking' : 'critical'
        });
      }
    }

    const blockingErrors = errors.filter(e => e.severity === 'blocking');
    
    return {
      verified: blockingErrors.length === 0,
      errors,
      warnings,
      metadata: {
        totalChecks: this.checks.size,
        passedChecks: results.filter(r => r.verified).length,
        iterations: 1
      }
    };
  }

  async verifyTransaction(txId: string): Promise<VerificationResult> {
    const errors: VerificationError[] = [];
    const warnings: VerificationWarning[] = [];
    let iterations = 0;

    while (iterations < this.maxIterations) {
      const entries = await db.journal_entries
        .where('transaction_id').equals(txId)
        .toArray();

      const debitTotal = entries.reduce((sum, e) => sum + e.debit, 0);
      const creditTotal = entries.reduce((sum, e) => sum + e.credit, 0);
      const difference = Math.abs(debitTotal - creditTotal);

      if (difference <= this.tolerance) {
        return {
          verified: true,
          errors: [],
          warnings: [],
          metadata: { entries: entries.length, iterations, debitTotal, creditTotal }
        };
      }

      if (iterations === this.maxIterations - 1) {
        errors.push({
          code: 'UNBALANCED_TRANSACTION',
          message: `Transaction ${txId} is unbalanced: D=${debitTotal}, C=${creditTotal}, Diff=${difference}`,
          entity: 'Transaction',
          entityId: txId,
          severity: 'blocking'
        });
      }

      iterations++;
    }

    return {
      verified: false,
      errors,
      warnings,
      metadata: { iterations }
    };
  }

  async verifyBalanceIntegrity(): Promise<VerificationResult> {
    const errors: VerificationError[] = [];
    const warnings: VerificationWarning[] = [];

    const accounts = await db.accounts.toArray();
    const transactions = await db.transactions.toArray();
    const txIds = transactions.map(t => t.id);
    const entries = await db.journal_entries
      .where('transaction_id').anyOf(txIds.length > 0 ? txIds : ['__no_tx__'])
      .toArray();

    for (const acc of accounts) {
      const accEntries = entries.filter(e => e.account_id === acc.id);
      const balance = this.calculateBalance(accEntries, acc.nature);

      if (Math.abs(balance) < 0.01) continue;

      const expectedSign = this.getExpectedSign(acc.type);
      if (balance < 0 && expectedSign === 'positive') {
        warnings.push({
          code: 'NEGATIVE_BALANCE',
          message: `Account ${acc.code} (${acc.name}) has negative balance: ${balance}`,
          entity: 'Account',
          entityId: acc.id
        });
      }
    }

    return {
      verified: errors.length === 0,
      errors,
      warnings,
      metadata: { accountsChecked: accounts.length }
    };
  }

  async verifyDoubleEntry(): Promise<VerificationResult> {
    const errors: VerificationError[] = [];
    const warnings: VerificationWarning[] = [];

    const transactions = await db.transactions.toArray();

    for (const tx of transactions) {
      const entries = await db.journal_entries
        .where('transaction_id').equals(tx.id)
        .toArray();

      if (entries.length < 2) {
        errors.push({
          code: 'SINGLE_ENTRY',
          message: `Transaction ${tx.id} has fewer than 2 entries`,
          entity: 'Transaction',
          entityId: tx.id,
          severity: 'critical'
        });
        continue;
      }

      const debitTotal = entries.reduce((sum, e) => sum + e.debit, 0);
      const creditTotal = entries.reduce((sum, e) => sum + e.credit, 0);
      const difference = Math.abs(debitTotal - creditTotal);

      if (difference > this.tolerance) {
        errors.push({
          code: 'UNBALANCED_ENTRY',
          message: `Transaction ${tx.id} debits(${debitTotal}) != credits(${creditTotal})`,
          entity: 'Transaction',
          entityId: tx.id,
          severity: 'blocking'
        });
      }
    }

    return {
      verified: errors.length === 0,
      errors,
      warnings,
      metadata: { transactionsChecked: transactions.length }
    };
  }

  async verifyAccountNature(): Promise<VerificationResult> {
    const errors: VerificationError[] = [];
    const warnings: VerificationWarning[] = [];

    const accounts = await db.accounts.toArray();

    for (const acc of accounts) {
      const expectedNature = this.inferNatureFromType(acc.type);
      if (acc.nature !== expectedNature) {
        warnings.push({
          code: 'NATURE_MISMATCH',
          message: `Account ${acc.code} type=${acc.type} but nature=${acc.nature} (expected ${expectedNature})`,
          entity: 'Account',
          entityId: acc.id
        });
      }
    }

    return {
      verified: true,
      errors,
      warnings,
      metadata: { accountsChecked: accounts.length }
    };
  }

  async verifyTransactionDates(): Promise<VerificationResult> {
    const errors: VerificationError[] = [];
    const warnings: VerificationWarning[] = [];

    const transactions = await db.transactions.toArray();
    const fiscalYears = await db.fiscal_years.toArray();

    for (const tx of transactions) {
      const txYear = new Date(tx.date).getFullYear();
      const yearRecord = fiscalYears.find(fy => fy.year === txYear);

      if (yearRecord?.status === 'CERRADO') {
        errors.push({
          code: 'TRANSACTION_IN_CLOSED_YEAR',
          message: `Transaction ${tx.id} dated ${tx.date} is in closed fiscal year ${txYear}`,
          entity: 'Transaction',
          entityId: tx.id,
          severity: 'blocking'
        });
      }

      if (tx.date > new Date().toISOString().split('T')[0]) {
        warnings.push({
          code: 'FUTURE_DATE',
          message: `Transaction ${tx.id} has future date: ${tx.date}`,
          entity: 'Transaction',
          entityId: tx.id
        });
      }
    }

    return {
      verified: errors.length === 0,
      errors,
      warnings,
      metadata: { transactionsChecked: transactions.length }
    };
  }

  async verifyFiscalYearConsistency(): Promise<VerificationResult> {
    const errors: VerificationError[] = [];
    const warnings: VerificationWarning[] = [];

    const fiscalYears = await db.fiscal_years.toArray();
    const transactions = await db.transactions.toArray();

    for (const fy of fiscalYears) {
      if (fy.status !== 'CERRADO') continue;

      const fyTransactions = transactions.filter(tx => {
        const txYear = new Date(tx.date).getFullYear();
        return txYear === fy.year;
      });

      if (fyTransactions.length > 0 && !fy.closing_entry_id) {
        warnings.push({
          code: 'CLOSED_YEAR_WITH_TRANSACTIONS_NO_CLOSING_ENTRY',
          message: `Fiscal year ${fy.year} is closed but has ${fyTransactions.length} transactions without closing entry`,
          entity: 'FiscalYear',
          entityId: fy.id
        });
      }
    }

    return {
      verified: errors.length === 0,
      errors,
      warnings,
      metadata: { fiscalYearsChecked: fiscalYears.length }
    };
  }

  private calculateBalance(entries: JournalEntry[], nature: 'DEBITO' | 'CREDITO'): number {
    const debit = entries.reduce((sum, e) => sum + e.debit, 0);
    const credit = entries.reduce((sum, e) => sum + e.credit, 0);
    return nature === 'DEBITO' ? debit - credit : credit - debit;
  }

  private getExpectedSign(type: Account['type']): 'positive' | 'negative' | 'any' {
    switch (type) {
      case 'ACTIVO': return 'positive';
      case 'PASIVO': return 'positive';
      case 'PATRIMONIO': return 'positive';
      case 'INGRESO': return 'positive';
      case 'EGRESO': return 'any';
      default: return 'any';
    }
  }

  private inferNatureFromType(type: Account['type']): 'DEBITO' | 'CREDITO' {
    switch (type) {
      case 'ACTIVO': return 'DEBITO';
      case 'PASIVO': return 'CREDITO';
      case 'PATRIMONIO': return 'CREDITO';
      case 'INGRESO': return 'CREDITO';
      case 'EGRESO': return 'DEBITO';
      default: return 'DEBITO';
    }
  }

  async runWithVerification<T>(
    operation: () => Promise<T>,
    verifyAfter = true
  ): Promise<{ result: T; verification: VerificationResult }> {
    const result = await operation();
    
    if (verifyAfter) {
      const verification = await this.verifyAll();
      if (!verification.verified) {
        const blocking = verification.errors.filter(e => e.severity === 'blocking');
        if (blocking.length > 0) {
          console.error('[Verification] Blocking errors detected:', blocking);
        }
      }
      return { result, verification };
    }
    
    return { 
      result, 
      verification: { verified: true, errors: [], warnings: [], metadata: {} } 
    };
  }
}

export const verificationLoop = new VerificationLoop();
