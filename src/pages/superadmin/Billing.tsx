import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  Filter,
  AlertCircle,
  Check,
  X
} from 'lucide-react';

export function Billing() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    mrr: 0,
    transactions_count: 0,
    failed_amount: 0,
    arr_projected: 0
  });

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          number,
          total,
          status,
          date,
          organizations (
            name
          )
        `)
        .order('date', { ascending: false })
        .limit(50);

      if (error) {
        if (error.code !== 'PGRST116' && !error.message?.includes('relation "invoices" does not exist')) {
            console.warn('Error fetching transactions:', error);
        }
        setTransactions([]);
      } else {
        const mappedTransactions = (data || []).map((inv: any) => ({
          id: inv.number || inv.id,
          org: inv.organizations?.name || 'Organización desconocida',
          plan: 'Premium',
          amount: inv.total || 0,
          status: inv.status === 'pagada' ? 'paid' : inv.status === 'borrador' ? 'pending' : 'failed',
          date: inv.date,
          method: 'Card'
        }));
        setTransactions(mappedTransactions);

        const totalAmount = mappedTransactions.reduce((acc: number, curr: any) => acc + (curr.status === 'paid' ? curr.amount : 0), 0);
        const failed = mappedTransactions.reduce((acc: number, curr: any) => acc + (curr.status === 'failed' ? curr.amount : 0), 0);
        
        setMetrics({
          mrr: totalAmount,
          transactions_count: mappedTransactions.length,
          failed_amount: failed,
          arr_projected: totalAmount * 12
        });
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (transactions.length === 0) {
      alert('No hay datos para exportar');
      return;
    }
    
    const headers = ['ID', 'Organización', 'Plan', 'Monto', 'Estado', 'Fecha', 'Método'];
    const csvContent = [
      headers.join(','),
      ...transactions.map(tx => [
        tx.id,
        `"${tx.org}"`,
        tx.plan,
        tx.amount,
        tx.status,
        tx.date,
        tx.method
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `billing_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-600/20">
              <CreditCard className="text-white" size={24} />
            </div>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Facturación y Cobros
            </h3>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            Monitoreo de ingresos, facturas y pasarelas de pago.
          </p>
        </div>
        <button 
          onClick={handleExport}
          className="group relative bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-6 py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-3 shadow-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-300 active:scale-95 w-full sm:w-auto overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-slate-400/0 via-slate-400/5 to-slate-400/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          <Download size={18} className="group-hover:-translate-y-1 transition-transform" />
          <span>Exportar Datos</span>
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none group hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="size-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:rotate-12 transition-transform">
              <DollarSign size={24} />
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider">
              <TrendingUp size={12} />
              <span>+12.5%</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">MRR Actual</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              ${metrics.mrr.toLocaleString()}
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none group hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="size-12 rounded-2xl bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:rotate-12 transition-transform">
              <CreditCard size={24} />
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-wider">
              <TrendingUp size={12} />
              <span>+8.2%</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Transacciones</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {metrics.transactions_count.toLocaleString()}
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none group hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="size-12 rounded-2xl bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:rotate-12 transition-transform">
              <AlertCircle size={24} />
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-wider">
              <TrendingDown size={12} />
              <span>-2.1%</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Pagos Fallidos</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              ${metrics.failed_amount.toLocaleString()}
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none group hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="size-12 rounded-2xl bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:rotate-12 transition-transform">
              <TrendingUp size={24} />
            </div>
            <div className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider">
              Proyectado
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">ARR Estimado</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              ${metrics.arr_projected.toLocaleString()}
            </h3>
          </div>
        </div>
      </div>

      {/* Transactions Table Section */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Historial de Transacciones
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              Listado detallado de movimientos y cobros realizados.
            </p>
          </div>
          <button className="flex items-center justify-center gap-2.5 px-5 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-black hover:bg-slate-100 dark:hover:bg-slate-700 transition-all active:scale-95 border border-slate-200 dark:border-slate-700">
            <Filter size={18} />
            <span>Filtros Avanzados</span>
          </button>
        </div>

        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID Factura</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Organización</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Plan</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Monto</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Método</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="size-10 border-4 border-emerald-600/20 border-t-emerald-600 rounded-full animate-spin" />
                      <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Cargando transacciones...</p>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                        <CreditCard size={32} className="text-slate-300 dark:text-slate-600" />
                      </div>
                      <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No hay transacciones registradas</p>
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all duration-200">
                    <td className="px-8 py-5">
                      <span className="text-xs font-black text-slate-500 dark:text-slate-400 tracking-wider">
                        #{tx.id}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                        {tx.org}
                      </p>
                    </td>
                    <td className="px-8 py-5">
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider">
                        {tx.plan}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-black text-slate-900 dark:text-white">
                        ${tx.amount.toLocaleString()}
                      </p>
                    </td>
                    <td className="px-8 py-5">
                      {tx.status === 'paid' && (
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                          <Check size={14} className="stroke-[3]" />
                          <span className="text-[10px] font-black uppercase tracking-wider">Pagada</span>
                        </div>
                      )}
                      {tx.status === 'pending' && (
                        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                          <AlertCircle size={14} className="stroke-[3]" />
                          <span className="text-[10px] font-black uppercase tracking-wider">Pendiente</span>
                        </div>
                      )}
                      {tx.status === 'failed' && (
                        <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                          <X size={14} className="stroke-[3]" />
                          <span className="text-[10px] font-black uppercase tracking-wider">Fallida</span>
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {new Date(tx.date).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                        {tx.method}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
