import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { useAuthStore } from '../store/authStore';
import { CustomerManager } from '../components/invoicing/CustomerManager';
import { InvoiceForm } from '../components/invoicing/InvoiceForm';
import { PortfolioManager } from '../components/invoicing/PortfolioManager';
import {
  FileText,
  Users,
  Plus,
  Search,
  Filter,
  Download,
  MoreVertical,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';

export function Invoicing() {
  const { user } = useAuthStore();
  const [orgId, setOrgId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'invoices' | 'customers' | 'receivables'>('invoices');
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchOrg = async () => {
      if (user) {
        const orgs = await db.organizations.toArray();
        if (orgs.length > 0) setOrgId(orgs[0].id);
      }
    };
    fetchOrg();
  }, [user]);

  const invoices = useLiveQuery(
    () => orgId ? db.invoices.where('organization_id').equals(orgId).reverse().sortBy('date') : [],
    [orgId]
  );

  const customers = useLiveQuery(
    () => orgId ? db.customers.where('organization_id').equals(orgId).toArray() : [],
    [orgId]
  );

  const getCustomerName = (id: string) => customers?.find(c => c.id === id)?.name || 'Cliente desconocido';

  return (
    <div className="space-y-6 sm:space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-1 sm:mb-2 tracking-tight">Facturación</h2>
          <p className="text-sm sm:text-base text-muted-foreground font-medium">Ventas, clientes y gestión de cartera.</p>
        </div>
        <div className="flex items-center gap-1.5 bg-card p-1.5 rounded-2xl border border-border shadow-sm overflow-x-auto whitespace-nowrap scrollbar-hide">
          {[
            { id: 'invoices', label: 'Facturas', icon: FileText },
            { id: 'customers', label: 'Clientes', icon: Users },
            { id: 'receivables', label: 'Cartera', icon: Clock },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === tab.id ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
            >
              <tab.icon size={16} className={activeTab === tab.id ? "drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" : ""} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'customers' ? (
        <CustomerManager organizationId={orgId} />
      ) : activeTab === 'receivables' ? (
        <PortfolioManager organizationId={orgId} />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground size-5 group-focus-within:text-primary transition-colors" />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-card border border-border rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-foreground"
                placeholder="Buscar por número de factura o nombre del cliente..."
              />
            </div>
            <div className="flex items-center gap-3">
              <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-card border border-border rounded-2xl text-sm font-black text-muted-foreground hover:bg-accent transition-all uppercase tracking-tighter">
                <Filter size={18} />
                Filtros
              </button>
              <button
                onClick={() => setIsInvoiceModalOpen(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground rounded-2xl text-sm font-black shadow-lg shadow-primary/25 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-tighter"
              >
                <Plus size={18} />
                Nueva Factura
              </button>
            </div>
          </div>

          <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Número / Fecha</th>
                    <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Cliente</th>
                    <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Total Facturado</th>
                    <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Estado de Pago</th>
                    <th className="px-8 py-5 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {invoices?.filter(inv =>
                    inv.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    getCustomerName(inv.customer_id).toLowerCase().includes(searchTerm.toLowerCase())
                  ).map(invoice => (
                    <tr key={invoice.id} className="hover:bg-muted/50 transition-colors group">
                      <td className="px-8 py-5">
                        <p className="font-black text-foreground tracking-tight">{invoice.number}</p>
                        <p className="text-xs text-muted-foreground font-medium">{formatDate(invoice.date)}</p>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="size-10 bg-muted rounded-xl flex items-center justify-center font-black text-muted-foreground text-xs">
                            {getCustomerName(invoice.customer_id).substring(0, 2).toUpperCase()}
                          </div>
                          <p className="text-sm font-bold text-foreground">{getCustomerName(invoice.customer_id)}</p>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <p className="font-black text-foreground text-base">$ {formatCurrency(invoice.total)}</p>
                        <p className="text-[10px] text-primary font-black uppercase tracking-tighter">IVA: $ {formatCurrency(invoice.tax)}</p>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className={`inline-flex px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${invoice.status === 'pagada'
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : invoice.status === 'borrador'
                            ? 'bg-muted text-muted-foreground border-border'
                            : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                          }`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <button className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all">
                          <MoreVertical size={20} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!invoices || invoices.length === 0) && (
                    <tr>
                      <td colSpan={5} className="py-24">
                        <div className="flex flex-col items-center justify-center text-center px-4">
                          <div className="size-20 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                            <FileText className="size-10 text-muted-foreground/50" />
                          </div>
                          <h3 className="text-lg font-black text-foreground mb-1">No hay facturas</h3>
                          <p className="text-muted-foreground text-sm max-w-[280px]">
                            Comience creando su primera factura de venta para realizar el seguimiento.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {isInvoiceModalOpen && (
        <InvoiceForm
          organizationId={orgId}
          onClose={() => setIsInvoiceModalOpen(false)}
          onSuccess={() => { }}
        />
      )}
    </div>
  );
}
