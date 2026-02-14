import { useEffect, useState } from 'react';
import {
  Plus,
  Activity,
  Users,
  Loader2,
  MoreVertical,
  Edit,
  Trash2,
  ExternalLink,
  LayoutDashboard
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Database } from '../../../types/database.types';
import { db } from '../../lib/db';
import { CreateOrganizationModal } from '../../components/superadmin/CreateOrganizationModal';
import { EditOrganizationModal } from '../../components/superadmin/EditOrganizationModal';
import { CreateUserModal } from '../../components/superadmin/CreateUserModal';
import { SystemHealthCheck } from '../../components/SystemHealthCheck';
import { toast } from '../../store/toastStore';
import { confirm } from '../../store/confirmStore';

type Organization = Database['public']['Tables']['organizations']['Row'];

export function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalOrgs: 0,
    activeInstances: 0,
    globalUsers: 0,
    sla: 99.9
  });
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditOrgModalOpen, setIsEditOrgModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId && !(event.target as Element).closest('.action-menu-container') && !(event.target as Element).closest('.action-btn')) {
        setOpenMenuId(null);
        setMenuPosition(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  const handleScroll = () => {
    if (openMenuId) {
      setOpenMenuId(null);
      setMenuPosition(null);
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [openMenuId]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      // Fetch Organizations count (excluding Sistema Cifrix)
      const { count: realOrgCount, data: orgs } = await supabase
        .from('organizations')
        .select('*', { count: 'exact' })
        .neq('name', 'Sistema Cifrix')
        .order('created_at', { ascending: false });

      // Fetch Global Users count (excluding Super Admins)
      const { count: realUserCount } = await supabase
        .from('user_organizations')
        .select('*, roles!inner(*)', { count: 'exact', head: true })
        .neq('roles.code', 'SUPER_ADMIN')
        .eq('status', 'active');

      // Fetch Audit Logs
      const { data: recentLogs } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(15);

      setOrganizations(orgs || []);
      setLogs(recentLogs || []);
      setStats(prev => ({
        ...prev,
        totalOrgs: realOrgCount || 0,
        activeInstances: realOrgCount || 0,
        globalUsers: realUserCount || 0
      }));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditOrg = (org: Organization) => {
    setEditingOrg(org);
    setIsEditOrgModalOpen(true);
    setOpenMenuId(null);
  };

  const handleDeleteOrg = async (org: Organization) => {
    setOpenMenuId(null);
    confirm({
      title: 'Eliminar Organización',
      message: `ADVERTENCIA: ¿Estás seguro de que deseas ELIMINAR PERMANENTEMENTE la organización "${org.name}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar Permanentemente',
      type: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('organizations')
            .delete()
            .eq('id', org.id);

          if (error) throw error;

          toast.success('Organización eliminada correctamente.');
          fetchDashboardData();
        } catch (error: any) {
          console.error('Error deleting organization:', error);
          toast.error('Error al eliminar organización: ' + error.message);
        }
      }
    });
  };

  const handleGoToDashboard = async (org: Organization) => {
    setOpenMenuId(null);

    confirm({
      title: 'Acceder a Organización',
      message: `¿Deseas acceder al dashboard de "${org.name}"? Esto reemplazará temporalmente tus datos locales.`,
      confirmText: 'Acceder ahora',
      type: 'info',
      onConfirm: async () => {
        try {
          setIsLoading(true);

          // 1. Fetch fresh data to ensure we allow entry with LATEST settings
          const { data: freshOrg, error } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', org.id)
            .single();

          if (error || !freshOrg) throw new Error('No se pudo obtener la información actualizada de la organización.');

          await db.clearAllData();

          await db.organizations.add({
            id: freshOrg.id,
            name: freshOrg.name,
            type: freshOrg.type as 'IGLESIA' | 'EMPRESA',
            tax_id: freshOrg.tax_id || '',
            settings: freshOrg.settings,
            created_at: freshOrg.created_at,
            sync_status: 'sincronizado'
          });

          // Force reload to ensure all hooks (useAuthStore, useLiveQuery) reset
          window.location.href = '/';

        } catch (error: any) {
          console.error('Error switching to dashboard:', error);
          toast.error('Error al acceder al dashboard: ' + error.message);
          setIsLoading(false);
        }
      }
    });
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 p-4 sm:p-5 pb-20">
      <CreateOrganizationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchDashboardData}
      />
      <EditOrganizationModal
        isOpen={isEditOrgModalOpen}
        onClose={() => setIsEditOrgModalOpen(false)}
        onSuccess={fetchDashboardData}
        organization={editingOrg}
      />
      <CreateUserModal
        isOpen={isCreateUserModalOpen}
        onClose={() => setIsCreateUserModalOpen(false)}
        onSuccess={fetchDashboardData}
      />

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold uppercase tracking-wide">
            <LayoutDashboard className="size-3" /> Panel de Control Maestro
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Super Admin</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Gestión global de instancias y usuarios de Cifrix.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateUserModalOpen(true)}
            className="flex-1 sm:flex-none px-5 py-2.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-sm border border-slate-200 dark:border-slate-800 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
          >
            <Users className="size-4" /> Nuevo Usuario
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex-1 sm:flex-none px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="size-4" /> Nueva Instancia
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Organizaciones', value: stats.totalOrgs, icon: Plus, color: 'blue', tag: 'Actualizado' },
          { label: 'Instancias Activas', value: stats.activeInstances, icon: Activity, color: 'green', pulse: true },
          { label: 'Usuarios Asignados', value: stats.globalUsers, icon: Users, color: 'indigo' },
          { label: 'SLA Global', value: `${stats.sla}%`, icon: Activity, color: 'amber' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none group hover:scale-[1.02] transition-all duration-300">
            <div className="flex items-start justify-between mb-2">
              <div className={`p-2 bg-${stat.color}-100 dark:bg-${stat.color}-900/30 text-${stat.color}-600 dark:text-${stat.color}-400 rounded-lg`}>
                <stat.icon className="size-5" />
              </div>
              {stat.tag && (
                <span className="text-xs font-bold bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-2.5 py-1 rounded-lg uppercase tracking-wide">{stat.tag}</span>
              )}
              {stat.pulse && (
                <div className="size-2 rounded-full bg-green-500 mt-1"></div>
              )}
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{stat.label}</p>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {/* Main Content - Organization List */}
        <div className="w-full">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-bold text-base text-slate-900 dark:text-white">Gestión de Instancias</h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Organizaciones registradas en el sistema</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wide">
                  <tr>
                    <th className="px-5 py-2.5">Organización</th>
                    <th className="px-5 py-2.5">Estado</th>
                    <th className="px-5 py-2.5">Registro</th>
                    <th className="px-5 py-2.5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="animate-spin text-indigo-600" size={28} />
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Sincronizando datos...</p>
                        </div>
                      </td>
                    </tr>
                  ) : organizations.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-500 font-medium">
                        No hay organizaciones registradas en el sistema.
                      </td>
                    </tr>
                  ) : (
                    organizations.map((org) => (
                      <tr key={org.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="size-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs shadow-sm">
                              {org.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-white">{org.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono">ID: {org.id.substring(0, 8)}...</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-[10px] font-bold rounded-full uppercase tracking-wide border border-green-100 dark:border-green-900/30">
                            <div className="size-1 rounded-full bg-green-500" />
                            Activo
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <p className="text-[10px] font-bold text-slate-500">{new Date(org.created_at).toLocaleDateString()}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">{new Date(org.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </td>
                        <td className="px-5 py-3 text-right relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              setMenuPosition({
                                top: rect.bottom + 8,
                                left: rect.right - 192
                              });
                              setOpenMenuId(openMenuId === org.id ? null : org.id);
                            }}
                            className={`action-btn inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${openMenuId === org.id
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                              }`}
                          >
                            Opciones
                            <MoreVertical size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* System Health Check Widget - Bottom Full Width */}
        <div className="w-full">
          <SystemHealthCheck />
        </div>
      </div>

      {/* Fixed Position Action Menu */}
      {openMenuId && menuPosition && (() => {
        const org = organizations.find(o => o.id === openMenuId);
        if (!org) return null;
        return (
          <div
            className="action-menu-container fixed w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 z-[9999] overflow-hidden"
            style={{ top: menuPosition.top, left: menuPosition.left }}
          >
            <div className="p-2 space-y-1">
              <button
                onClick={() => handleGoToDashboard(org)}
                className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 rounded-xl flex items-center gap-3 transition-colors"
              >
                <div className="size-8 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-lg flex items-center justify-center">
                  <LayoutDashboard size={16} />
                </div>
                Ir al Dashboard
              </button>
              <button
                onClick={() => handleEditOrg(org)}
                className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:text-amber-600 rounded-xl flex items-center gap-3 transition-colors"
              >
                <div className="size-8 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-lg flex items-center justify-center">
                  <Edit size={16} />
                </div>
                Editar Instancia
              </button>
              <div className="h-px bg-slate-100 dark:bg-slate-800 my-1 mx-2"></div>
              <button
                onClick={() => handleDeleteOrg(org)}
                className="w-full text-left px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl flex items-center gap-3 transition-colors"
              >
                <div className="size-8 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg flex items-center justify-center">
                  <Trash2 size={16} />
                </div>
                Eliminar Permanente
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
