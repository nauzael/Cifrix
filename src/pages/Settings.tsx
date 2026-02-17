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
import { toast } from '../store/toastStore';
import { confirm } from '../store/confirmStore';
import { supabase } from '../lib/supabase';

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
      const updatedOrg = {
        name: data.name,
        tax_id: data.tax_id,
        type: data.type,
        settings: {
          ...org.settings,
          address: data.address,
          phone: data.phone,
          email: data.email
        },
        address: data.address, // Update top-level columns too
        phone: data.phone,
        email: data.email
      };

      // 1. Intentar guardar en la nube (Enfoque A: Directo)
      const { error: cloudError } = await supabase
        .from('organizations')
        .update(updatedOrg)
        .eq('id', org.id);

      if (cloudError) throw cloudError;

      // 2. Si tiene éxito en la nube, actualizar local
      await db.organizations.update(org.id, {
        ...updatedOrg,
        sync_status: 'sincronizado'
      });

      toast.success('Configuración sincronizada correctamente');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Error al sincronizar con la nube. Verifique su conexión.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteDatabase = async () => {
    confirm({
      title: '¡ADVERTENCIA CRÍTICA!',
      message: '¿ESTÁ COMPLETAMENTE SEGURO? Esta acción borrará TODOS los datos locales (miembros, contabilidad, etc.), limpiará el caché y reiniciará la aplicación.',
      confirmText: 'SÍ, BORRAR TODO',
      type: 'danger',
      onConfirm: async () => {
        await resetDatabase();
      }
    });
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
    <div className="p-3 sm:p-5 max-w-7xl mx-auto space-y-4">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20">
              <Shield className="text-white" size={24} />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              Ajustes del Sistema
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Gestiona la información de tu organización, perfil y preferencias de seguridad.
          </p>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-xl shadow-primary/5 overflow-hidden">
        {/* Tabs Navigation */}
        <div className="border-b border-border bg-muted/30 px-3 sm:px-5">
          <div className="flex gap-1 sm:gap-4 flex-wrap py-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative py-3 px-4 sm:px-2 text-xs sm:text-sm font-black uppercase tracking-widest transition-all flex items-center gap-3 whitespace-nowrap rounded-xl",
                  activeTab === tab.id
                    ? "bg-background text-primary shadow-md ring-1 ring-border"
                    : "text-muted-foreground hover:text-primary hover:bg-background/50"
                )}
              >
                <tab.icon className={cn("size-4 sm:size-5 transition-transform duration-300", activeTab === tab.id && "scale-110")} />
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute -bottom-[17px] left-0 right-0 h-1 bg-primary rounded-t-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6">
          {activeTab === 'organization' && (
            <div>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <section className="space-y-5">
                  <div className="flex items-center gap-4 text-foreground">
                    <div className="p-2 bg-primary/10 rounded-xl text-primary">
                      <Info size={20} />
                    </div>
                    <h3 className="text-xl font-black tracking-tight">Información de la Organización</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                    <div className="space-y-2 group">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 group-focus-within:text-primary transition-colors">Nombre Legal</label>
                      <input
                        {...register('name')}
                        className="w-full px-4 py-2.5 bg-muted/50 text-foreground border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/10 focus:border-primary/50 transition-all outline-none font-bold"
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
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 group-focus-within:text-primary transition-colors">NIT / ID Fiscal</label>
                      <input
                        {...register('tax_id')}
                        className="w-full px-4 py-2.5 bg-muted/50 text-foreground border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/10 focus:border-primary/50 transition-all outline-none font-bold"
                        placeholder="000.000.000-0"
                      />
                      {errors.tax_id && <p className="text-red-500 text-[10px] font-black mt-1 uppercase ml-1">{errors.tax_id.message}</p>}
                    </div>

                    <div className="space-y-2 group">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 group-focus-within:text-primary transition-colors">Ubicación Física</label>
                      <input
                        {...register('address')}
                        className="w-full px-4 py-2.5 bg-muted/50 text-foreground border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/10 focus:border-primary/50 transition-all outline-none font-bold"
                        placeholder="Dirección completa"
                      />
                    </div>

                    <div className="space-y-2 group">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 group-focus-within:text-primary transition-colors">Teléfono</label>
                      <input
                        {...register('phone')}
                        className="w-full px-4 py-2.5 bg-muted/50 text-foreground border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/10 focus:border-primary/50 transition-all outline-none font-bold"
                        placeholder="+57 000 000 0000"
                      />
                    </div>

                    <div className="space-y-2 group">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 group-focus-within:text-primary transition-colors">Email Corporativo</label>
                      <input
                        {...register('email')}
                        className="w-full px-4 py-2.5 bg-muted/50 text-foreground border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/10 focus:border-primary/50 transition-all outline-none font-bold"
                        placeholder="contacto@organizacion.com"
                      />
                      {errors.email && <p className="text-red-500 text-[10px] font-black mt-1 uppercase ml-1">{errors.email.message}</p>}
                    </div>

                    <div className="sm:col-span-2 space-y-4 group p-6 bg-muted/30 rounded-[2rem] border border-border">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary rounded-xl text-primary-foreground shadow-lg shadow-primary/20">
                          <Globe size={18} />
                        </div>
                        <h4 className="text-sm font-black uppercase tracking-widest text-foreground">Identidad Visual (Logo)</h4>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-6">
                        <div className="size-32 rounded-[2rem] bg-card border-2 border-dashed border-border flex items-center justify-center overflow-hidden shadow-inner group-hover:border-primary/50 transition-colors">
                          {org?.settings?.logo_url ? (
                            <img src={org.settings.logo_url} className="w-full h-full object-contain p-2" alt="Logo" />
                          ) : (
                            <div className="text-center p-4">
                              <Church className="size-8 text-slate-300 mx-auto mb-2" />
                              <p className="text-[9px] font-bold text-slate-400 uppercase leading-tight">Sin Logo</p>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 space-y-3 w-full">
                          <p className="text-xs text-slate-500 font-medium leading-relaxed">
                            Cargue el logo de su organización para personalizar los reportes PDF y certificados. Se recomienda una imagen en formato PNG con fondo transparente (Relación 1:1 o 4:3).
                          </p>
                          <div className="flex gap-2">
                            <label className="cursor-pointer flex-1 sm:flex-none">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file && org) {
                                    if (file.size > 2 * 1024 * 1024) {
                                      toast.error('El archivo es demasiado grande (Máximo 2MB)');
                                      return;
                                    }
                                    const reader = new FileReader();
                                    reader.onloadend = async () => {
                                      const base64 = reader.result as string;

                                      toast.info('Subiendo logo a la nube...');
                                      try {
                                        const { error: cloudError } = await supabase
                                          .from('organizations')
                                          .update({
                                            settings: { ...org.settings, logo_url: base64 }
                                          })
                                          .eq('id', org.id);

                                        if (cloudError) throw cloudError;

                                        await db.organizations.update(org.id, {
                                          settings: { ...org.settings, logo_url: base64 },
                                          sync_status: 'sincronizado'
                                        });
                                        toast.success('Logo actualizado correctamente');
                                      } catch (error) {
                                        console.error('Error uploading logo:', error);
                                        toast.error('No se pudo subir el logo a la nube');
                                      }
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                              <div className="px-6 py-2.5 bg-card border border-border rounded-xl text-[10px] font-black uppercase tracking-widest text-foreground hover:border-primary hover:text-primary transition-all text-center shadow-sm">
                                Seleccionar Imagen
                              </div>
                            </label>
                            {org?.settings?.logo_url && (
                              <button
                                type="button"
                                onClick={async () => {
                                  confirm({
                                    title: 'Eliminar Logo',
                                    message: '¿Desea eliminar el logo?',
                                    confirmText: 'SÍ, ELIMINAR',
                                    type: 'danger',
                                    onConfirm: async () => {
                                      try {
                                        const { error: cloudError } = await supabase
                                          .from('organizations')
                                          .update({
                                            settings: { ...org!.settings, logo_url: null }
                                          })
                                          .eq('id', org!.id);

                                        if (cloudError) throw cloudError;

                                        await db.organizations.update(org!.id, {
                                          settings: { ...org!.settings, logo_url: null },
                                          sync_status: 'sincronizado'
                                        });
                                        toast.success('Logo eliminado');
                                      } catch (error) {
                                        toast.error('Error al eliminar el logo de la nube');
                                      }
                                    }
                                  });
                                }}
                                className="px-4 py-2.5 bg-red-50 dark:bg-red-500/10 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-6 border-t border-border">
                  <button
                    type="button"
                    onClick={() => reset()}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest text-muted-foreground hover:bg-accent transition-all active:scale-95"
                  >
                    Descartar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="group relative w-full sm:w-auto px-8 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    {isSaving ? <Loader2 className="animate-spin size-5" /> : <Save className="size-5 group-hover:scale-110 transition-transform" />}
                    <span>Actualizar Datos</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'profile' && (
            <div>
              <ProfileSettings />
            </div>
          )}

          {activeTab === 'accounting' && org && (
            <div>
              <AccountingSettings organization={org} />
            </div>
          )}

          {activeTab === 'dian' && org && (
            <div>
              <DianSettings organization={org} />
            </div>
          )}

          {activeTab === 'security' && org && (
            <div>
              <SecuritySettings organization={org} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
