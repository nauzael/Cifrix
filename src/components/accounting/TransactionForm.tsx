import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Project, Organization } from '../../lib/db';
import { useAuthStore } from '../../store/authStore';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, Save, X, Target } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { logActivity } from '../../lib/audit';
import { SearchableSelect } from '../ui/SearchableSelect';
import { useAccountingStore } from '../../store/accountingStore';

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

  // Load existing transaction data if in edit mode
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

          // Update formatted values for display
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
    // Remove dots to get the numeric value
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
    
    // Check lock date
    const lockDate = org?.settings?.accounting?.lockDate;
    if (lockDate && data.date < lockDate) {
      alert(`No se pueden crear asientos antes de la fecha de cierre: ${lockDate}`);
      return;
    }

    if (!isBalanced) {
      alert('El asiento no está balanceado. Débitos y Créditos deben ser iguales.');
      return;
    }
    if (hasGroupSelected) {
      alert('Una o más líneas usan cuentas de grupo que no aceptan movimiento. Seleccione subcuentas.');
      return;
    }

    try {
      // If editing, use existing ID, else generate new one
      const finalTransactionId = transactionId || uuidv4();
      
      await db.transaction('rw', [db.transactions, db.journal_entries, db.audit_logs], async () => {
        if (transactionId) {
          // UPDATE EXISTING
          await db.transactions.update(transactionId, {
            date: data.date,
            description: data.description,
            reference_no: data.reference_no || null,
            project_id: data.project_id || null,
            sync_status: 'pendiente'
          });

          // Delete old entries and add new ones (cleanest approach for simple accounting)
          await db.journal_entries.where('transaction_id').equals(transactionId).delete();
        } else {
          // CREATE NEW
          // 1. Create Transaction Header
          await db.transactions.add({
            id: finalTransactionId,
            organization_id: orgId,
            date: data.date,
            description: data.description,
            reference_no: data.reference_no || null,
            project_id: data.project_id || null,
            type: 'transferencia', // Changing to a more generic type for manual entries
            category_id: null,
            method: 'EFECTIVO',
            created_by: user?.id || 'unknown',
            created_at: new Date().toISOString(),
            sync_status: 'pendiente'
          });
        }

        // 2. Create Journal Entries (Same for Create and Update)
        const entries = data.entries.map(entry => ({
          id: uuidv4(),
          transaction_id: finalTransactionId,
          account_id: entry.account_id,
          debit: Number(entry.debit),
          credit: Number(entry.credit),
          sync_status: 'pendiente' as const
        }));

        await db.journal_entries.bulkAdd(entries);

        // 3. Log Activity
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

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating transaction:', error);
      alert('Error crítico al guardar: No se pudo asegurar la integridad de los datos.');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-xl w-full max-w-4xl shadow-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">
            {transactionId ? 'Editar Asiento Contable' : 'Nuevo Asiento Contable'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X size={20} className="sm:size-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <form id="transaction-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="block text-[10px] sm:text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Fecha</label>
                <input 
                  type="date" 
                  {...register('date')}
                  className="w-full border-slate-300 rounded-lg text-sm px-3 py-2"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] sm:text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Descripción</label>
                <input 
                  {...register('description')}
                  className="w-full border-slate-300 rounded-lg text-sm px-3 py-2"
                  placeholder="Ej: Pago de servicios públicos"
                />
                {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
              </div>
              <div>
                 <label className="block text-[10px] sm:text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Referencia (Opcional)</label>
                <input 
                  {...register('reference_no')}
                  className="w-full border-slate-300 rounded-lg text-sm px-3 py-2"
                  placeholder="Ej: FACT-001"
                />
              </div>
              <div>
                 <label className="block text-[10px] sm:text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Proyecto / Campaña</label>
                 <Controller
                   control={control}
                   name="project_id"
                   render={({ field }) => (
                      <SearchableSelect
                        options={[
                          { value: '', label: 'Ninguno' },
                          ...(projects || []).map(p => ({ value: p.id, label: p.name }))
                        ]}
                        value={field.value}
                       onChange={field.onChange}
                       placeholder="Ninguno"
                       size="sm"
                       className="w-full"
                     />
                   )}
                 />
              </div>
            </div>

            {/* Entries Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto scrollbar-hide">
              <table className="min-w-[650px] w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-3">Cuenta</th>
                    <th className="px-3 py-3 w-32 text-right">Débito</th>
                    <th className="px-3 py-3 w-32 text-right">Crédito</th>
                    <th className="px-3 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {fields.map((field, index) => (
                    <tr key={field.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-2 sm:p-3">
                      <Controller
                        control={control}
                        name={`entries.${index}.account_id`}
                        render={({ field }) => (
                          <SearchableSelect
                            options={accountOptions}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Buscar cuenta..."
                            size="sm"
                            className="w-full"
                          />
                        )}
                      />
                      {errors.entries?.[index]?.account_id && (
                        <p className="text-red-500 text-[10px] mt-1">{errors.entries[index]?.account_id?.message}</p>
                      )}
                      {watchedEntries[index]?.account_id && accountsMap[watchedEntries[index].account_id] && accountsMap[watchedEntries[index].account_id].accepts_movement === false && (
                        <p className="text-amber-600 text-[10px] mt-1">Seleccione una subcuenta (no grupo).</p>
                      )}
                    </td>
                      <td className="p-2 sm:p-3">
                        <input 
                          type="text" 
                          value={formattedValues[`${index}-debit`] ?? (field.debit > 0 ? formatCurrency(field.debit) : '')}
                          onChange={(e) => handleCurrencyInput(index, 'debit', e.target.value)}
                          className="w-full border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded text-sm py-2 px-3 text-right font-mono focus:ring-2 focus:ring-blue-500/50 outline-none"
                          placeholder="0"
                          onFocus={(e) => e.target.select()}
                        />
                      </td>
                      <td className="p-2 sm:p-3">
                        <input 
                          type="text" 
                          value={formattedValues[`${index}-credit`] ?? (field.credit > 0 ? formatCurrency(field.credit) : '')}
                          onChange={(e) => handleCurrencyInput(index, 'credit', e.target.value)}
                          className="w-full border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded text-sm py-2 px-3 text-right font-mono focus:ring-2 focus:ring-blue-500/50 outline-none"
                          placeholder="0"
                          onFocus={(e) => e.target.select()}
                        />
                      </td>
                      <td className="p-2 sm:p-3 text-center">
                        <button 
                          type="button" 
                          onClick={() => remove(index)}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-slate-800 font-bold text-sm">
                  <tr>
                    <td className="p-3">
                      <button 
                        type="button" 
                        onClick={() => append({ account_id: '', debit: 0, credit: 0 })}
                        className="text-blue-600 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider hover:text-blue-700"
                      >
                        <Plus size={16} /> Agregar Línea
                      </button>
                    </td>
                    <td className={`p-3 text-right font-mono ${!isBalanced ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                      {formatCurrency(totalDebit)}
                    </td>
                    <td className={`p-3 text-right font-mono ${!isBalanced ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
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
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm font-bold text-center border border-red-100 dark:border-red-900/30">
                {!isBalanced ? (
                  <>El asiento está desbalanceado por $ {formatCurrency(Math.abs(totalDebit - totalCredit))}</>
                ) : (
                  <>Hay cuentas de grupo seleccionadas que no aceptan movimiento</>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row justify-end gap-3">
          <button 
            onClick={onClose}
            className="order-2 sm:order-1 px-4 py-2.5 text-slate-600 dark:text-slate-400 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            form="transaction-form"
            disabled={!isBalanced}
            className="order-1 sm:order-2 px-6 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
          >
            <Save size={18} />
            Guardar Asiento
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
