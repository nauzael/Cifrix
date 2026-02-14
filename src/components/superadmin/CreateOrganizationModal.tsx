import React, { useState } from 'react';
import { X, Building2, Save, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CreateOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateOrganizationModal({ isOpen, onClose, onSuccess }: CreateOrganizationModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    type: 'IGLESIA' | 'EMPRESA';
    tax_id: string;
  }>({
    name: '',
    type: 'EMPRESA',
    tax_id: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Obtener el usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No hay usuario autenticado');

      // 2. Crear la organización usando RPC seguro (evita bloqueos RLS y es atómico)
      const { data: newOrgId, error: rpcError } = await (supabase as any).rpc('create_organization_with_founder', {
        p_name: formData.name,
        p_tax_id: formData.tax_id,
        p_type: formData.type,
        p_founder_user_id: user.id
      });

      if (rpcError) {
        console.error('Error creating organization via RPC:', rpcError);

        // Detectar error de nombre duplicado
        if (rpcError.code === '23505' || rpcError.message?.includes('organizations_name_unique')) {
          throw new Error(`Ya existe una organización con el nombre "${formData.name}". Por favor, elija un nombre diferente.`);
        }

        // Si el error es 42883 (función no existe), dar un mensaje más útil
        if (rpcError.code === '42883') {
          throw new Error('La función de creación segura no está instalada en la base de datos.');
        }

        throw new Error(`Error al crear la organización: ${rpcError.message}`);
      }

      if (!newOrgId) {
        throw new Error('La organización se creó pero no se recibió el ID de confirmación');
      }

      console.log('✅ Organización creada exitosamente via RPC. ID:', newOrgId);

      onSuccess();
      onClose();

      // Resetear formulario
      setFormData({
        name: '',
        type: 'EMPRESA',
        tax_id: ''
      });
    } catch (error: any) {
      console.error('Error in handleSubmit:', error);
      alert(error.message || 'Error desconocido al crear la organización');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20">
              <Building2 className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Nueva Organización
              </h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Registro de Entidad
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
          <div className="space-y-2 group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">
              Nombre de la Organización
            </label>
            <input
              type="text"
              required
              className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none font-bold transition-all"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej. Empresa SAS"
            />
          </div>

          <div className="space-y-2 group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">
              NIT / Identificación Fiscal
            </label>
            <input
              type="text"
              required
              className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none font-bold transition-all"
              value={formData.tax_id}
              onChange={e => setFormData({ ...formData, tax_id: e.target.value })}
              placeholder="Ej. 900.123.456-7"
            />
          </div>

          <div className="space-y-2 group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">
              Tipo de Entidad
            </label>
            <select
              className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none font-bold appearance-none transition-all"
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value as 'IGLESIA' | 'EMPRESA' })}
            >
              <option value="EMPRESA">Empresa / Negocio</option>
              <option value="IGLESIA">Iglesia / ONG</option>
            </select>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex-[2] px-6 py-4 bg-blue-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} className="group-hover:scale-110 transition-transform" />}
              <span>Crear Organización</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
