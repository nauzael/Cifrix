import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Send,
  Mail,
  Bell,
  Users,
  Clock,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { toast } from '../../store/toastStore';

export function Communications() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    channel: 'email',
    recipients: 'all',
    subject: '',
    content: ''
  });

  const handleSend = async () => {
    if (!formData.subject || !formData.content) {
      toast.warning('Por favor complete todos los campos');
      return;
    }

    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('campaigns')
        .insert([{
          channel: formData.channel,
          recipients: formData.recipients,
          subject: formData.subject,
          content: formData.content,
          status: 'sent',
          sent_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        }]);

      if (error) {
        if (error.message?.includes('relation "campaigns" does not exist')) {
          toast.info('La tabla "campaigns" no existe. Se simulará el envío.');
          console.log('Campaign sent:', formData);
        } else {
          throw error;
        }
      }

      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        await (supabase.from('audit_logs') as any).insert([{
          organization_id: '00000000-0000-0000-0000-000000000000',
          user_id: userData.user.id,
          action: 'SEND_CAMPAIGN',
          entity_type: 'COMMUNICATION',
          new_data: { subject: formData.subject, channel: formData.channel }
        }]);
      }

      toast.success('Campaña enviada exitosamente');
      setFormData({
        channel: 'email',
        recipients: 'all',
        subject: '',
        content: ''
      });

    } catch (error: any) {
      console.error('Error sending campaign:', error);
      toast.error('Error al enviar campaña: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20">
              <Send className="text-white" size={24} />
            </div>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Comunicaciones Masivas
            </h3>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            Envía notificaciones y correos a todas las organizaciones o segmentos específicos.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Send Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
                <Mail size={20} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Nueva Campaña
              </h3>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Canal de Envío</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className={`flex items-center gap-3 p-4 border rounded-2xl cursor-pointer transition-all duration-300 ${formData.channel === 'email' ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 shadow-lg shadow-blue-600/10' : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                    <input
                      type="radio"
                      name="channel"
                      className="hidden"
                      checked={formData.channel === 'email'}
                      onChange={() => setFormData({ ...formData, channel: 'email' })}
                    />
                    <div className={`p-2 rounded-xl transition-colors ${formData.channel === 'email' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                      <Mail size={18} />
                    </div>
                    <span className={`font-black text-sm tracking-tight ${formData.channel === 'email' ? 'text-blue-900 dark:text-blue-100' : 'text-slate-600 dark:text-slate-400'}`}>Email Masivo</span>
                  </label>

                  <label className={`flex items-center gap-3 p-4 border rounded-2xl cursor-pointer transition-all duration-300 ${formData.channel === 'notification' ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 shadow-lg shadow-blue-600/10' : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                    <input
                      type="radio"
                      name="channel"
                      className="hidden"
                      checked={formData.channel === 'notification'}
                      onChange={() => setFormData({ ...formData, channel: 'notification' })}
                    />
                    <div className={`p-2 rounded-xl transition-colors ${formData.channel === 'notification' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                      <Bell size={18} />
                    </div>
                    <span className={`font-black text-sm tracking-tight ${formData.channel === 'notification' ? 'text-blue-900 dark:text-blue-100' : 'text-slate-600 dark:text-slate-400'}`}>Notificación App</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Destinatarios</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <Users size={18} />
                  </div>
                  <select
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold pl-12 pr-4 py-4 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none text-slate-900 dark:text-white shadow-inner"
                    value={formData.recipients}
                    onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                  >
                    <option value="all">Todas las organizaciones activas</option>
                    <option value="admins">Solo administradores</option>
                    <option value="plan_free">Plan FREE</option>
                    <option value="plan_premium">Plan PREMIUM y ENTERPRISE</option>
                    <option value="inactive">Usuarios inactivos (30 días)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Asunto del Mensaje</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold px-5 py-4 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-slate-900 dark:text-white shadow-inner"
                  placeholder="Ej: Mantenimiento programado para este sábado"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Contenido de la Comunicación</label>
                <textarea
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold px-5 py-4 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-slate-900 dark:text-white h-48 resize-none shadow-inner"
                  placeholder="Escribe tu mensaje aquí..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                ></textarea>
                <div className="mt-3 flex items-start gap-2 text-[10px] text-slate-400 font-black uppercase tracking-widest leading-relaxed">
                  <AlertCircle size={12} className="mt-0.5 shrink-0" />
                  <span>Tip: Usa {'{{nombre_organizacion}}'} para personalizar el envío automáticamente.</span>
                </div>
              </div>

              <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <button className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">
                  Guardar como borrador
                </button>
                <button
                  onClick={handleSend}
                  disabled={loading}
                  className="group relative w-full sm:w-auto bg-blue-600 text-white px-10 py-4 rounded-2xl text-sm font-black flex items-center justify-center gap-3 shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  {loading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  )}
                  <span>{loading ? 'Enviando...' : 'Enviar Campaña'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400">
                <Clock size={18} />
              </div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">
                Historial
              </h3>
            </div>

            <div className="space-y-4 py-8 flex flex-col items-center text-center">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl mb-2">
                <Mail size={32} className="text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                No hay campañas recientes
              </p>
            </div>

            <button className="w-full mt-4 py-3 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl transition-all active:scale-95">
              Ver todo el historial
            </button>
          </div>

          <div className="group relative bg-blue-600 rounded-[2rem] shadow-xl shadow-blue-600/30 p-8 text-white overflow-hidden">
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 size-40 bg-white/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700" />

            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm group-hover:rotate-12 transition-transform">
                  <FileText size={24} />
                </div>
                <h3 className="text-xl font-black tracking-tight">Plantillas</h3>
              </div>

              <p className="text-blue-100 text-sm font-medium leading-relaxed">
                Gestiona las plantillas de correo transaccionales y de marketing del sistema.
              </p>

              <button className="w-full py-4 bg-white text-blue-600 rounded-2xl text-sm font-black shadow-lg hover:bg-blue-50 transition-all active:scale-95">
                Gestionar Plantillas
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
