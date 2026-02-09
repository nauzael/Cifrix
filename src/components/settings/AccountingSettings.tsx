import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { db, Organization } from '../../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { SearchableSelect } from '../ui/SearchableSelect';
import { 
  Save, 
  Loader2, 
  Settings2, 
  Lock, 
  Percent, 
  Coins
} from 'lucide-react';

const accountingSchema = z.object({
  currency: z.string().min(1, 'La moneda es requerida'),
  fiscalYearStart: z.string().min(1, 'El inicio del año fiscal es requerido'),
  defaultCashAccount: z.string().optional(),
  defaultBankAccount: z.string().optional(),
  defaultReceivableAccount: z.string().optional(),
  defaultPayableAccount: z.string().optional(),
  defaultTaxRate: z.coerce.number(),
  lockDate: z.string().optional(),
});

type AccountingForm = z.infer<typeof accountingSchema>;

interface AccountingSettingsProps {
  organization: Organization;
}

export function AccountingSettings({ organization }: AccountingSettingsProps) {
  const [isSaving, setIsSaving] = useState(false);
  
  const accounts = useLiveQuery(
    () => db.accounts.where('organization_id').equals(organization.id).sortBy('code'),
    [organization.id]
  );

  const { register, handleSubmit, reset, control } = useForm<AccountingForm>({
    resolver: zodResolver(accountingSchema) as any,
    defaultValues: {
      currency: organization.settings?.currency || 'COP',
      fiscalYearStart: organization.settings?.accounting?.fiscalYearStart || '1',
      defaultCashAccount: organization.settings?.accounting?.defaultCashAccount || '',
      defaultBankAccount: organization.settings?.accounting?.defaultBankAccount || '',
      defaultReceivableAccount: organization.settings?.accounting?.defaultReceivableAccount || '',
      defaultPayableAccount: organization.settings?.accounting?.defaultPayableAccount || '',
      defaultTaxRate: organization.settings?.accounting?.defaultTaxRate || 0,
      lockDate: organization.settings?.accounting?.lockDate || '',
    }
  });
  
  // Update form when organization settings change
  useEffect(() => {
    if (!organization.settings?.accounting) return;

    const currentSettings = organization.settings.accounting;

    reset({
      currency: organization.settings?.currency || 'COP',
      fiscalYearStart: currentSettings.fiscalYearStart || '1',
      defaultCashAccount: currentSettings.defaultCashAccount || '',
      defaultBankAccount: currentSettings.defaultBankAccount || '',
      defaultReceivableAccount: currentSettings.defaultReceivableAccount || '',
      defaultPayableAccount: currentSettings.defaultPayableAccount || '',
      defaultTaxRate: currentSettings.defaultTaxRate || 0,
      lockDate: currentSettings.lockDate || '',
    });
  }, [organization, reset]);

  if (!accounts) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-600" /></div>;
  }

  const onSubmit = async (data: AccountingForm) => {
    setIsSaving(true);
    try {
      await db.organizations.update(organization.id, {
        settings: {
          ...organization.settings,
          currency: data.currency,
          accounting: {
            ...organization.settings?.accounting,
            fiscalYearStart: data.fiscalYearStart,
            defaultCashAccount: data.defaultCashAccount,
            defaultBankAccount: data.defaultBankAccount,
            defaultReceivableAccount: data.defaultReceivableAccount,
            defaultPayableAccount: data.defaultPayableAccount,
            defaultTaxRate: data.defaultTaxRate,
            lockDate: data.lockDate,
          }
        },
        sync_status: 'pendiente'
      });
      alert('Configuración contable guardada correctamente');
    } catch (error) {
      console.error('Error saving accounting settings:', error);
      alert('Error al guardar la configuración');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      {/* Moneda y Año Fiscal */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6 text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-4">
          <Coins className="size-5 text-blue-600" />
          <h3 className="font-black text-lg">General y Moneda</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Moneda Principal</label>
            <select 
              {...register('currency')}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 outline-none font-bold dark:text-white"
            >
              <option value="COP">Peso Colombiano (COP)</option>
              <option value="USD">Dólar Estadounidense (USD)</option>
              <option value="MXN">Peso Mexicano (MXN)</option>
              <option value="EUR">Euro (EUR)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inicio del Año Fiscal</label>
            <select 
              {...register('fiscalYearStart')}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 outline-none font-bold dark:text-white"
            >
              <option value="1">Enero</option>
              <option value="2">Febrero</option>
              <option value="3">Marzo</option>
              <option value="4">Abril</option>
              <option value="5">Mayo</option>
              <option value="6">Junio</option>
              <option value="7">Julio</option>
              <option value="8">Agosto</option>
              <option value="9">Septiembre</option>
              <option value="10">Octubre</option>
              <option value="11">Noviembre</option>
              <option value="12">Diciembre</option>
            </select>
          </div>
        </div>
      </section>

      {/* Cuentas Predeterminadas */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6 text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-4">
          <Settings2 className="size-5 text-blue-600" />
          <h3 className="font-black text-lg">Mapeo de Cuentas Automáticas</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {[
            { label: 'Cuenta de Caja (Efectivo)', name: 'defaultCashAccount' as const },
            { label: 'Cuenta de Bancos', name: 'defaultBankAccount' as const },
            { label: 'Cuentas por Cobrar', name: 'defaultReceivableAccount' as const },
            { label: 'Cuentas por Pagar', name: 'defaultPayableAccount' as const },
          ].map((field) => (
            <div key={field.name} className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{field.label}</label>
              <Controller
                control={control}
                name={field.name}
                render={({ field: { onChange, value } }) => (
                  <SearchableSelect
                    value={value}
                    onChange={onChange}
                    options={accounts
                      ?.map(acc => ({
                        value: acc.id,
                        label: `${acc.code} - ${acc.name}`
                      })) || []}
                    placeholder="Seleccionar cuenta..."
                  />
                )}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Impuestos y Bloqueo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6 text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-4">
            <Percent className="size-5 text-blue-600" />
            <h3 className="font-black text-lg">Impuestos</h3>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tasa Predeterminada (%)</label>
            <input 
              type="number"
              step="0.01"
              {...register('defaultTaxRate')}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 outline-none font-bold dark:text-white"
              placeholder="0.00"
            />
          </div>
        </section>

        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6 text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-4">
            <Lock className="size-5 text-red-600" />
            <h3 className="font-black text-lg">Cierre de Periodo</h3>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bloquear antes de:</label>
            <input 
              type="date"
              {...register('lockDate')}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 outline-none font-bold dark:text-white"
            />
            <p className="text-[10px] text-slate-400 font-bold mt-2">No se podrán crear ni editar asientos con fecha anterior a este día.</p>
          </div>
        </section>
      </div>

      <div className="flex items-center justify-end gap-4 pt-4">
        <button 
          type="submit"
          disabled={isSaving}
          className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="animate-spin size-5" /> : <Save className="size-5" />}
          Guardar Configuración
        </button>
      </div>
    </form>
  );
}
