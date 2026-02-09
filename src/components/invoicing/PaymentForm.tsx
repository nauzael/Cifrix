import { useState } from 'react';
import { db, Invoice, Payment } from '../../lib/db';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { X, Save, DollarSign, Calendar, CreditCard } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { logActivity } from '../../lib/audit';
import { useAuthStore } from '../../store/authStore';

const paymentSchema = z.object({
  amount: z.coerce.number().min(1, 'Monto requerido'),
  date: z.string(),
  method: z.enum(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA']),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentFormProps {
  invoice: Invoice;
  remainingAmount: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function PaymentForm({ invoice, remainingAmount, onClose, onSuccess }: PaymentFormProps) {
  const { user } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: remainingAmount as any,
      date: new Date().toISOString().split('T')[0],
      method: 'TRANSFERENCIA'
    }
  });

  const onSubmit = async (data: PaymentFormData) => {
    setIsSaving(true);
    try {
      const paymentId = uuidv4();
      const now = new Date().toISOString();

      await db.transaction('rw', [db.payments, db.invoices, db.audit_logs], async () => {
        // Add payment record
        await db.payments.add({
          id: paymentId,
          organization_id: invoice.organization_id,
          invoice_id: invoice.id,
          ...data,
          created_at: now,
          sync_status: 'pendiente'
        });

        // Update invoice status if fully paid
        const isFullyPaid = data.amount >= remainingAmount;
        if (isFullyPaid) {
          await db.invoices.update(invoice.id, { status: 'pagada' });
        }

        // Log activity
        if (user) {
          await logActivity({
            organization_id: invoice.organization_id,
            user_id: user.id,
            action: 'CREATE',
            entity_type: 'PAYMENT',
            entity_id: paymentId,
            new_data: { ...data, invoice_id: invoice.id }
          });
        }
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving payment:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">Registrar Pago</h3>
            <p className="text-xs text-slate-500">Factura: {invoice.number} | Saldo: $ {formatCurrency(remainingAmount)}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Monto a Pagar</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
              <input 
                {...register('amount')}
                type="number"
                step="0.01"
                autoFocus
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 dark:text-white border-none rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none font-black text-lg"
              />
            </div>
            {errors.amount && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.amount.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Fecha</label>
              <input 
                type="date"
                {...register('date')}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 dark:text-white border-none rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Método</label>
              <select 
                {...register('method')}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 dark:text-white border-none rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none text-sm font-bold"
              >
                <option value="EFECTIVO">Efectivo</option>
                <option value="TARJETA">Tarjeta</option>
                <option value="TRANSFERENCIA">Transferencia</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Referencia (Opcional)</label>
            <input 
              {...register('reference')}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 dark:text-white border-none rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none text-sm"
              placeholder="Número de comprobante..."
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Notas</label>
            <textarea 
              {...register('notes')}
              rows={2}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 dark:text-white border-none rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none text-sm"
              placeholder="Notas adicionales..."
            />
          </div>

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={isSaving}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-black shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
            >
              {isSaving ? 'Guardando...' : <><Save size={20} /> Guardar Pago</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
