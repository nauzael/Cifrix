import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { 
  Building2, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRightLeft,
  Search,
  Check
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';

interface BankReconciliationProps {
  organizationId: string;
}

export function BankReconciliation({ organizationId }: BankReconciliationProps) {
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [bankExtract, setBankExtract] = useState<any[]>([]);
  const [matchedEntries, setMatchedEntries] = useState<Set<string>>(new Set());

  const bankAccounts = useLiveQuery(
    () => db.accounts.where('organization_id').equals(organizationId)
      .filter(a => a.code.startsWith('1110') || a.code.startsWith('1105')) // Simplified: Banks and Cash
      .toArray(),
    [organizationId]
  );

  const bookEntries = useLiveQuery(
    () => selectedAccount ? db.journal_entries.where('account_id').equals(selectedAccount).toArray() : [],
    [selectedAccount]
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simplified CSV parsing for demo
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').slice(1); // Skip header
      const data = lines.map(line => {
        const [date, description, amount] = line.split(',');
        return {
          id: Math.random().toString(36).substr(2, 9),
          date: date?.trim(),
          description: description?.trim(),
          amount: parseFloat(amount?.trim())
        };
      }).filter(d => d.date && !isNaN(d.amount));
      setBankExtract(data);
    };
    reader.readAsText(file);
  };

  const toggleMatch = (id: string) => {
    const newMatched = new Set(matchedEntries);
    if (newMatched.has(id)) newMatched.delete(id);
    else newMatched.add(id);
    setMatchedEntries(newMatched);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 items-end">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Cuenta Bancaria</label>
            <select 
              value={selectedAccount || ''} 
              onChange={e => setSelectedAccount(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none text-sm"
            >
              <option value="">-- Elija una cuenta --</option>
              {bankAccounts?.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex gap-4">
             <div className="flex-1">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Cargar Extracto (CSV)</label>
                <label className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold rounded-xl border-2 border-dashed border-blue-200 dark:border-blue-800 cursor-pointer hover:bg-blue-100 transition-all text-sm">
                  <Upload size={18} />
                  <span>Subir Archivo</span>
                  <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                </label>
             </div>
          </div>
        </div>
      </div>

      {!selectedAccount ? (
        <div className="text-center py-12 sm:py-20 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
          <Building2 size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 font-bold px-4">Seleccione una cuenta bancaria para iniciar la conciliación.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bank Side */}
          <div className="space-y-4">
            <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2 text-sm sm:text-base">
              <Building2 size={18} className="text-blue-600" /> Movimientos del Banco
            </h4>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="max-h-[400px] sm:max-h-[500px] overflow-y-auto overflow-x-auto scrollbar-hide">
                <table className="min-w-[500px] w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 font-bold uppercase text-slate-500">Fecha</th>
                      <th className="px-4 py-3 font-bold uppercase text-slate-500">Descripción</th>
                      <th className="px-4 py-3 font-bold uppercase text-slate-500 text-right">Monto</th>
                      <th className="px-4 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {bankExtract.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3">{item.date}</td>
                        <td className="px-4 py-3 font-medium truncate max-w-[150px]">{item.description}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          $ {formatCurrency(item.amount)}
                        </td>
                        <td className="px-4 py-3">
                           <button 
                             onClick={() => toggleMatch(item.id)}
                             className={`size-6 rounded-full flex items-center justify-center transition-all ${
                               matchedEntries.has(item.id) ? 'bg-green-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-300'
                             }`}
                           >
                             <Check size={14} />
                           </button>
                        </td>
                      </tr>
                    ))}
                    {bankExtract.length === 0 && (
                      <tr><td colSpan={4} className="p-8 text-center text-slate-400 italic">No se ha cargado ningún extracto.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Books Side */}
          <div className="space-y-4">
            <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2 text-sm sm:text-base">
              <ArrowRightLeft size={18} className="text-indigo-600" /> Movimientos en Libros
            </h4>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="max-h-[400px] sm:max-h-[500px] overflow-y-auto overflow-x-auto scrollbar-hide">
                <table className="min-w-[500px] w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 font-bold uppercase text-slate-500">Fecha</th>
                      <th className="px-4 py-3 font-bold uppercase text-slate-500">Concepto</th>
                      <th className="px-4 py-3 font-bold uppercase text-slate-500 text-right">Monto</th>
                      <th className="px-4 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {bookEntries?.map(entry => (
                      <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3">---</td>
                        <td className="px-4 py-3 font-medium truncate max-w-[150px]">{entry.notes || 'Asiento contable'}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          $ {formatCurrency(Math.max(entry.debit, entry.credit))}
                        </td>
                        <td className="px-4 py-3">
                           <button className="size-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-300 flex items-center justify-center">
                             <Check size={14} />
                           </button>
                        </td>
                      </tr>
                    ))}
                    {(!bookEntries || bookEntries.length === 0) && (
                      <tr><td colSpan={4} className="p-8 text-center text-slate-400 italic">No hay movimientos registrados.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
