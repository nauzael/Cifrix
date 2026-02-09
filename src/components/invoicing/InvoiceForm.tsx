import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Customer, InvoiceItem } from '../../lib/db';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, Save, X, Calculator, Calendar, UserPlus } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

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

  // Auto-generate invoice number based on DIAN settings
  useEffect(() => {
    if (organization?.settings?.dian) {
      const { resolutionPrefix, resolutionFrom } = organization.settings.dian;
      const prefix = resolutionPrefix || '';
      let nextNum = resolutionFrom || 1;
      
      if (lastInvoice?.number) {
        // Try to parse the number from the last invoice
        // We strip the prefix if it exists to find the sequence number
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
            const quantity = item.quantity;
            const price = item.unit_price;
            const discountPercent = item.discount_percent || 0;
            const taxPercent = item.tax_percent;
            
            const subtotal = quantity * price;
            const discountAmount = subtotal * (discountPercent / 100);
            const taxableAmount = subtotal - discountAmount;
            const total = taxableAmount * (1 + taxPercent / 100);

            return {
              id: uuidv4(),
              invoice_id: invoiceId,
              code: item.code,
              description: item.description,
              quantity: quantity,
              unit_price: price,
              discount_percent: discountPercent,
              discount_amount: discountAmount,
              tax_percent: taxPercent,
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

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Overlay con fondo oscuro y blur */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Contenedor del Modal */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl w-full max-w-6xl shadow-2xl max-h-[95vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-xl font-black text-slate-900 dark:text-white">Nueva Factura de Venta</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-8 space-y-8">
          
          {/* Header Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
            {/* Left Column */}
            <div className="space-y-6">
               <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-1">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Tipo</label>
                    <select className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border-none rounded-lg outline-none text-sm">
                        <option>CC</option>
                        <option>NIT</option>
                    </select>
                  </div>
                  <div className="col-span-3">
                     <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Documento</label>
                     <div className="relative">
                        <input className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border-none rounded-lg outline-none text-sm" placeholder="Buscar Nº de ID" />
                     </div>
                  </div>
               </div>

               <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Nombre o Razón Social</label>
                  <select 
                    {...register('customer_id')}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none"
                  >
                    <option value="">Seleccionar cliente...</option>
                    {customers?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button type="button" className="mt-2 text-blue-600 text-xs font-bold flex items-center gap-1 hover:underline">
                    <UserPlus size={14} /> Nuevo contacto
                  </button>
               </div>

               <div>
                 <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Correo</label>
                 <input className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border-none rounded-xl outline-none text-sm" placeholder="correo@ejemplo.com" />
               </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
               <div className="flex justify-end gap-4">
                  <div className="w-full max-w-[200px]">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 text-right">Fecha</label>
                    <input type="date" {...register('date')} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border-none rounded-xl text-right outline-none text-sm" />
                  </div>
               </div>

               <div className="flex justify-end gap-4">
                  <div className="w-full max-w-[200px]">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 text-right">Forma de pago</label>
                    <select {...register('payment_form')} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border-none rounded-xl text-right outline-none text-sm">
                       <option value="Contado">Contado</option>
                       <option value="Credito">Crédito</option>
                    </select>
                  </div>
               </div>

               <div className="flex justify-end gap-4">
                  <div className="w-full max-w-[200px]">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 text-right">Medio de pago</label>
                    <select {...register('payment_method')} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border-none rounded-xl text-right outline-none text-sm">
                       <option value="10 - Efectivo">Efectivo</option>
                       <option value="48 - Tarjeta Crédito">Tarjeta Crédito</option>
                       <option value="31 - Transferencia">Transferencia</option>
                       <option value="1 - Instrumento no definido">Instrumento no definido</option>
                    </select>
                  </div>
               </div>
               
               {/* Hidden but required field for logic */}
               <input type="hidden" {...register('due_date')} />
               <input type="hidden" {...register('number')} />
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-3 py-3 w-48">Item / Descripción</th>
                    <th className="px-2 py-3 w-24">Referencia</th>
                    <th className="px-2 py-3 w-28 text-right">Precio</th>
                    <th className="px-2 py-3 w-16 text-center">Desc %</th>
                    <th className="px-2 py-3 w-20 text-center">Impuesto</th>
                    <th className="px-2 py-3 w-20 text-center">Cant.</th>
                    <th className="px-3 py-3 w-32 text-right">Total</th>
                    <th className="px-2 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {fields.map((field, index) => {
                    const itemValues = (watchedItems[index] || {}) as any;
                    const subtotal = (Number(itemValues.quantity) || 0) * (Number(itemValues.unit_price) || 0);
                    const discount = subtotal * ((Number(itemValues.discount_percent) || 0) / 100);
                    const tax = (subtotal - discount) * ((Number(itemValues.tax_percent) || 0) / 100);
                    const totalLine = (subtotal - discount) + tax;

                    return (
                    <tr key={field.id} className="hover:bg-slate-50/50 group">
                      <td className="p-2 align-top">
                        <div className="space-y-1">
                            <input 
                                {...register(`items.${index}.description`)} 
                                className="w-full bg-transparent border-b border-transparent focus:border-blue-500 focus:ring-0 text-sm font-medium placeholder-slate-400" 
                                placeholder="Buscar item..." 
                            />
                        </div>
                      </td>
                      <td className="p-2 align-top">
                        <input 
                            {...register(`items.${index}.code`)} 
                            className="w-full bg-slate-50/50 rounded px-2 py-1 border-none text-xs text-slate-500" 
                            placeholder="REF" 
                        />
                      </td>
                      <td className="p-2 align-top">
                        <input 
                            type="number" 
                            step="0.01" 
                            {...register(`items.${index}.unit_price`, { valueAsNumber: true })} 
                            className="w-full bg-transparent border-none focus:ring-0 text-sm text-right font-mono" 
                            placeholder="0.00"
                        />
                      </td>
                      <td className="p-2 align-top">
                        <input 
                            type="number" 
                            {...register(`items.${index}.discount_percent`, { valueAsNumber: true })} 
                            className="w-full bg-transparent border-none focus:ring-0 text-sm text-center text-orange-500" 
                            placeholder="0"
                        />
                      </td>
                      <td className="p-2 align-top">
                        <select 
                            {...register(`items.${index}.tax_percent`, { valueAsNumber: true })} 
                            className="w-full bg-transparent border-none focus:ring-0 text-xs text-center appearance-none"
                        >
                            <option value="19">IVA 19%</option>
                            <option value="5">IVA 5%</option>
                            <option value="0">0%</option>
                        </select>
                      </td>
                      <td className="p-2 align-top">
                        <input 
                            type="number" 
                            {...register(`items.${index}.quantity`, { valueAsNumber: true })} 
                            className="w-full bg-slate-100 dark:bg-slate-800 rounded px-2 py-1 border-none text-sm text-center font-bold" 
                        />
                      </td>
                      <td className="p-2 align-top text-right text-sm font-bold text-slate-700 dark:text-slate-300">
                        $ {formatCurrency(totalLine)}
                      </td>
                      <td className="p-2 align-top text-center">
                        <button type="button" onClick={() => remove(index)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
              <button 
                type="button" 
                onClick={() => append({ description: '', quantity: 1, unit_price: 0, tax_percent: 19, discount_percent: 0, code: '' })}
                className="w-full py-3 bg-slate-50 dark:bg-slate-800/50 text-blue-600 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-50 transition-all"
              >
                <Plus size={14} /> Agregar Línea
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-3 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-bold">Subtotal</span>
                <span className="font-bold text-slate-900 dark:text-white">$ {formatCurrency(totals.subtotal)}</span>
              </div>
              {totals.discount > 0 && (
                <div className="flex justify-between text-sm text-orange-600">
                    <span className="font-bold">Descuento</span>
                    <span className="font-bold">- $ {formatCurrency(totals.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-blue-600">
                <span className="font-bold">Impuestos</span>
                <span className="font-bold">$ {formatCurrency(totals.tax)}</span>
              </div>
              <div className="flex justify-between text-xl border-t-2 border-slate-200 dark:border-slate-700 pt-3 mt-2">
                <span className="font-black text-slate-900 dark:text-white">TOTAL</span>
                <span className="font-black text-slate-900 dark:text-white">$ {formatCurrency(totals.total)}</span>
              </div>
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 flex justify-end gap-4">
          <button onClick={onClose} className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all">Cancelar</button>
          <button 
            type="submit" 
            className="px-10 py-3 bg-blue-600 text-white font-black rounded-xl shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center gap-2"
          >
            <Save size={20} /> Guardar Factura
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
