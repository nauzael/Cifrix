import React, { useState, useEffect } from 'react';
import { Building2, Save, Loader2, Grid } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../../types/database.types';
import { Modal } from '../ui/Modal';

type Organization = Database['public']['Tables']['organizations']['Row'];

interface EditOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  organization: Organization | null;
}

const AVAILABLE_MODULES = [
  { id: 'members', label: 'Miembros' },
  { id: 'contributions', label: 'Diezmos y ofrendas' },
  { id: 'invoicing', label: 'Facturación' },
  { id: 'accounting', label: 'Contabilidad' },
  { id: 'reports', label: 'Reportes y análisis' },
];

export function EditOrganizationModal({ isOpen, onClose, onSuccess, organization }: EditOrganizationModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'EMPRESA',
    tax_id: ''
  });
  const [selectedModules, setSelectedModules] = useState<Record<string, boolean>>({
    members: true,
    contributions: true,
    invoicing: true,
    accounting: true,
    reports: true
  });

  useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name,
        type: organization.type,
        tax_id: organization.tax_id || ''
      });

      const settings = (organization.settings as any) || {};
      if (settings.modules) {
        setSelectedModules(settings.modules);
      } else {
        setSelectedModules({
          members: true,
          contributions: true,
          invoicing: true,
          accounting: true,
          reports: true
        });
      }
    }
  }, [organization]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const currentSettings = (organization?.settings as any) || {};

      const { error } = await (supabase
        .from('organizations') as any)
        .update({
          name: formData.name,
          type: formData.type as any,
          tax_id: formData.tax_id,
          settings: {
            ...currentSettings,
            modules: selectedModules
          }
        })
        .eq('id', organization?.id);

      if (error) throw error;
      onSuccess();
      onClose();
    } catch (error) {
      alert('Error al actualizar la organización');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen && !!organization}
      onClose={onClose}
      title="Editar organización"
      subtitle="Gestión de perfil y módulos activos"
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
            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all"
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
            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all"
            value={formData.tax_id}
            onChange={e => setFormData({ ...formData, tax_id: e.target.value })}
            placeholder="Ej. 900.123.456-7"
          />
        </div>

        <div className="space-y-2 group">
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">
            Tipo de organización
          </label>
          <select
            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all appearance-none cursor-pointer"
            value={formData.type}
            onChange={e => setFormData({ ...formData, type: e.target.value })}
          >
            <option value="EMPRESA">Empresa / Negocio</option>
            <option value="IGLESIA">Iglesia / ONG</option>
          </select>
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-blue-500" />
            Módulos habilitados
          </label>
          <div className="grid grid-cols-2 gap-3">
            {AVAILABLE_MODULES.map(module => (
              <div
                key={module.id}
                onClick={() => {
                  setSelectedModules(prev => ({
                    ...prev,
                    [module.id]: !prev[module.id]
                  }));
                }}
                className={`group/mod relative flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer active:scale-95 select-none overflow-hidden ${selectedModules[module.id]
                  ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-blue-400/50 dark:hover:border-blue-500/30"
                  }`}
              >
                {selectedModules[module.id] && (
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                )}
                <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${selectedModules[module.id]
                  ? "bg-white border-white text-blue-600"
                  : "bg-transparent border-slate-300 dark:border-slate-700"
                  }`}>
                  {selectedModules[module.id] && <Grid size={12} strokeWidth={4} />}
                </div>
                <span className="text-[11px] font-bold tracking-tight">
                  {module.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row gap-3">
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

