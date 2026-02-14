import { useState } from 'react';
import { db, Invoice } from '../../lib/db';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { Save, DollarSign, CreditCard, Loader2 } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { logActivity } from '../../lib/audit';
import { useAuthStore } from '../../store/authStore';
import { Modal } from '../ui/Modal';

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
        await db.payments.add({
          id: paymentId,
          organization_id: invoice.organization_id,
          invoice_id: invoice.id,
          ...data,
          created_at: now,
          sync_status: 'pendiente'
        });

        const isFullyPaid = data.amount >= remainingAmount;
        if (isFullyPaid) {
          await db.invoices.update(invoice.id, { status: 'pagada' });
        }

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
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Registrar Abono"
      subtitle={`Factura #${invoice.number}`}
      icon={CreditCard}
      maxWidth="md"
    >
      <div className="mb-8 p-6 bg-blue-600 rounded-[2rem] text-white shadow-xl shadow-blue-500/20 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-2xl group-hover:scale-150 transition-transform duration-1000" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Saldo pendiente</p>
        <p className="text-3xl font-black font-mono tracking-tighter">$ {formatCurrency(remainingAmount)}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2 group">
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">Monto a abonar</label>
          <div className="relative">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500">
              <DollarSign size={20} />
            </div>
            <input
              {...register('amount')}
              type="number"
              step="0.01"
              autoFocus
              className="w-full pl-18 pr-6 py-5 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-2xl font-black focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all font-mono"
            />
          </div>
          {errors.amount && <p className="text-red-500 text-[10px] font-bold mt-1.5 ml-1">{errors.amount.message}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2 group">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">Fecha de pago</label>
            <input
              type="date"
              {...register('date')}
              className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all"
            />
          </div>
          <div className="space-y-2 group">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">Método</label>
            <select
              {...register('method')}
              className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="EFECTIVO">💵 Efectivo</option>
              <option value="TARJETA">💳 Tarjeta / POS</option>
              <option value="TRANSFERENCIA">🏦 Transferencia</option>
            </select>
          </div>
        </div>

        <div className="space-y-2 group">
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">Referencia / No. Comprobante</label>
          <input
            {...register('reference')}
            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all"
            placeholder="Ej: TRX-98234..."
          />
        </div>

        <div className="space-y-2 group">
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">Observaciones adicionales</label>
          <textarea
            {...register('notes')}
            rows={2}
            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all resize-none"
            placeholder="Detalles sobre el origen del pago..."
          />
        </div>

        <div className="pt-4 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="group relative flex-[2] px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl text-sm font-bold shadow-xl shadow-blue-600/20 hover:from-blue-700 hover:to-indigo-700 transition-all active:scale-95 overflow-hidden flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            <span>Registrar pago</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

