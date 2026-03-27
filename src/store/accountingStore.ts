import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AccountingState {
  activeTab: 'journal' | 'puc' | 'categories' | 'ledger' | 'trial_balance' | 'financial_statements' | 'reconciliation';
  journalSearchTerm: string;
  ledgerSelectedAccount: string | null;
  ledgerDateRange: {
    start: string;
    end: string;
  };
  categoriesActiveType: 'ingreso' | 'egreso';
  financialStatementType: 'balance' | 'pnl' | 'rues';
  
  // Actions
  setActiveTab: (tab: AccountingState['activeTab']) => void;
  setJournalSearchTerm: (term: string) => void;
  setLedgerSelectedAccount: (accountId: string | null) => void;
  setLedgerDateRange: (range: { start: string; end: string }) => void;
  setCategoriesActiveType: (type: 'ingreso' | 'egreso') => void;
  setFinancialStatementType: (type: 'balance' | 'pnl' | 'rues') => void;
}

export const useAccountingStore = create<AccountingState>()(
  persist(
    (set) => ({
      activeTab: 'journal',
      journalSearchTerm: '',
      ledgerSelectedAccount: null,
      ledgerDateRange: {
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      },
      categoriesActiveType: 'ingreso',
      financialStatementType: 'balance',

      setActiveTab: (activeTab) => set({ activeTab }),
      setJournalSearchTerm: (journalSearchTerm) => set({ journalSearchTerm }),
      setLedgerSelectedAccount: (ledgerSelectedAccount) => set({ ledgerSelectedAccount }),
      setLedgerDateRange: (ledgerDateRange) => set({ ledgerDateRange }),
      setCategoriesActiveType: (categoriesActiveType) => set({ categoriesActiveType }),
      setFinancialStatementType: (financialStatementType) => set({ financialStatementType }),
    }),
    {
      name: 'cifrix-accounting-storage',
    }
  )
);
