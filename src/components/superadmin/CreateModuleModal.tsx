import React, { useState, useEffect } from 'react';
import { X, Package, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CreateModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  moduleToEdit?: any;
}

export function CreateModuleModal({ isOpen, onClose, onSuccess, moduleToEdit }: CreateModuleModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    key: '',
    version: '1.0.0',
    color: 'blue'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
        if (moduleToEdit) {
            setFormData({
                name: moduleToEdit.name || '',
                description: moduleToEdit.desc || moduleToEdit.description || '',
                key: moduleToEdit.key || '',
                version: moduleToEdit.version || '1.0.0',
                color: moduleToEdit.color || 'blue'
            });
        } else {
            setFormData({
                name: '',
                description: '',
                key: '',
                version: '1.0.0',
                color: 'blue'
            });
        }
    }
  }, [isOpen, moduleToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      if (moduleToEdit) {
          // UPDATE logic
          const { error: dbError } = await (supabase
            .from('system_modules' as any) as any)
            .update({
                name: formData.name,
                description: formData.description,
                key: formData.key,
                version: formData.version,
                color: formData.color,
                updated_at: new Date().toISOString()
            })
            .eq('id', moduleToEdit.id);

          if (dbError) throw dbError;

          // Audit log for update
          if (userData.user) {
            await (supabase.from('audit_logs') as any).insert([{
              organization_id: '00000000-0000-0000-0000-000000000000',
              user_id: userData.user.id,
              action: 'UPDATE_MODULE',
              entity_type: 'SYSTEM',
              details: { module: formData.name, key: formData.key, changes: formData }
            }]);
          }

      } else {
          // INSERT logic
          const { error: dbError } = await (supabase
            .from('system_modules' as any) as any)
            .insert([{
              name: formData.name,
              description: formData.description,
              key: formData.key,
              version: formData.version,
              color: formData.color,
              active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]);

          if (dbError) throw dbError;

          // Audit log for create
          if (userData.user) {
            await (supabase.from('audit_logs') as any).insert([{
              organization_id: '00000000-0000-0000-0000-000000000000',
              user_id: userData.user.id,
              action: 'CREATE_MODULE',
              entity_type: 'SYSTEM',
              details: { module: formData.name, key: formData.key }
            }]);
          }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving module:', err);
      setError(err.message || 'Error al guardar el módulo');
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
              <Package className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {moduleToEdit ? 'Editar Módulo' : 'Nuevo Módulo'}
              </h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Componentes de Sistema
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

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2 group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">
                Nombre del Módulo
              </label>
              <input
                required
                type="text"
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none font-bold transition-all"
                placeholder="Ej. Facturación"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="space-y-2 group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">
                Clave (Key)
              </label>
              <input
                required
                type="text"
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none font-bold transition-all"
                placeholder="Ej. billing"
                value={formData.key}
                onChange={e => setFormData({...formData, key: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2 group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">
              Descripción
            </label>
            <textarea
              required
              rows={3}
              className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none font-bold transition-all resize-none"
              placeholder="Descripción corta de la funcionalidad del módulo..."
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2 group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">
                Versión
              </label>
              <input
                required
                type="text"
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none font-bold transition-all"
                placeholder="1.0.0"
                value={formData.version}
                onChange={e => setFormData({...formData, version: e.target.value})}
              />
            </div>
            <div className="space-y-2 group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">
                Color
              </label>
              <select
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none font-bold transition-all appearance-none cursor-pointer"
                value={formData.color}
                onChange={e => setFormData({...formData, color: e.target.value})}
              >
                <option value="blue">Azul</option>
                <option value="purple">Morado</option>
                <option value="emerald">Esmeralda</option>
                <option value="amber">Ámbar</option>
                <option value="rose">Rosa</option>
              </select>
            </div>
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
                  <Package size={18} />
                  {moduleToEdit ? 'Guardar Cambios' : 'Crear Módulo'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
