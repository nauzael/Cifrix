import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Invoice, Payment, Customer } from '../../lib/db';
import { DianService } from '../../lib/dian';
import { 
  TrendingUp, 
  AlertCircle, 
  Clock, 
  Search, 
  Filter, 
  MoreVertical, 
  CreditCard,
  User,
  Calendar,
  ChevronRight,
  ArrowUpRight,
  Send,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';
import { PaymentForm } from './PaymentForm';

interface PortfolioManagerProps {
  organizationId: string;
}

export function PortfolioManager({ organizationId }: PortfolioManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const invoices = useLiveQuery(
    () => db.invoices.where('organization_id').equals(organizationId).toArray(),
    [organizationId]
  );

  const payments = useLiveQuery(
    () => db.payments.where('organization_id').equals(organizationId).toArray(),
    [organizationId]
  );

  const customers = useLiveQuery(
    () => db.customers.where('organization_id').equals(organizationId).toArray(),
    [organizationId]
  );

  const unpaidInvoices = invoices?.filter(inv => inv.status !== 'pagada' && inv.status !== 'anulada') || [];
  
  const getInvoiceBalance = (invoiceId: string, total: number) => {
    const invPayments = payments?.filter(p => p.invoice_id === invoiceId) || [];
    const paid = invPayments.reduce((sum, p) => sum + p.amount, 0);
    return total - paid;
  };

  const getCustomerName = (id: string) => customers?.find(c => c.id === id)?.name || 'Desconocido';

  const handleSendDian = async (invoiceId: string) => {
    setSendingId(invoiceId);
    try {
      const response = await DianService.sendInvoice(invoiceId);
      if (response.success) {
        alert(`Factura enviada a la DIAN. CUFE: ${response.cufe}`);
      } else {
        alert(`Error al enviar a la DIAN: ${response.message}`);
      }
    } catch (error) {
      console.error(error);
      alert('Error de conexión con el servicio de facturación');
    } finally {
      setSendingId(null);
    }
  };

  // Stats
  const totalReceivable = unpaidInvoices.reduce((sum, inv) => sum + getInvoiceBalance(inv.id, inv.total), 0);
  const overdueInvoices = unpaidInvoices.filter(inv => new Date(inv.due_date) < new Date());
  const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + getInvoiceBalance(inv.id, inv.total), 0);
  const dueToday = unpaidInvoices.filter(inv => inv.due_date === new Date().toISOString().split('T')[0]);
  const dueTodayAmount = dueToday.reduce((sum, inv) => sum + getInvoiceBalance(inv.id, inv.total), 0);

  const filteredInvoices = unpaidInvoices.filter(inv => {
    const customerName = getCustomerName(inv.customer_id).toLowerCase();
    return inv.number.toLowerCase().includes(searchTerm.toLowerCase()) || 
           customerName.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-8">
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="size-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Cartera</span>
          </div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">$ {formatCurrency(totalReceivable)}</h3>
          <p className="text-xs text-slate-500 mt-1">{unpaidInvoices.length} facturas pendientes</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-red-500">
          <div className="flex items-center justify-between mb-4">
            <div className="size-10 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg flex items-center justify-center">
              <AlertCircle size={20} />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencido</span>
          </div>
          <h3 className="text-2xl font-black text-red-600">$ {formatCurrency(overdueAmount)}</h3>
          <p className="text-xs text-slate-500 mt-1">{overdueInvoices.length} facturas vencidas</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between mb-4">
            <div className="size-10 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-lg flex items-center justify-center">
              <Clock size={20} />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vence Hoy</span>
          </div>
          <h3 className="text-2xl font-black text-amber-600">$ {formatCurrency(dueTodayAmount)}</h3>
          <p className="text-xs text-slate-500 mt-1">{dueToday.length} facturas por cobrar hoy</p>
        </div>
      </div>

      {/* Main Portfolio List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
            <input 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white"
              placeholder="Buscar por factura o cliente..."
            />
          </div>
          <div className="flex gap-2">
             <button className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 hover:bg-slate-50 transition-all">
               <Filter size={18} />
             </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Factura</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Estado DIAN</th>
                  <th className="px-6 py-4 text-right text-xs font-black text-slate-400 uppercase tracking-widest">Total</th>
                  <th className="px-6 py-4 text-right text-xs font-black text-slate-400 uppercase tracking-widest">Saldo</th>
                  <th className="px-6 py-4 text-right text-xs font-black text-slate-400 uppercase tracking-widest">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {filteredInvoices.map(invoice => {
                  const balance = getInvoiceBalance(invoice.id, invoice.total);
                  const isOverdue = new Date(invoice.due_date) < new Date();
                  const isSending = sendingId === invoice.id;
                  
                  return (
                    <tr key={invoice.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="font-black text-slate-900 dark:text-white">{invoice.number}</p>
                        <p className={`text-[10px] font-bold ${isOverdue ? 'text-red-500' : 'text-slate-500'}`}>
                          Vence: {formatDate(invoice.due_date)}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="size-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-[10px] font-black text-slate-500">
                            {getCustomerName(invoice.customer_id).substring(0,2).toUpperCase()}
                          </div>
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{getCustomerName(invoice.customer_id)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {invoice.dian_status === 'aceptada' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                            <CheckCircle2 size={12} /> Aceptada
                          </span>
                        ) : invoice.dian_status === 'rechazada' || invoice.dian_status === 'error' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                            <XCircle size={12} /> Error
                          </span>
                        ) : invoice.dian_status === 'enviando' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                            <Loader2 size={12} className="animate-spin" /> Enviando
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-bold">
                            Pendiente
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs font-bold text-slate-400">$ {formatCurrency(invoice.total)}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-black text-slate-900 dark:text-white">$ {formatCurrency(balance)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 justify-end">
                          {(!invoice.dian_status || invoice.dian_status === 'error' || invoice.dian_status === 'rechazada') && (
                            <button 
                              onClick={() => handleSendDian(invoice.id)}
                              disabled={isSending}
                              className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50"
                              title="Enviar a DIAN"
                            >
                              {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            </button>
                          )}
                          
                          <button 
                            onClick={() => setSelectedInvoice(invoice)}
                            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                            title="Registrar Pago"
                          >
                            <CreditCard size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-20 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Clock size={48} className="opacity-20" />
                        <p className="font-bold">No hay cuentas por cobrar pendientes.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedInvoice && (
        <PaymentForm 
          invoice={selectedInvoice}
          remainingAmount={getInvoiceBalance(selectedInvoice.id, selectedInvoice.total)}
          onClose={() => setSelectedInvoice(null)}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
}
