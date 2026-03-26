import React, { useState } from 'react';
import { Building2, Save, Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../lib/supabase';
import { Modal } from '../ui/Modal';
import { toast } from '../../store/toastStore';

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No hay usuario autenticado');

      const id = uuidv4();
      const { error: insertError } = await supabase.from('organizations').insert({
        id: id,
        name: formData.name,
        tax_id: formData.tax_id,
        type: formData.type,
        status: 'ACTIVE',
        created_by: user.id
      });

      if (insertError) {
        if (insertError.code === '23505') {
          if (insertError.message?.includes('tax_id') || insertError.message?.includes('nit')) {
            throw new Error(`Ya existe una organización registrada con el NIT "${formData.tax_id}". Por favor, verifique el documento.`);
          }
          if (insertError.message?.includes('name') || insertError.message?.includes('nombre') || insertError.message?.includes('unique')) {
            throw new Error(`Ya existe una organización con el nombre "${formData.name}". Por favor, elija un nombre diferente.`);
          }
          throw new Error('Ya existe un registro duplicado (Nombre o NIT). Verifique los datos.');
        }
        throw new Error(`Error al crear la organización: ${insertError.message}`);
      }

      toast.success('Organización creada exitosamente');
      onSuccess();
      onClose();
      setFormData({ name: '', type: 'EMPRESA', tax_id: '' });
    } catch (error: any) {
      toast.error(error.message || 'Error desconocido al crear la organización');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nueva organización"
      subtitle="Registro de entidad administrativa"
      icon={Building2}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2 group">
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">
            Nombre de la organización
          </label>
          <input
            type="text"
            required
            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none font-bold transition-all"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ej. Empresa S.A.S"
          />
        </div>

        <div className="space-y-2 group">
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">
            Identificación fiscal (NIT)
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
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">
            Tipo de entidad
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
            className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="group relative flex-[2] px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl text-sm font-bold shadow-xl shadow-blue-600/20 hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} className="group-hover:scale-110 transition-transform" />}
            <span>Guardar cambios</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
