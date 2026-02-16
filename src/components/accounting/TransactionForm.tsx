import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Organization } from '../../lib/db';
import { useAuthStore } from '../../store/authStore';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, Save, Calculator } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { logActivity } from '../../lib/audit';
import { SearchableSelect } from '../ui/SearchableSelect';
import { useAccountingStore } from '../../store/accountingStore';
import { Modal } from '../ui/Modal';
import { toast } from '../../store/toastStore';

const entrySchema = z.object({
  account_id: z.string().min(1, 'Seleccione una cuenta'),
  debit: z.number().min(0),
  credit: z.number().min(0),
});

const transactionSchema = z.object({
  date: z.string(),
  description: z.string().min(1, 'La descripción es requerida'),
  reference_no: z.string().optional(),
  project_id: z.string().optional(),
  entries: z.array(entrySchema).min(2, 'Debe haber al menos 2 movimientos'),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
  onClose: () => void;
  onSuccess: () => void;
  organizationId?: string;
  transactionId?: string | null;
}

export function TransactionForm({ onClose, onSuccess, organizationId: propOrgId, transactionId }: TransactionFormProps) {
  const { user } = useAuthStore();
  const { setActiveTab } = useAccountingStore();
  const [org, setOrg] = useState<Organization | null>(null);
  const [orgId, setOrgId] = useState<string>(propOrgId || '');

  useEffect(() => {
    const fetchOrg = async () => {
      if (propOrgId) {
        setOrgId(propOrgId);
        const o = await db.organizations.get(propOrgId);
        if (o) setOrg(o);
        return;
      }

      if (user) {
        const orgs = await db.organizations.toArray();
        if (orgs.length > 0) {
          setOrg(orgs[0]);
          setOrgId(orgs[0].id);
        }
      }
    };
    fetchOrg();
  }, [user, propOrgId]);

  const accounts = useLiveQuery(
    () => (orgId ? db.accounts.where('organization_id').equals(orgId).sortBy('code') : []),
    [orgId]
  );

  const projects = useLiveQuery(
    () => (orgId ? db.projects.where('organization_id').equals(orgId).toArray() : []),
    [orgId]
  );

  const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      description: '',
      reference_no: '',
      project_id: '',
      entries: [
        { account_id: '', debit: 0, credit: 0 },
        { account_id: '', debit: 0, credit: 0 },
      ]
    }
  });

  useEffect(() => {
    const loadTransaction = async () => {
      if (transactionId) {
        const tx = await db.transactions.get(transactionId);
        const entries = await db.journal_entries.where('transaction_id').equals(transactionId).toArray();

        if (tx && entries) {
          reset({
            date: tx.date,
            description: tx.description,
            reference_no: tx.reference_no || '',
            project_id: tx.project_id || '',
            entries: entries.map(e => ({
              account_id: e.account_id,
              debit: e.debit,
              credit: e.credit
            }))
          });

          const newFormattedValues: { [key: string]: string } = {};
          entries.forEach((e, index) => {
            if (e.debit > 0) newFormattedValues[`${index}-debit`] = formatCurrency(e.debit);
            if (e.credit > 0) newFormattedValues[`${index}-credit`] = formatCurrency(e.credit);
          });
          setFormattedValues(newFormattedValues);
        }
      }
    };
    loadTransaction();
  }, [transactionId, reset]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "entries"
  });

  const accountOptions = useMemo(() => {
    return (accounts || [])
      .filter(acc => acc.accepts_movement)
      .sort((a, b) => a.code.localeCompare(b.code))
      // Visually deduplicate for UI until cleanup is run
      .filter((acc, index, self) => index === self.findIndex(t => t.code === acc.code))
      .map(acc => ({
        value: acc.id,
        label: `${acc.code} - ${acc.name}`
      }));
  }, [accounts]);

  const accountsMap = useMemo(() => {
    const map: Record<string, { accepts_movement: boolean }> = {};
    (accounts || []).forEach(a => { map[a.id] = { accepts_movement: a.accepts_movement }; });
    return map;
  }, [accounts]);

  const [formattedValues, setFormattedValues] = useState<{ [key: string]: string }>({});
  const watchedEntries = watch("entries");

  const handleCurrencyInput = (index: number, field: 'debit' | 'credit', value: string) => {
    const numericValue = Number(value.replace(/\./g, ''));
    if (!isNaN(numericValue)) {
      setValue(`entries.${index}.${field}`, numericValue);
      setFormattedValues(prev => ({
        ...prev,
        [`${index}-${field}`]: formatCurrency(numericValue)
      }));
    } else if (value === '') {
      setValue(`entries.${index}.${field}`, 0);
      setFormattedValues(prev => ({
        ...prev,
        [`${index}-${field}`]: ''
      }));
    }
  };

  const totalDebit = watchedEntries.reduce((sum, entry) => sum + (Number(entry.debit) || 0), 0);
  const totalCredit = watchedEntries.reduce((sum, entry) => sum + (Number(entry.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
  const hasGroupSelected = watchedEntries.some(e => e.account_id && accountsMap[e.account_id] && accountsMap[e.account_id].accepts_movement === false);

  const onSubmit = async (data: TransactionFormData) => {
    if (!orgId) return;

    const lockDate = org?.settings?.accounting?.lockDate;
    if (lockDate && data.date < lockDate) {
      toast.error(`No se pueden crear asientos antes de la fecha de cierre: ${lockDate}`);
      return;
    }

    if (!isBalanced) {
      toast.warning('El asiento no está balanceado. Débitos y Créditos deben ser iguales.');
      return;
    }

    try {
      const finalTransactionId = transactionId || uuidv4();

      await db.transaction('rw', [db.transactions, db.journal_entries, db.audit_logs], async () => {
        if (transactionId) {
          await db.transactions.update(transactionId, {
            date: data.date,
            description: data.description,
            reference_no: data.reference_no || null,
            project_id: data.project_id || null,
            sync_status: 'pendiente'
          });
          await db.journal_entries.where('transaction_id').equals(transactionId).delete();
        } else {
          await db.transactions.add({
            id: finalTransactionId,
            organization_id: orgId,
            date: data.date,
            description: data.description,
            reference_no: data.reference_no || null,
            project_id: data.project_id || null,
            type: 'transferencia',
            category_id: null,
            method: 'EFECTIVO',
            created_by: user?.id || 'unknown',
            created_at: new Date().toISOString(),
            sync_status: 'pendiente'
          });
        }

        const entries = data.entries.map(entry => ({
          id: uuidv4(),
          transaction_id: finalTransactionId,
          account_id: entry.account_id,
          debit: Number(entry.debit),
          credit: Number(entry.credit),
          sync_status: 'pendiente' as const
        }));

        await db.journal_entries.bulkAdd(entries);

        if (orgId && user?.id) {
          await logActivity({
            organization_id: orgId,
            user_id: user.id,
            action: transactionId ? 'UPDATE' : 'CREATE',
            entity_type: 'TRANSACTION',
            entity_id: finalTransactionId,
            new_data: { description: data.description, total: totalDebit }
          });
        }
      });

      toast.success(transactionId ? 'Asiento actualizado correctamente' : 'Asiento creado correctamente');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast.error('Error crítico al guardar.');
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={transactionId ? 'Editar asiento contable' : 'Nuevo asiento contable'}
      subtitle="Registro de partida doble y contabilidad"
      icon={Calculator}
      maxWidth="full"
      className="max-w-5xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2 group">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">Fecha</label>
            <input
              type="date"
              {...register('date')}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold shadow-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all"
            />
          </div>
          <div className="md:col-span-2 space-y-2 group">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">Descripción del asiento</label>
            <input
              {...register('description')}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold shadow-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all"
              placeholder="Ej: Pago de servicios públicos del mes"
            />
            {errors.description && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1">{errors.description.message}</p>}
          </div>
          <div className="space-y-2 group">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">Referencia</label>
            <input
              {...register('reference_no')}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold shadow-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all"
              placeholder="# Factura o comprobante"
            />
          </div>
          <div className="md:col-span-2 space-y-2 group">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">Proyecto o campaña asociada</label>
            <Controller
              control={control}
              name="project_id"
              render={({ field }) => (
                <SearchableSelect
                  options={[
                    { value: '', label: 'Sin proyecto asociado' },
                    ...(projects || []).map(p => ({ value: p.id, label: p.name }))
                  ]}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Seleccione un proyecto..."
                  className="w-full"
                />
              )}
            />
          </div>
        </div>

        {/* Entries Table - Premium Stylized */}
        <div className="relative group/table border border-slate-200 dark:border-slate-800/60 rounded-[1.5rem] overflow-hidden bg-white dark:bg-slate-900 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700">
          <table className="min-w-[750px] w-full text-left border-collapse">
            <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Cuenta contable</th>
                <th className="px-6 py-4 w-40 text-right">Débito</th>
                <th className="px-6 py-4 w-40 text-right">Crédito</th>
                <th className="px-6 py-4 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {fields.map((field, index) => (
                <tr key={field.id} className="group/row transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                  <td className="px-6 py-4">
                    <Controller
                      control={control}
                      name={`entries.${index}.account_id`}
                      render={({ field }) => (
                        <SearchableSelect
                          options={accountOptions}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Buscar cuenta..."
                          className="w-full"
                        />
                      )}
                    />
                    {errors.entries?.[index]?.account_id && (
                      <p className="text-red-500 text-[10px] font-bold mt-1.5 ml-1">{errors.entries[index]?.account_id?.message}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="text"
                      value={formattedValues[`${index}-debit`] ?? (field.debit > 0 ? formatCurrency(field.debit) : '')}
                      onChange={(e) => handleCurrencyInput(index, 'debit', e.target.value)}
                      className="w-full bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm py-2.5 px-4 text-right font-black focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all placeholder:text-slate-400"
                      placeholder="0.00"
                      onFocus={(e) => e.target.select()}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="text"
                      value={formattedValues[`${index}-credit`] ?? (field.credit > 0 ? formatCurrency(field.credit) : '')}
                      onChange={(e) => handleCurrencyInput(index, 'credit', e.target.value)}
                      className="w-full bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm py-2.5 px-4 text-right font-black focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all placeholder:text-slate-400"
                      placeholder="0.00"
                      onFocus={(e) => e.target.select()}
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all active:scale-90"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50/50 dark:bg-slate-800/40">
              <tr>
                <td className="px-6 py-5">
                  <button
                    type="button"
                    onClick={() => append({ account_id: '', debit: 0, credit: 0 })}
                    className="group-add flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors"
                  >
                    <Plus size={18} className="p-0.5 bg-blue-100 dark:bg-blue-900/30 rounded-full" />
                    Nueva línea contable
                  </button>
                </td>
                <td className={`px-6 py-5 text-right font-black text-sm ${!isBalanced ? 'text-red-500' : 'text-slate-600 dark:text-slate-400'}`}>
                  <p className="text-[9px] uppercase tracking-widest opacity-50 mb-1">Total Débito</p>
                  {formatCurrency(totalDebit)}
                </td>
                <td className={`px-6 py-5 text-right font-black text-sm ${!isBalanced ? 'text-red-500' : 'text-slate-600 dark:text-slate-400'}`}>
                  <p className="text-[9px] uppercase tracking-widest opacity-50 mb-1">Total Crédito</p>
                  {formatCurrency(totalCredit)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {accountOptions.length === 0 && (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300 text-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-center sm:text-left">No hay cuentas detalladas para seleccionar. Cree una subcuenta en el PUC.</span>
            <button
              type="button"
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
              onClick={() => {
                setActiveTab('puc');
                onClose();
              }}
            >
              Ir al PUC
            </button>
          </div>
        )}

        {(!isBalanced || hasGroupSelected) && (
          <div className="bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 p-4 rounded-2xl text-xs font-bold border border-red-100 dark:border-red-900/20 flex items-center justify-center gap-2 animate-pulse">
            <span className="size-2 rounded-full bg-red-500" />
            {!isBalanced ? (
              <>El asiento está desbalanceado por $ {formatCurrency(Math.abs(totalDebit - totalCredit))}</>
            ) : (
              <>Hay cuentas de grupo seleccionadas que no aceptan movimiento</>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-8 py-4 text-slate-500 dark:text-slate-400 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all active:scale-95"
          >
            Descartar cambios
          </button>
          <button
            type="submit"
            disabled={!isBalanced}
            className="group relative px-10 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm rounded-2xl shadow-xl shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:grayscale transition-all active:scale-95 flex items-center justify-center gap-3 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <Save size={20} className="group-hover:scale-110 transition-transform" />
            Guardar asiento contable
          </button>
        </div>
      </form>
    </Modal>
  );
}
