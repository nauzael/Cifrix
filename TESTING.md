# Testing with Vitest

## Quick Start

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- src/test/accounting/reports.test.ts
```

## Test Structure

```
src/
├── test/
│   ├── setup.ts              # Test environment setup
│   ├── accounting/
│   │   ├── reports.test.ts   # Financial Reports tests
│   │   ├── closing.test.ts   # Closing Process tests
│   │   └── transactionIntegrity.test.ts
│   ├── utils/
│   │   └── format.test.ts
│   └── mocks/
│       └── db.ts             # Database mocks
```

## Writing Tests

### Core Principles (TDD Workflow)

1. **Red**: Write a failing test first
2. **Green**: Write the minimum code to pass
3. **Refactor**: Improve code while keeping tests green

### Test Naming Convention

```typescript
describe('FinancialReportsService', () => {
  describe('getBalanceSheet', () => {
    it('should throw error when organization not found', async () => {
      // test implementation
    });
    
    it('should calculate correct asset totals', async () => {
      // test implementation
    });
  });
});
```

### Accounting-Specific Test Cases

For the accounting module, focus on:

1. **Transaction Integrity**
   - Debits must equal credits (double-entry bookkeeping)
   - All transactions have valid organization_id
   - Date ranges are properly enforced

2. **Balance Calculations**
   - Assets = Liabilities + Equity (accounting equation)
   - Income - Expenses = Net Result
   - Nature-based calculations (Debit vs Credit accounts)

3. **Report Generation**
   - Correct period filtering
   - Proper account grouping by type
   - Balance verification

4. **Closing Process**
   - Year status validation
   - Income/Expense cancellation
   - Equity account posting

## Verification Loop Pattern

```typescript
// verification-loop pattern for critical operations
async function verifyTransaction(tx: Transaction): Promise<boolean> {
  const entries = await getJournalEntries(tx.id);
  const debitTotal = entries.reduce((sum, e) => sum + e.debit, 0);
  const creditTotal = entries.reduce((sum, e) => sum + e.credit, 0);
  
  if (Math.abs(debitTotal - creditTotal) > 0.01) {
    throw new Error('Transaction is unbalanced');
  }
  
  return true;
}
```

## Mock Patterns

### Mocking Dexie (IndexedDB)

```typescript
import { jest } from 'vitest';
import { db } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  db: {
    accounts: {
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          filter: vi.fn(() => Promise.resolve([]))
        }))
      }))
    },
    transactions: { /* ... */ },
    journal_entries: { /* ... */ }
  }
}));
```

## CI/CD Integration

Add to `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```
