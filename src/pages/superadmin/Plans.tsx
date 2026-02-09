import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CreatePlanModal } from '../../components/superadmin/CreatePlanModal';
import { 
  Check, 
  X, 
  Edit2, 
  Plus, 
  Zap, 
  Shield, 
  Users, 
  Database, 
  Globe,
  Save
} from 'lucide-react';

interface PlanFeature {
  id: string;
  name: string;
  included: boolean;
  limit?: string;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  period: 'monthly' | 'yearly';
  description: string;
  color: string;
  features: PlanFeature[];
  active: boolean;
}

export function Plans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      // Intentar cargar planes desde Supabase si la tabla existe
      const { data, error } = await supabase
        .from('plans' as any) // Casting as any since table might not exist in types yet
        .select('*')
        .order('price');

      if (error) {
        console.warn('Error fetching plans (table might not exist yet):', error);
        setPlans([]);
      } else {
        setPlans(data || []);
      }
    } catch (err) {
      console.error('Error fetching plans:', err);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 animate-in fade-in duration-700">
      <CreatePlanModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchPlans}
      />
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/20">
              <Zap className="text-white" size={24} />
            </div>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Planes y Suscripciones
            </h3>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            Configura niveles de servicio, límites y estructuras de precios globales.
          </p>
        </div>
        
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="group relative bg-indigo-600 text-white px-6 py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 hover:shadow-indigo-600/40 transition-all duration-300 active:scale-95 w-full sm:w-auto overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
          <span>Crear Nuevo Plan</span>
        </button>
      </div>

      {/* Grid of Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
        {loading ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4">
            <div className="relative">
              <div className="size-12 border-4 border-indigo-600/20 rounded-full"></div>
              <div className="absolute inset-0 size-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Cargando catálogo...</span>
          </div>
        ) : plans.length === 0 ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center space-y-4 opacity-60">
            <div className="p-6 bg-slate-100 dark:bg-slate-800 rounded-full">
              <Database size={48} className="text-slate-400" />
            </div>
            <div>
              <p className="text-xl font-black text-slate-800 dark:text-white">Sin planes activos</p>
              <p className="text-slate-500">Comienza creando tu primer plan de suscripción.</p>
            </div>
          </div>
        ) : (
          plans.map((plan) => (
            <div key={plan.id} className="group relative bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:shadow-indigo-600/10 transition-all duration-500 flex flex-col overflow-hidden">
              {/* Decorative Header */}
              <div className={`h-3 w-full ${plan.color || 'bg-indigo-600'} opacity-80`} />
              
              <div className="p-8 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-6">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight group-hover:text-indigo-600 transition-colors">
                      {plan.name}
                    </h3>
                    <p className="text-xs font-medium text-slate-400 dark:text-slate-500 leading-relaxed">
                      {plan.description}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    plan.active 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {plan.active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                
                <div className="mb-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800/50 group-hover:scale-[1.02] transition-transform duration-300">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                      ${plan.price}
                    </span>
                    <span className="text-slate-400 text-sm font-black uppercase tracking-widest">
                      / {plan.period === 'monthly' ? 'mes' : 'año'}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 mb-8 flex-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Incluye:</p>
                  {plan.features.map((feature) => (
                    <div key={feature.id} className="flex items-center justify-between group/feat">
                      <div className="flex items-center gap-3">
                        <div className={`p-1 rounded-lg transition-colors ${
                          feature.included 
                            ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400' 
                            : 'bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-600'
                        }`}>
                          {feature.included ? <Check size={14} /> : <X size={14} />}
                        </div>
                        <span className={`text-sm font-bold transition-colors ${
                          feature.included 
                            ? 'text-slate-700 dark:text-slate-200' 
                            : 'text-slate-400 line-through'
                        }`}>
                          {feature.name}
                        </span>
                      </div>
                      {feature.limit && (
                        <span className="text-[10px] font-black bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-2 py-1 rounded-lg text-slate-500 dark:text-slate-400 shadow-sm group-hover/feat:scale-110 transition-transform">
                          {feature.limit}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <button className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-sm font-black hover:opacity-90 transition-all flex items-center justify-center gap-2 group-hover:shadow-lg">
                  <Edit2 size={16} />
                  <span>Gestionar Plan</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
