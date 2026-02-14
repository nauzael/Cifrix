import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Building2, Check, Loader2, LogOut, ArrowRight } from 'lucide-react';

export const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, initialize } = useAuthStore();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');

  // New state for creating an organization (if applicable)
  // For now, based on user request "assign to company or organization they belong to",
  // we assume they select from existing list.

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      // Use RPC to bypass RLS restrictions for non-members
      const { data, error } = await (supabase as any).rpc('get_public_organizations');

      if (error) throw error;
      setOrganizations((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinOrganization = async () => {
    if (!selectedOrgId || !user) return;

    setSubmitting(true);
    try {
      // Use RPC to join organization (bypassing RLS)
      const { error } = await (supabase as any).rpc('join_organization', {
        org_id: selectedOrgId,
        user_role: 'BASIC'
      });

      if (error) throw error;

      // Refresh profile
      await initialize();

      // Redirect to dashboard
      navigate('/');

    } catch (error: any) {
      console.error('Error joining organization:', error);
      alert('Error al unirse a la organización: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await useAuthStore.getState().signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="size-16 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
            <Building2 className="size-8 text-blue-600 absolute inset-0 m-auto animate-pulse" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse text-sm">Cargando organizaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto bg-white dark:bg-slate-900 p-5 rounded-[2rem] w-24 h-24 flex items-center justify-center shadow-xl shadow-blue-600/10 border border-slate-100 dark:border-slate-800 mb-8 transform hover:scale-105 transition-transform duration-300">
          <Building2 className="text-blue-600" size={48} />
        </div>
        <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          Bienvenido a <span className="text-blue-600">Cifrix</span>
        </h2>
        <p className="mt-3 text-slate-500 dark:text-slate-400 font-medium max-w-xs mx-auto">
          Para comenzar la experiencia, selecciona la organización a la que perteneces.
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-10 px-6 sm:px-10 shadow-2xl shadow-slate-200/50 dark:shadow-none rounded-[2.5rem] border border-slate-200/60 dark:border-slate-800 backdrop-blur-xl">
          <div className="space-y-8">
            <div className="space-y-2">
              <label htmlFor="org-select" className="block text-sm font-black text-slate-700 dark:text-slate-300 ml-1">
                Organización / Empresa
              </label>
              <div className="relative group">
                <select
                  id="org-select"
                  className="block w-full pl-4 pr-10 py-3.5 text-base border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 dark:focus:border-blue-500 sm:text-sm rounded-2xl transition-all appearance-none font-medium text-slate-900 dark:text-white"
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                >
                  <option value="" className="dark:bg-slate-900">Selecciona una organización...</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id} className="dark:bg-slate-900">
                      {org.name} — {org.type}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <ArrowRight size={18} className="rotate-90" />
                </div>
              </div>
            </div>

            <div className="bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/30 flex gap-4">
              <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900/30 p-2 rounded-xl h-fit">
                <Check className="size-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-blue-900 dark:text-blue-300">Configuración de Acceso</h3>
                <p className="text-xs leading-relaxed text-blue-700/80 dark:text-blue-400/80 font-medium">
                  Al unirte, tendrás acceso instantáneo a los módulos y datos de tu organización según el rol asignado.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleJoinOrganization}
                disabled={!selectedOrgId || submitting}
                className={`w-full flex items-center justify-center py-4 px-6 rounded-2xl shadow-xl transition-all duration-300 font-black text-sm group ${!selectedOrgId || submitting
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 hover:shadow-blue-600/30 hover:-translate-y-0.5 active:scale-95'
                  }`}
              >
                {submitting ? (
                  <Loader2 className="animate-spin size-5 mr-2" />
                ) : (
                  <ArrowRight className="size-5 mr-2 group-hover:translate-x-1 transition-transform" />
                )}
                Ingresar a la Organización
              </button>

              <button
                onClick={handleLogout}
                className="w-full flex justify-center items-center py-4 px-6 rounded-2xl text-sm font-black text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all duration-200 group"
              >
                <LogOut className="size-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
