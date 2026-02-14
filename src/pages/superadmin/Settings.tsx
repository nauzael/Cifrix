import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  LayoutTemplate,
  CreditCard,
  Database,
  Shield,
  Info,
  Activity,
  ShieldAlert,
  Save,
  X,
  Loader2
} from 'lucide-react';
import { toast } from '../../store/toastStore';

export function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    system_name: 'Maestral Accounting',
    support_email: 'soporte@maestral.com',
    logo_url: '',
    require_2fa: true,
    session_timeout: 60
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_settings' as any)
        .select('*')
        .single();

      const settingsData = data as any;

      if (error) {
        // If table doesn't exist or other error, try localStorage
        console.warn('Could not fetch settings from DB, checking local storage:', error.message);
        const localSettings = localStorage.getItem('system_settings');
        if (localSettings) {
          setSettings(JSON.parse(localSettings));
        }
      } else if (settingsData) {
        setSettings({
          system_name: settingsData.system_name || 'Maestral Accounting',
          support_email: settingsData.support_email || 'soporte@maestral.com',
          logo_url: settingsData.logo_url || '',
          require_2fa: settingsData.require_2fa ?? true,
          session_timeout: settingsData.session_timeout || 60
        });
      }
    } catch (error) {
      console.error('Error:', error);
      // Fallback to local storage on exception
      const localSettings = localStorage.getItem('system_settings');
      if (localSettings) {
        setSettings(JSON.parse(localSettings));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Upsert settings (assuming ID 1 for single row singleton pattern or similar)
      const { error } = await supabase
        .from('system_settings' as any)
        .upsert({
          id: 1, // Single row for system settings
          ...settings,
          updated_at: new Date().toISOString()
        } as any);

      if (error) throw error;

      // Log action
      await supabase
        .from('audit_logs' as any)
        .insert([{
          organization_id: 'SYSTEM',
          user_id: 'current_user',
          action: 'UPDATE_SETTINGS',
          entity_type: 'SYSTEM',
          details: settings
        }] as any);

      toast.success('Configuración guardada exitosamente');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('Error al guardar configuración: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-900 dark:bg-slate-100 rounded-2xl shadow-lg">
              <Shield className="text-white dark:text-slate-900" size={24} />
            </div>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Ajustes del Sistema
            </h3>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            Control maestro de infraestructura, seguridad y branding global.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
        <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <nav className="flex px-8 overflow-x-auto scrollbar-hide">
            {[
              { id: 'general', label: 'General', icon: LayoutTemplate },
              { id: 'infrastructure', label: 'Infraestructura', icon: Database },
              { id: 'security', label: 'Seguridad', icon: Shield },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-6 px-4 text-xs font-black uppercase tracking-widest flex items-center gap-3 whitespace-nowrap transition-all relative group ${activeTab === tab.id
                  ? 'text-blue-600'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
              >
                <tab.icon size={18} className={activeTab === tab.id ? 'animate-pulse' : ''} />
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-8 sm:p-12">
          <div className="max-w-4xl space-y-12">
            {/* Branding Section */}
            {activeTab === 'general' && (
              <section className="space-y-8 animate-in slide-in-from-left-4 duration-500">
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <Info className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                      Branding e Identidad
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">Personaliza la apariencia global de la plataforma.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del Sistema</label>
                    <input
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-blue-600/20 rounded-2xl text-sm font-bold outline-none px-5 py-4 text-slate-900 dark:text-white transition-all placeholder:text-slate-400"
                      type="text"
                      value={settings.system_name}
                      onChange={(e) => handleChange('system_name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email de Soporte Global</label>
                    <input
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-blue-600/20 rounded-2xl text-sm font-bold outline-none px-5 py-4 text-slate-900 dark:text-white transition-all placeholder:text-slate-400"
                      type="email"
                      value={settings.support_email}
                      onChange={(e) => handleChange('support_email', e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Logotipo del Sistema (URL)</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        className="flex-1 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-blue-600/20 rounded-2xl text-sm font-bold outline-none px-5 py-4 text-slate-900 dark:text-white transition-all placeholder:text-slate-400"
                        placeholder="https://cdn.cifrix.com/logo.png"
                        type="text"
                        value={settings.logo_url}
                        onChange={(e) => handleChange('logo_url', e.target.value)}
                      />
                      <button className="px-8 py-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl text-sm font-black hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm active:scale-95">
                        Subir Archivo
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Infrastructure Section */}
            {activeTab === 'infrastructure' && (
              <section className="space-y-8 animate-in slide-in-from-left-4 duration-500">
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                    <Activity className="text-green-600" size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                      Estado de Infraestructura
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">Monitor de salud de servicios críticos en tiempo real.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {[
                    { label: 'DB CLUSTER', value: 'Saludable', detail: 'Latencia: 14ms', status: 'green' },
                    { label: 'STORAGE S3', value: '2.4 TB', detail: 'Región: us-east-1', status: 'blue' },
                    { label: 'API UPTIME', value: '99.98%', detail: 'Sin incidentes', status: 'purple' },
                  ].map((stat, i) => (
                    <div key={i} className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-800 group hover:scale-105 transition-transform duration-300">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
                        <div className={`size-2 rounded-full bg-${stat.status}-500 animate-pulse`} />
                      </div>
                      <p className="text-2xl font-black text-slate-900 dark:text-white">{stat.value}</p>
                      <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase tracking-tighter">{stat.detail}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Security Section */}
            {activeTab === 'security' && (
              <section className="space-y-8 animate-in slide-in-from-left-4 duration-500">
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                    <ShieldAlert className="text-amber-600" size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                      Seguridad Global
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">Políticas de acceso y protección de datos.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-transparent hover:border-blue-600/10 transition-all">
                    <div className="space-y-1">
                      <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Autenticación 2FA</p>
                      <p className="text-xs text-slate-500 font-medium">Requerir verificación de dos pasos para todos los administradores.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer group">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={settings.require_2fa}
                        onChange={(e) => handleChange('require_2fa', e.target.checked)}
                      />
                      <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 shadow-inner group-hover:scale-105 transition-transform" />
                    </label>
                  </div>
                  <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-transparent hover:border-blue-600/10 transition-all">
                    <div className="space-y-1 flex-1">
                      <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Expiración de Sesión</p>
                      <p className="text-xs text-slate-500 font-medium">Minutos de inactividad antes del cierre automático.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        className="w-24 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 outline-none px-4 py-2.5 text-center font-black text-slate-900 dark:text-white transition-all"
                        type="number"
                        value={settings.session_timeout}
                        onChange={(e) => handleChange('session_timeout', parseInt(e.target.value) || 60)}
                      />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">MIN</span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            <div className="flex flex-col sm:flex-row justify-end gap-4 pt-10 border-t border-slate-100 dark:border-slate-800">
              <button className="px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-sm font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-3 active:scale-95">
                <X size={18} />
                <span>Descartar Cambios</span>
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="group relative px-10 py-4 bg-blue-600 text-white rounded-2xl text-sm font-black shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 overflow-hidden"
              >
                {saving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    <Save size={18} className="group-hover:scale-110 transition-transform" />
                  </>
                )}
                <span>{saving ? 'Procesando...' : 'Guardar Configuración'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
