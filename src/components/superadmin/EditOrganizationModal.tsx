import React, { useState, useEffect } from 'react';
import { X, Building2, Save, Loader2, Grid } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../../types/database.types';

type Organization = Database['public']['Tables']['organizations']['Row'];

interface EditOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  organization: Organization | null;
}

const AVAILABLE_MODULES = [
  { id: 'members', label: 'Miembros' },
  { id: 'contributions', label: 'Diezmos' },
  { id: 'invoicing', label: 'Facturación' },
  { id: 'accounting', label: 'Contabilidad' },
  { id: 'reports', label: 'Reportes' },
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
        // Default modules based on type if not set
        const isChurch = organization.type === 'IGLESIA';
        setSelectedModules({
          members: true,
          contributions: true, // Only show if enabled, but internal logic handles hiding for EMPRESA
          invoicing: true,
          accounting: true,
          reports: true
        });
      }
    }
  }, [organization]);

  if (!isOpen || !organization) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get current settings to preserve other values
      const currentSettings = (organization.settings as any) || {};

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
        .eq('id', organization.id);

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating organization:', error);
      alert('Error al actualizar la organización');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20">
              <Building2 className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Editar Organización
              </h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Perfil de Entidad
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

        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
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
              NIT / Identificación
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
              Tipo de Organización
            </label>
            <select
              className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none font-bold transition-all appearance-none cursor-pointer"
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value })}
            >
              <option value="EMPRESA">Empresa / Negocio</option>
              <option value="IGLESIA">Iglesia / ONG</option>
            </select>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <Grid size={14} className="text-blue-600" />
              Módulos Habilitados
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
                  className={`flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer active:scale-95 select-none ${selectedModules[module.id]
                      ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/20"
                      : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-blue-400 dark:hover:border-blue-500/50"
                    }`}
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${selectedModules[module.id]
                      ? "bg-white border-white text-blue-600"
                      : "bg-transparent border-current"
                    }`}>
                    {selectedModules[module.id] && <Grid size={12} strokeWidth={4} />}
                  </div>
                  <span className="text-xs font-black uppercase tracking-tight">
                    {module.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 flex gap-4 border-t border-slate-100 dark:border-slate-800">
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
                  <Save size={18} />
                  Guardar Cambios
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
