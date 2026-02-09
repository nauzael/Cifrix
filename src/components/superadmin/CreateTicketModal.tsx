import React, { useState } from 'react';
import { X, MessageSquare, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateTicketModal({ isOpen, onClose, onSuccess }: CreateTicketModalProps) {
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    priority: 'medium',
    organization_id: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      // 1. Create the ticket in Supabase
      const { error: dbError } = await (supabase
        .from('tickets') as any)
        .insert([{
          subject: formData.subject,
          description: formData.description,
          priority: formData.priority,
          organization_id: formData.organization_id || null, // Optional org
          status: 'open',
          created_by: userData.user?.id,
          created_at: new Date().toISOString()
        }]);

      if (dbError) throw dbError;

      // 2. Create an audit log
      if (userData.user) {
        await (supabase.from('audit_logs') as any).insert([{
          organization_id: '00000000-0000-0000-0000-000000000000',
          user_id: userData.user.id,
          action: 'CREATE_TICKET',
          entity_type: 'SUPPORT',
          details: { subject: formData.subject, priority: formData.priority }
        }]);
      }

      onSuccess();
      onClose();
      setFormData({
        subject: '',
        description: '',
        priority: 'medium',
        organization_id: ''
      });
    } catch (err: any) {
      console.error('Error creating ticket:', err);
      // Fallback for demo if table doesn't exist
      if (err.message?.includes('relation "tickets" does not exist')) {
         alert('La tabla "tickets" no existe en la base de datos. Se ha simulado la creación.');
         onSuccess();
         onClose();
      } else {
        setError(err.message || 'Error al crear el ticket');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20">
              <MessageSquare className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Nuevo Ticket
              </h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Soporte y Asistencia
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all active:scale-90"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-2xl flex items-center gap-3 animate-in shake duration-300">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <div className="space-y-2 group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">
              Asunto del Requerimiento
            </label>
            <input
              required
              type="text"
              className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none font-bold transition-all"
              placeholder="Ej. Error en facturación"
              value={formData.subject}
              onChange={e => setFormData({...formData, subject: e.target.value})}
            />
          </div>

          <div className="space-y-2 group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">
              Nivel de Prioridad
            </label>
            <select
              className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none font-bold transition-all appearance-none cursor-pointer"
              value={formData.priority}
              onChange={e => setFormData({...formData, priority: e.target.value})}
            >
              <option value="low">Baja - Consulta general</option>
              <option value="medium">Media - Incidencia normal</option>
              <option value="high">Alta - Error de proceso</option>
              <option value="critical">Crítica - Sistema caído</option>
            </select>
          </div>

          <div className="space-y-2 group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">
              Descripción Detallada
            </label>
            <textarea
              required
              rows={4}
              className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none font-bold transition-all resize-none"
              placeholder="Detalla el problema o solicitud..."
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="flex justify-end gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] px-6 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  <MessageSquare size={18} />
                  Crear Ticket
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
