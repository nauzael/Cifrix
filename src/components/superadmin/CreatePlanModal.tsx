import React, { useState } from 'react';
import { X, Tag, Save, Loader2, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CreatePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Feature {
  id: string;
  name: string;
  included: boolean;
  limit?: string;
}

export function CreatePlanModal({ isOpen, onClose, onSuccess }: CreatePlanModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    period: 'monthly',
    description: '',
    color: 'bg-blue-500',
    active: true
  });

  const [features, setFeatures] = useState<Feature[]>([
    { id: '1', name: 'Usuarios', included: true, limit: '5' },
    { id: '2', name: 'Almacenamiento', included: true, limit: '1GB' },
  ]);

  if (!isOpen) return null;

  const addFeature = () => {
    setFeatures([...features, { id: Date.now().toString(), name: '', included: true, limit: '' }]);
  };

  const removeFeature = (id: string) => {
    setFeatures(features.filter(f => f.id !== id));
  };

  const updateFeature = (id: string, field: keyof Feature, value: any) => {
    setFeatures(features.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('plans' as any)
        .insert([
          {
            ...formData,
            features: features as any
          }
        ] as any);

      if (error) throw error;
      
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        name: '',
        price: 0,
        period: 'monthly',
        description: '',
        color: 'bg-blue-500',
        active: true
      });
    } catch (error) {
      console.error('Error creating plan:', error);
      alert('Error al crear el plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20">
              <Tag className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Nuevo Plan de Suscripción
              </h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Configuración Comercial
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">
                Nombre del Plan
              </label>
              <input
                type="text"
                required
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none font-bold transition-all"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej. Plan Pro"
              />
            </div>
            <div className="space-y-2 group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">
                Precio Mensual
              </label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  required
                  className="w-full pl-9 pr-5 py-4 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none font-bold transition-all"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2 group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">
              Descripción Corta
            </label>
            <input
              type="text"
              required
              className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none font-bold transition-all"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ej. Ideal para empresas medianas"
            />
          </div>

          <div className="space-y-2 group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">
              Color Distintivo
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {[
                { name: 'Azul', value: 'bg-blue-500' },
                { name: 'Verde', value: 'bg-green-500' },
                { name: 'Morado', value: 'bg-purple-500' },
                { name: 'Ámbar', value: 'bg-amber-500' },
                { name: 'Rojo', value: 'bg-rose-500' },
                { name: 'Negro', value: 'bg-slate-800' },
              ].map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: color.value })}
                  className={`h-10 rounded-xl transition-all active:scale-90 border-4 ${
                    formData.color === color.value 
                      ? 'border-white dark:border-slate-700 shadow-lg scale-110' 
                      : 'border-transparent opacity-60 hover:opacity-100'
                  } ${color.value}`}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Características y Límites
              </label>
              <button
                type="button"
                onClick={addFeature}
                className="text-xs font-black text-blue-600 hover:text-blue-700 flex items-center gap-1 uppercase tracking-wider bg-blue-50 dark:bg-blue-500/10 px-3 py-1.5 rounded-xl transition-all active:scale-95"
              >
                <Plus size={14} /> Añadir
              </button>
            </div>
            
            <div className="space-y-3">
              {features.map((feature) => (
                <div key={feature.id} className="flex gap-3 items-center group/item animate-in slide-in-from-left-2 duration-200">
                  <button
                    type="button"
                    onClick={() => updateFeature(feature.id, 'included', !feature.included)}
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                      feature.included 
                        ? 'bg-blue-600 border-blue-600 text-white' 
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-transparent'
                    }`}
                  >
                    <Plus size={14} className={feature.included ? '' : 'opacity-0'} />
                  </button>
                  <input
                    type="text"
                    placeholder="Nombre característica"
                    className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 outline-none transition-all"
                    value={feature.name}
                    onChange={e => updateFeature(feature.id, 'name', e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Límite"
                    className="w-24 px-4 py-3 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 outline-none transition-all"
                    value={feature.limit || ''}
                    onChange={e => updateFeature(feature.id, 'limit', e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeFeature(feature.id)}
                    className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all active:scale-90"
                  >
                    <Trash2 size={16} />
                  </button>
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
                  Guardar Plan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
