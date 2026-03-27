import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { useAccountingStore } from '../../store/accountingStore';
import { Search, Calendar, ArrowLeftRight, Download, Printer } from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';

interface LedgerProps {
  organizationId: string;
}

export function Ledger({ organizationId }: LedgerProps) {
  const { 
    ledgerSelectedAccount: selectedAccount, 
    setLedgerSelectedAccount: setSelectedAccount,
    ledgerDateRange: dateRange,
    setLedgerDateRange: setDateRange
  } = useAccountingStore();

  const accounts = useLiveQuery(
    () => db.accounts.where('organization_id').equals(organizationId).sortBy('code'),
    [organizationId]
  );

  const movements = useLiveQuery(
    async () => {
      if (!selectedAccount) return [];
      
      const entries = await db.journal_entries
        .where('account_id').equals(selectedAccount)
        .toArray();

      const txIds = entries.map(e => e.transaction_id);
      
      // Fetch both transactions and invoices (filtered by organizationId for safety)
      const transactions = await db.transactions
        .where('organization_id').equals(organizationId)
        .and(t => txIds.includes(t.id))
        .toArray();
        
      const invoices = await db.invoices
        .where('organization_id').equals(organizationId)
        .and(i => txIds.includes(i.id))
        .toArray();

      // Normalize invoices to transaction structure
      const invoiceTransactions = invoices.map(inv => ({
        id: inv.id,
        organization_id: inv.organization_id,
        date: inv.date,
        description: `Factura de Venta ${inv.number}`,
        reference_no: inv.number,
        type: 'ingreso' as const,
        category_id: null,
        method: inv.payment_method as any,
        created_by: 'system',
        created_at: inv.created_at,
        sync_status: inv.sync_status
      }));

      const allTransactions = [...transactions, ...invoiceTransactions]
        .filter(tx => tx.date >= dateRange.start && tx.date <= dateRange.end);

      const txMap = new Map(allTransactions.map(t => [t.id, t]));

      return entries
        .filter(e => txMap.has(e.transaction_id))
        .map(e => ({
          ...e,
          transaction: txMap.get(e.transaction_id)!
        }))
        .sort((a, b) => a.transaction.date.localeCompare(b.transaction.date));
    },
    [selectedAccount, dateRange, organizationId]
  );

  const calculateRunningBalance = () => {
    let balance = 0;
    const account = accounts?.find(a => a.id === selectedAccount);
    if (!account) return [];

    return movements?.map(m => {
      if (account.nature === 'DEBITO') {
        balance += m.debit - m.credit;
      } else {
        balance += m.credit - m.debit;
      }
      return { ...m, runningBalance: balance };
    }) || [];
  };

  const detailedMovements = calculateRunningBalance();

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 items-end">
          <div className="sm:col-span-2 md:col-span-1">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Seleccionar Cuenta</label>
            <select 
              value={selectedAccount || ''} 
              onChange={e => setSelectedAccount(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none text-sm"
            >
              <option value="">-- Elija una cuenta --</option>
              {accounts?.filter(a => a.accepts_movement !== false).map(acc => (
                <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Desde</label>
            <input 
              type="date"
              value={dateRange.start}
              onChange={e => setDateRange({...dateRange, start: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Hasta</label>
            <input 
              type="date"
              value={dateRange.end}
              onChange={e => setDateRange({...dateRange, end: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none text-sm"
            />
          </div>
        </div>
      </div>

      {!selectedAccount ? (
        <div className="text-center py-12 sm:py-20 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
          <Search size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 font-bold px-4">Seleccione una cuenta para ver su Libro Mayor.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
            <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm sm:text-base">Movimientos Detallados</h4>
            <div className="flex gap-1 sm:gap-2">
              <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Download size={18} /></button>
              <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Printer size={18} /></button>
            </div>
          </div>
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Descripción / Ref</th>
                  <th className="px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Débito</th>
                  <th className="px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Crédito</th>
                  <th className="px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {detailedMovements.map((m, i) => (
                  <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm font-bold text-slate-600 whitespace-nowrap">{formatDate(m.transaction.date)}</td>
                    <td className="px-4 sm:px-6 py-4">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-2">{m.transaction.description}</p>
                      {m.transaction.reference_no && <p className="text-[9px] sm:text-[10px] text-slate-400">Ref: {m.transaction.reference_no}</p>}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right font-mono text-xs sm:text-sm text-blue-600 whitespace-nowrap">
                      {m.debit > 0 ? `$ ${formatCurrency(m.debit)}` : '-'}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right font-mono text-xs sm:text-sm text-red-600 whitespace-nowrap">
                      {m.credit > 0 ? `$ ${formatCurrency(m.credit)}` : '-'}
                    </td>
                    <td className={`px-4 sm:px-6 py-4 text-right font-mono text-xs sm:text-sm font-black whitespace-nowrap ${m.runningBalance >= 0 ? 'text-slate-900 dark:text-white' : 'text-red-600'}`}>
                      $ {formatCurrency(m.runningBalance)}
                    </td>
                  </tr>
                ))}
                {detailedMovements.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400">
                      No hay movimientos en este período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
