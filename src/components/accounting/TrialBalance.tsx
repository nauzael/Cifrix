import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { Table, Calculator, ArrowRightLeft } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

interface TrialBalanceProps {
  organizationId: string;
}

export function TrialBalance({ organizationId }: TrialBalanceProps) {
  const accounts = useLiveQuery(() => db.accounts.where('organization_id').equals(organizationId).toArray(), [organizationId]);
  const journalEntries = useLiveQuery(async () => {
    const txs = await db.transactions.where('organization_id').equals(organizationId).toArray();
    const txIds = txs.map(t => t.id);
    return db.journal_entries.where('transaction_id').anyOf(txIds).toArray();
  }, [organizationId]);

  if (!accounts || !journalEntries) return <div className="p-8 text-center text-slate-500">Cargando balance...</div>;

  const trialData = accounts.map(account => {
    const entries = journalEntries.filter(e => e.account_id === account.id);
    const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);

    // Balance calculation based on account nature
    let balance = 0;
    if (account.nature === 'DEBITO') {
      balance = totalDebit - totalCredit;
    } else {
      balance = totalCredit - totalDebit;
    }

    return {
      ...account,
      totalDebit,
      totalCredit,
      balance
    };
  }).filter(a => a.totalDebit > 0 || a.totalCredit > 0);

  const grandTotalDebit = trialData.reduce((sum, a) => sum + a.totalDebit, 0);
  const grandTotalCredit = trialData.reduce((sum, a) => sum + a.totalCredit, 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 sm:p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex items-center gap-3 sm:gap-4">
          <div className="size-8 sm:size-10 bg-blue-600 text-white rounded-lg flex items-center justify-center shrink-0">
            <Calculator size={18} className="sm:size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider truncate">Total Débitos</p>
            <h4 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white truncate">$ {formatCurrency(grandTotalDebit)}</h4>
          </div>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 sm:p-4 rounded-xl border border-emerald-100 dark:border-emerald-800 flex items-center gap-3 sm:gap-4">
          <div className="size-8 sm:size-10 bg-emerald-600 text-white rounded-lg flex items-center justify-center shrink-0">
            <ArrowRightLeft size={18} className="sm:size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider truncate">Total Créditos</p>
            <h4 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white truncate">$ {formatCurrency(grandTotalCredit)}</h4>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Código</th>
                <th className="px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Cuenta</th>
                <th className="px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Débitos</th>
                <th className="px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Créditos</th>
                <th className="px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Saldo Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {trialData.map(acc => (
                <tr key={acc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 sm:px-6 py-3 font-mono text-xs sm:text-sm font-bold text-blue-600">{acc.code}</td>
                  <td className="px-4 sm:px-6 py-3 text-xs sm:text-sm font-medium">{acc.name}</td>
                  <td className="px-4 sm:px-6 py-3 text-right font-mono text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    {acc.totalDebit > 0 ? formatCurrency(acc.totalDebit) : '-'}
                  </td>
                  <td className="px-4 sm:px-6 py-3 text-right font-mono text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    {acc.totalCredit > 0 ? formatCurrency(acc.totalCredit) : '-'}
                  </td>
                  <td className={`px-4 sm:px-6 py-3 text-right font-mono text-xs sm:text-sm font-bold ${acc.balance >= 0 ? 'text-slate-900 dark:text-white' : 'text-red-600'}`}>
                    $ {formatCurrency(acc.balance)}
                  </td>
                </tr>
              ))}
              {trialData.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    No hay movimientos registrados para generar el balance.
                  </td>
                </tr>
              )}
            </tbody>
            {trialData.length > 0 && (
              <tfoot className="bg-slate-50 dark:bg-slate-800/50 border-t-2 border-slate-200 dark:border-slate-700">
                <tr>
                  <td colSpan={2} className="px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-black uppercase">Totales Control</td>
                  <td className="px-4 sm:px-6 py-4 text-right font-mono text-xs sm:text-sm font-black">$ {formatCurrency(grandTotalDebit)}</td>
                  <td className="px-4 sm:px-6 py-4 text-right font-mono text-xs sm:text-sm font-black">$ {formatCurrency(grandTotalCredit)}</td>
                  <td className="px-4 sm:px-6 py-4 text-right font-mono text-xs sm:text-sm font-black text-blue-600">
                    Diff: $ {formatCurrency(grandTotalDebit - grandTotalCredit)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {grandTotalDebit !== grandTotalCredit && (
        <div className="p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-400">
          <Info className="size-5 shrink-0" />
          <p className="text-xs sm:text-sm font-medium">El balance no está cuadrado. Por favor revise sus asientos contables.</p>
        </div>
      )}
    </div>
  );
}

function Info({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}
