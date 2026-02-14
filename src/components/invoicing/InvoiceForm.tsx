import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, Save, FileText, UserPlus } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { Modal } from '../ui/Modal';

const itemSchema = z.object({
  code: z.string().optional(),
  description: z.string().min(1, 'Descripción requerida'),
  quantity: z.number().min(1),
  unit_price: z.number().min(0),
  discount_percent: z.number().min(0).max(100).default(0),
  tax_percent: z.number().min(0).default(19),
});

const invoiceSchema = z.object({
  customer_id: z.string().min(1, 'Seleccione un cliente'),
  number: z.string().min(1, 'Número de factura requerido'),
  date: z.string(),
  due_date: z.string(),
  payment_form: z.enum(['Contado', 'Credito']),
  payment_method: z.string().min(1, 'Medio de pago requerido'),
  items: z.array(itemSchema).min(1, 'Debe agregar al menos un item'),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface InvoiceFormProps {
  organizationId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function InvoiceForm({ organizationId, onClose, onSuccess }: InvoiceFormProps) {
  const customers = useLiveQuery(() => db.customers.where('organization_id').equals(organizationId).toArray());
  const organization = useLiveQuery(() => db.organizations.get(organizationId));
  const lastInvoice = useLiveQuery(() =>
    db.invoices
      .where('organization_id')
      .equals(organizationId)
      .reverse()
      .sortBy('created_at')
      .then(invoices => invoices[0])
  );

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema) as any,
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      payment_form: 'Contado',
      payment_method: '10 - Efectivo',
      items: [{ code: '', description: '', quantity: 1, unit_price: 0, discount_percent: 0, tax_percent: 19 }]
    }
  });

  useEffect(() => {
    if (organization?.settings?.dian) {
      const { resolutionPrefix, resolutionFrom } = organization.settings.dian;
      const prefix = resolutionPrefix || '';
      let nextNum = resolutionFrom || 1;

      if (lastInvoice?.number) {
        const currentNumStr = lastInvoice.number.startsWith(prefix)
          ? lastInvoice.number.slice(prefix.length)
          : lastInvoice.number;

        const currentNum = parseInt(currentNumStr);
        if (!isNaN(currentNum)) {
          nextNum = currentNum + 1;
        }
      }
      setValue('number', `${prefix}${nextNum}`);
    }
  }, [organization, lastInvoice, setValue]);

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const watchedItems = watch("items");
  const totals = watchedItems.reduce((acc, item) => {
    const quantity = Number(item.quantity) || 0;
    const price = Number(item.unit_price) || 0;
    const discountPercent = Number(item.discount_percent) || 0;
    const taxPercent = Number(item.tax_percent) || 0;

    const subtotal = quantity * price;
    const discountAmount = subtotal * (discountPercent / 100);
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * (taxPercent / 100);

    return {
      subtotal: acc.subtotal + subtotal,
      discount: acc.discount + discountAmount,
      tax: acc.tax + taxAmount,
      total: acc.total + taxableAmount + taxAmount
    };
  }, { subtotal: 0, discount: 0, tax: 0, total: 0 });

  const onSubmit = async (data: InvoiceFormData) => {
    try {
      const invoiceId = uuidv4();

      await db.transaction('rw', [db.invoices, db.invoice_items], async () => {
        await db.invoices.add({
          id: invoiceId,
          organization_id: organizationId,
          customer_id: data.customer_id,
          number: data.number,
          date: data.date,
          due_date: data.due_date,
          subtotal: totals.subtotal,
          tax: totals.tax,
          total: totals.total,
          payment_form: data.payment_form,
          payment_method: data.payment_method,
          status: 'borrador',
          created_at: new Date().toISOString(),
          sync_status: 'pendiente'
        });

        const items = data.items.map(item => {
          const subtotal = item.quantity * item.unit_price;
          const discountAmount = subtotal * (item.discount_percent / 100);
          const taxableAmount = subtotal - discountAmount;
          const total = taxableAmount * (1 + item.tax_percent / 100);

          return {
            id: uuidv4(),
            invoice_id: invoiceId,
            code: item.code,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_percent: item.discount_percent,
            discount_amount: discountAmount,
            tax_percent: item.tax_percent,
            total: total,
            sync_status: 'pendiente' as const
          };
        });

        await db.invoice_items.bulkAdd(items);
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating invoice:', error);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Nueva Factura de Venta"
      subtitle={`Consecutivo: ${watch('number') || 'Auto'}`}
      icon={FileText}
      maxWidth="full"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Card Principal de Información */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-950/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800">
              <div className="space-y-2 group">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">Seleccionar Cliente</label>
                <div className="relative">
                  <select
                    {...register('customer_id')}
                    className="w-full px-5 py-3.5 bg-white dark:bg-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="">-- Buscar un cliente registrado --</option>
                    {customers?.map(c => <option key={c.id} value={c.id}>{c.name} ({c.tax_id})</option>)}
                  </select>
                  <button type="button" className="absolute right-12 top-1/2 -translate-y-1/2 text-blue-600 hover:text-blue-700 p-2">
                    <UserPlus size={18} />
                  </button>
                </div>
                {errors.customer_id && <p className="text-red-500 text-[10px] font-bold mt-1.5 ml-1">{errors.customer_id.message}</p>}
              </div>

              <div className="space-y-2 group">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">Número de Factura</label>
                <input
                  {...register('number')}
                  readOnly
                  className="w-full px-5 py-3.5 bg-slate-100 dark:bg-slate-900/50 dark:text-slate-400 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-black focus:ring-0 outline-none transition-all font-mono"
                />
              </div>

              <div className="space-y-2 group">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">Fecha de Emisión</label>
                <input
                  type="date"
                  {...register('date')}
                  className="w-full px-5 py-3.5 bg-white dark:bg-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all"
                />
              </div>

              <div className="space-y-2 group">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">Forma de Pago</label>
                <select {...register('payment_form')} className="w-full px-5 py-3.5 bg-white dark:bg-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all appearance-none cursor-pointer">
                  <option value="Contado">Pago de Contado</option>
                  <option value="Credito">Pago a Crédito</option>
                </select>
              </div>
            </div>
          </div>

          {/* Card de Resumen de Totales */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-blue-500/30 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl group-hover:scale-150 transition-transform duration-1000" />

              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-6">Resumen de Facturación</p>

              <div className="space-y-4">
                <div className="flex justify-between items-center opacity-80">
                  <span className="text-xs font-bold">Subtotal</span>
                  <span className="font-mono text-sm">${formatCurrency(totals.subtotal)}</span>
                </div>
                {totals.discount > 0 && (
                  <div className="flex justify-between items-center text-rose-200">
                    <span className="text-xs font-bold">Descuento</span>
                    <span className="font-mono text-sm">-${formatCurrency(totals.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center opacity-80">
                  <span className="text-xs font-bold">Impuestos (IVA)</span>
                  <span className="font-mono text-sm">${formatCurrency(totals.tax)}</span>
                </div>
                <div className="h-[1px] bg-white/20 my-4" />
                <div className="flex justify-between items-end">
                  <span className="text-xs font-black uppercase">Total a Pagar</span>
                  <span className="text-3xl font-black font-mono tracking-tighter">${formatCurrency(totals.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de Items */}
        <div className="bg-white dark:bg-slate-950 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                  <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest w-[40%]">Producto / Servicio</th>
                  <th className="px-4 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Precio Unit.</th>
                  <th className="px-4 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Cant.</th>
                  <th className="px-4 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Desc %</th>
                  <th className="px-4 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Impuesto</th>
                  <th className="px-4 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Subtotal</th>
                  <th className="px-6 py-5 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {fields.map((field, index) => {
                  const itemValues = (watchedItems[index] || {}) as any;
                  const itemSubtotal = (Number(itemValues.quantity) || 0) * (Number(itemValues.unit_price) || 0);
                  const itemDiscount = itemSubtotal * ((Number(itemValues.discount_percent) || 0) / 100);
                  const itemTax = (itemSubtotal - itemDiscount) * ((Number(itemValues.tax_percent) || 0) / 100);
                  const itemTotal = (itemSubtotal - itemDiscount) + itemTax;

                  return (
                    <tr key={field.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4">
                        <input
                          {...register(`items.${index}.description`)}
                          className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold dark:text-white placeholder-slate-400"
                          placeholder="Nombre del producto o detalle del servicio..."
                        />
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="number"
                          step="0.01"
                          {...register(`items.${index}.unit_price`, { valueAsNumber: true })}
                          className="w-full bg-transparent border-none focus:ring-0 text-sm text-right font-black font-mono dark:text-white"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center">
                          <input
                            type="number"
                            {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                            className="w-16 bg-slate-100 dark:bg-slate-800 border-none rounded-xl py-2 text-sm text-center font-black dark:text-white"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="number"
                          {...register(`items.${index}.discount_percent`, { valueAsNumber: true })}
                          className="w-full bg-transparent border-none focus:ring-0 text-sm text-center font-bold text-rose-500"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <select
                          {...register(`items.${index}.tax_percent`, { valueAsNumber: true })}
                          className="w-full bg-transparent border-none focus:ring-0 text-xs text-center font-bold dark:text-slate-400 appearance-none cursor-pointer"
                        >
                          <option value="19">IVA 19%</option>
                          <option value="5">IVA 5%</option>
                          <option value="0">EXENTO 0%</option>
                        </select>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-sm font-black text-slate-900 dark:text-white font-mono">${formatCurrency(itemTotal)}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={() => append({ description: '', quantity: 1, unit_price: 0, tax_percent: 19, discount_percent: 0, code: '' })}
            className="w-full py-5 bg-slate-50 dark:bg-slate-800/30 text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all border-t border-slate-100 dark:border-slate-800"
          >
            <Plus size={16} /> Agregar nuevo item a la factura
          </button>
        </div>

        {/* Botonera inferior */}
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800/50 flex justify-end gap-4 z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-8 py-4 font-black text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-all"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="group relative px-12 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-black rounded-2xl shadow-2xl shadow-blue-600/30 hover:shadow-blue-600/40 transition-all active:scale-95 flex items-center justify-center gap-3 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <Save size={20} />
            <span>Emitir Factura</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

