import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Loader2, Save, User, Mail, Phone, MapPin, Briefcase } from 'lucide-react';
import { toast } from '../../store/toastStore';

const profileSchema = z.object({
  full_name: z.string().min(3, 'El nombre es requerido'),
  phone: z.string().optional(),
  address: z.string().optional(),
  job_title: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

export function ProfileSettings() {
  const { user, profile, refreshProfile } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema)
  });

  useEffect(() => {
    if (user || profile) {
      setValue('full_name', profile?.full_name || user?.user_metadata?.full_name || '');
      setValue('phone', profile?.phone || '');
      setValue('address', profile?.address || '');
      setValue('job_title', profile?.job_title || '');
    }
  }, [user, profile, setValue]);

  const onSubmit = async (data: ProfileForm) => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: data.full_name,
          phone: data.phone,
          address: data.address,
          job_title: data.job_title,
          updated_at: new Date().toISOString()
        } as any);

      if (error) throw error;

      // Also update auth metadata for consistency
      await supabase.auth.updateUser({
        data: { full_name: data.full_name }
      });

      await refreshProfile();
      toast.success('Perfil actualizado correctamente');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error('Error al actualizar perfil: ' + (error.message || 'Error desconocido'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 sm:space-y-8">
      <section>
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-8">
          <div className="size-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-blue-600/20 shrink-0">
            {profile?.full_name?.substring(0, 2).toUpperCase() || user?.email?.substring(0, 2).toUpperCase()}
          </div>
          <div className="text-center sm:text-left">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {profile?.full_name || user?.user_metadata?.full_name || 'Usuario'}
            </h3>
            <p className="text-sm text-slate-500">{user?.email}</p>
            <span className={`inline-block mt-2 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${profile?.role === 'SUPER_ADMIN' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
              }`}>
              {profile?.role || 'Usuario'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <User size={14} className="text-slate-400" />
              Nombre Completo
            </label>
            <input
              {...register('full_name')}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-none rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-slate-900 dark:text-white font-bold"
              placeholder="Tu nombre completo"
            />
            {errors.full_name && <p className="text-red-500 text-[10px] font-bold uppercase">{errors.full_name.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Mail size={14} className="text-slate-400" />
              Correo Electrónico
            </label>
            <input
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-2.5 bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-500 cursor-not-allowed font-medium"
            />
            <p className="text-[10px] text-slate-400 font-medium">El correo electrónico no se puede cambiar.</p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Phone size={14} className="text-slate-400" />
              Teléfono
            </label>
            <input
              {...register('phone')}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-none rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-slate-900 dark:text-white font-bold"
              placeholder="+57 300 000 0000"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Briefcase size={14} className="text-slate-400" />
              Cargo / Título
            </label>
            <input
              {...register('job_title')}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-none rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-slate-900 dark:text-white font-bold"
              placeholder="Ej. Tesorero, Contador"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <MapPin size={14} className="text-slate-400" />
              Dirección
            </label>
            <input
              {...register('address')}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-none rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-slate-900 dark:text-white font-bold"
              placeholder="Dirección de residencia"
            />
          </div>
        </div>
      </section>

      <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
        <button
          type="submit"
          disabled={isSaving}
          className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="animate-spin size-5" /> : <Save className="size-5" />}
          Guardar Cambios
        </button>
      </div>
    </form>
  );
}
