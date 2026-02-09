import { useState, useEffect } from 'react';
import {
  Church,
  User,
  Wallet,
  Bell,
  Shield,
  Info,
  Globe,
  Save,
  AlertTriangle,
  Loader2,
  Trash2,
  FileBadge
} from 'lucide-react';
import { cn } from '../lib/utils';
import { db, Organization, resetDatabase } from '../lib/db';
import { useAuthStore } from '../store/authStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { AccountingSettings } from '../components/settings/AccountingSettings';
import { SecuritySettings } from '../components/settings/SecuritySettings';
import { DianSettings } from '../components/settings/DianSettings';
import { ProfileSettings } from '../components/settings/ProfileSettings';
import { useForm } from 'react-hook-form';
import { v4 as uuidv4 } from 'uuid';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { seedIglesiaSAS, seedEmpresaSAS } from '../utils/seedData';
import { Database } from 'lucide-react';

const orgSchema = z.object({
  name: z.string().min(3, 'El nombre es requerido'),
  tax_id: z.string().min(1, 'El NIT es requerido'),
  type: z.enum(['IGLESIA', 'EMPRESA']),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
});

type OrgForm = z.infer<typeof orgSchema>;

export function Settings() {
  const { user, profile } = useAuthStore();
  const [activeTab, setActiveTab] = useState('organization');
  const [isSaving, setIsSaving] = useState(false);

  const org = useLiveQuery(async () => {
    if (profile?.organizationId) {
      const currentOrg = await db.organizations.get(profile.organizationId);
      if (currentOrg) return currentOrg;
    }

    const orgs = await db.organizations.toArray();
    return orgs.length > 0 ? orgs[0] : null;
  }, [profile?.organizationId]);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<OrgForm>({
    resolver: zodResolver(orgSchema),
  });

  useEffect(() => {
    if (org) {
      setValue('name', org.name);
      setValue('tax_id', org.tax_id);
      setValue('type', org.type);
      setValue('address', org.settings?.address || '');
      setValue('phone', org.settings?.phone || '');
      setValue('email', org.settings?.email || '');
    }
  }, [org, setValue]);

  const isLoading = org === undefined;

  const onSubmit = async (data: OrgForm) => {
    if (!org) return;
    setIsSaving(true);
    try {
      await db.organizations.update(org.id, {
        name: data.name,
        tax_id: data.tax_id,
        type: data.type,
        settings: {
          ...org.settings,
          address: data.address,
          phone: data.phone,
          email: data.email
        },
        sync_status: 'pendiente'
      });
      alert('Configuración guardada correctamente');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error al guardar la configuración');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteDatabase = async () => {
    if (confirm('¿ESTÁ COMPLETAMENTE SEGURO? Esta acción borrará TODOS los datos locales (miembros, contabilidad, etc.), limpiará el caché y reiniciará la aplicación.')) {
      await resetDatabase();
    }
  };

  const tabs = [
    { id: 'organization', label: 'Organización', icon: Church },
    { id: 'profile', label: 'Perfil de Usuario', icon: User },
    { id: 'accounting', label: 'Contabilidad', icon: Wallet },
    { id: 'dian', label: 'Facturación DIAN', icon: FileBadge },
    { id: 'security', label: 'Seguridad', icon: Shield },
  ];

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="p-3 sm:p-5 max-w-7xl mx-auto space-y-4 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20">
              <Shield className="text-white" size={24} />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Ajustes del Sistema
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Gestiona la información de tu organización, perfil y preferencias de seguridad.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
        {/* Tabs Navigation */}
        <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 px-3 sm:px-5">
          <div className="flex gap-1 sm:gap-4 flex-wrap py-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative py-3 px-4 sm:px-2 text-xs sm:text-sm font-black uppercase tracking-widest transition-all flex items-center gap-3 whitespace-nowrap rounded-xl",
                  activeTab === tab.id
                    ? "bg-white dark:bg-slate-900 text-blue-600 shadow-md ring-1 ring-slate-200 dark:ring-slate-700"
                    : "text-slate-500 dark:text-slate-400 hover:text-blue-600 hover:bg-white/50 dark:hover:bg-slate-900/50"
                )}
              >
                <tab.icon className={cn("size-4 sm:size-5 transition-transform duration-300", activeTab === tab.id && "scale-110")} />
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute -bottom-[17px] left-0 right-0 h-1 bg-blue-600 rounded-t-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6">
          {activeTab === 'organization' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <section className="space-y-5">
                  <div className="flex items-center gap-4 text-slate-900 dark:text-white">
                    <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-xl text-blue-600">
                      <Info size={20} />
                    </div>
                    <h3 className="text-xl font-black tracking-tight">Información de la Organización</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                    <div className="space-y-2 group">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">Nombre Legal</label>
                      <input
                        {...register('name')}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all outline-none font-bold"
                        placeholder="Ej. Iglesia Central"
                      />
                      {errors.name && <p className="text-red-500 text-[10px] font-black mt-1 uppercase ml-1">{errors.name.message}</p>}
                    </div>

                    <div className="space-y-2 group">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">Tipo de Entidad (Solo SuperAdmin)</label>
                      <select
                        {...register('type')}
                        disabled={true}
                        className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-900/50 dark:text-slate-400 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all outline-none font-bold appearance-none opacity-60 cursor-not-allowed"
                      >
                        <option value="IGLESIA">Iglesia / OSAL</option>
                        <option value="EMPRESA">Empresa / Negocio</option>
                      </select>
                    </div>

                    <div className="space-y-2 group">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">NIT / ID Fiscal</label>
                      <input
                        {...register('tax_id')}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all outline-none font-bold"
                        placeholder="000.000.000-0"
                      />
                      {errors.tax_id && <p className="text-red-500 text-[10px] font-black mt-1 uppercase ml-1">{errors.tax_id.message}</p>}
                    </div>

                    <div className="space-y-2 group">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">Ubicación Física</label>
                      <input
                        {...register('address')}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all outline-none font-bold"
                        placeholder="Dirección completa"
                      />
                    </div>

                    <div className="space-y-2 group">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">Teléfono</label>
                      <input
                        {...register('phone')}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all outline-none font-bold"
                        placeholder="+57 000 000 0000"
                      />
                    </div>

                    <div className="space-y-2 group">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">Email Corporativo</label>
                      <input
                        {...register('email')}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all outline-none font-bold"
                        placeholder="contacto@organizacion.com"
                      />
                      {errors.email && <p className="text-red-500 text-[10px] font-black mt-1 uppercase ml-1">{errors.email.message}</p>}
                    </div>
                  </div>
                </section>

                <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => reset()}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
                  >
                    Descartar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="group relative w-full sm:w-auto px-8 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    {isSaving ? <Loader2 className="animate-spin size-5" /> : <Save className="size-5 group-hover:scale-110 transition-transform" />}
                    <span>Actualizar Datos</span>
                  </button>
                </div>
              </form>

              {/* Data Tools */}
              <div className="mt-12 p-8 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-3xl border border-indigo-100 dark:border-indigo-500/10 space-y-6">
                <div className="flex flex-col sm:flex-row items-start gap-6">
                  <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20">
                    <Database size={28} />
                  </div>
                  <div className="flex-1 space-y-2">
                    <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                      Herramientas de Desarrollo ({org?.type === 'EMPRESA' ? 'Modo Empresa' : 'Modo Iglesia'})
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-medium max-w-2xl">
                      Genera automáticamente registros de prueba (miembros, facturas, transacciones) para validar el funcionamiento de la plataforma en los últimos 3 meses.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  <button
                    type="button"
                    onClick={async () => {
                      const entityName = org?.name || 'la organización actual';
                      if (confirm(`¿Desea generar datos de prueba para ${entityName}?`)) {
                        const result = org?.type === 'EMPRESA' ? await seedEmpresaSAS(org.id) : await seedIglesiaSAS(org.id);
                        alert(result.message);
                        if (result.success) window.location.reload();
                      }
                    }}
                    className="group flex items-center gap-3 px-8 py-3.5 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                  >
                    <Database size={18} className="group-hover:rotate-12 transition-transform" />
                    Generar Data Dummy
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ProfileSettings />
            </div>
          )}

          {activeTab === 'accounting' && org && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <AccountingSettings organization={org} />
            </div>
          )}

          {activeTab === 'dian' && org && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <DianSettings organization={org} />
            </div>
          )}

          {activeTab === 'security' && org && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <SecuritySettings organization={org} />
            </div>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50/50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/10 rounded-[2.5rem] p-8 sm:p-10">
        <div className="flex flex-col sm:flex-row items-start gap-8">
          <div className="p-4 bg-red-100 dark:bg-red-500/10 text-red-600 rounded-2xl">
            <AlertTriangle size={32} />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <h4 className="text-xl font-black text-red-600 tracking-tight">Acciones Críticas</h4>
              <p className="text-sm text-red-500/70 font-black uppercase tracking-widest mt-1">Manejar con precaución extrema</p>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium max-w-2xl">
              Reiniciar la base de datos eliminará permanentemente todos los registros locales, configuraciones y datos de caché. Esta acción no se puede deshacer.
            </p>
            <button
              onClick={deleteDatabase}
              className="group flex items-center gap-3 px-8 py-4 bg-white dark:bg-slate-900 border-2 border-red-100 dark:border-red-500/20 text-red-600 text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-red-600 hover:text-white hover:border-red-600 transition-all active:scale-95 shadow-sm"
            >
              <Trash2 size={18} className="group-hover:rotate-12 transition-transform" />
              Borrar Todo y Reiniciar App
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
