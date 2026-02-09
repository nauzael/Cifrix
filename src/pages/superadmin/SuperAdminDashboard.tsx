import { useEffect, useState, useRef } from 'react';
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
    if (!window.confirm(`ADVERTENCIA: ¿Estás seguro de que deseas ELIMINAR PERMANENTEMENTE la organización "${org.name}"? Esta acción no se puede deshacer.`)) return;

    try {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', org.id);

      if (error) throw error;

      alert('Organización eliminada correctamente.');
      fetchDashboardData();
    } catch (error: any) {
      console.error('Error deleting organization:', error);
      alert('Error al eliminar organización: ' + error.message);
    }
  };

  const handleGoToDashboard = async (org: Organization) => {
    setOpenMenuId(null);

    if (!window.confirm(`¿Deseas acceder al dashboard de "${org.name}"? Esto reemplazará temporalmente tus datos locales.`)) return;

    try {
      setIsLoading(true);

      await db.clearAllData();

      await db.organizations.add({
        id: org.id,
        name: org.name,
        type: org.type as 'IGLESIA' | 'EMPRESA',
        tax_id: org.tax_id || '',
        settings: org.settings,
        created_at: org.created_at,
        sync_status: 'sincronizado'
      });

      navigate('/');

    } catch (error) {
      console.error('Error switching to dashboard:', error);
      alert('Error al acceder al dashboard.');
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 p-4 sm:p-8 pb-24">
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
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-wider">
            <LayoutDashboard className="size-3" /> Panel de Control Maestro
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Super Admin</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Gestión global de instancias y usuarios de Cifrix.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateUserModalOpen(true)}
            className="flex-1 sm:flex-none px-5 py-2.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-sm border border-slate-200 dark:border-slate-800 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
          >
            <Users className="size-4" /> Nuevo Usuario
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex-1 sm:flex-none px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="size-4" /> Nueva Instancia
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {[
          { label: 'Total Organizaciones', value: stats.totalOrgs, icon: Plus, color: 'blue', tag: 'Actualizado' },
          { label: 'Instancias Activas', value: stats.activeInstances, icon: Activity, color: 'green', pulse: true },
          { label: 'Usuarios Asignados', value: stats.globalUsers, icon: Users, color: 'indigo' },
          { label: 'SLA Global', value: `${stats.sla}%`, icon: Activity, color: 'amber' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm group hover:shadow-lg transition-all duration-300">
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2.5 bg-${stat.color}-50 dark:bg-${stat.color}-900/20 text-${stat.color}-600 dark:text-${stat.color}-400 rounded-xl group-hover:scale-110 transition-transform`}>
                <stat.icon className="size-5" />
              </div>
              {stat.tag && (
                <span className="text-[10px] font-black bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-2 py-1 rounded-lg uppercase tracking-wider">{stat.tag}</span>
              )}
              {stat.pulse && (
                <div className="size-2 rounded-full bg-green-500 animate-pulse mt-1"></div>
              )}
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Organization List */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-black text-lg text-slate-900 dark:text-white">Organizaciones Registradas</h4>
            </div>
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                  <tr>
                    <th className="px-6 py-4">Organización</th>
                    <th className="px-6 py-4">Estado</th>

                    <th className="px-6 py-4">Registro</th>
                    <th className="px-6 py-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="animate-spin text-indigo-600" size={28} />
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sincronizando datos...</p>
                        </div>
                      </td>
                    </tr>
                  ) : organizations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500 font-medium">
                        No hay organizaciones registradas en el sistema.
                      </td>
                    </tr>
                  ) : (
                    organizations.map((org) => (
                      <tr key={org.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="size-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-sm shadow-sm group-hover:scale-110 transition-transform">
                              {org.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">{org.name}</p>
                              <p className="text-[10px] text-slate-400 font-medium font-mono tracking-tighter">ID: {org.id.substring(0, 12)}...</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-[10px] font-black rounded-full uppercase tracking-wider border border-green-100 dark:border-green-900/30">
                            <div className="size-1.5 rounded-full bg-green-500" />
                            Activo
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <p className="text-xs font-bold text-slate-500">{new Date(org.created_at).toLocaleDateString()}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-black">{new Date(org.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </td>
                        <td className="px-6 py-4 text-right relative">
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
                            className={`action-btn inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black transition-all ${openMenuId === org.id
                              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                              : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                              }`}
                          >
                            Opciones
                            <MoreVertical className="size-3.5" />
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

        {/* Sidebar Widgets */}
        <div className="space-y-8">
          {/* System Monitor */}
          <div className="bg-slate-900 dark:bg-black rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <Activity size={120} className="text-blue-500" />
            </div>
            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-blue-400 font-black uppercase tracking-[0.2em] text-[10px]">Monitor de Actividad</p>
                <div className="size-2 rounded-full bg-blue-500 animate-pulse" />
              </div>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {logs.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <p className="text-slate-500 font-mono text-xs italic">Escaneando logs...</p>
                  </div>
                ) : (
                  logs.map((log, i) => (
                    <div key={log.id} className="group/log border-l-2 border-slate-800 pl-4 py-1 hover:border-blue-500 transition-colors animate-in fade-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${i * 50}ms` }}>
                      <p className="text-slate-400 font-mono text-[10px] mb-1">
                        <span className="text-blue-500 font-bold">[{new Date(log.created_at).toLocaleTimeString()}]</span>
                      </p>
                      <p className="text-slate-200 text-[11px] font-bold tracking-tight">
                        {log.action} <span className="text-slate-500 uppercase text-[9px]">@{log.entity_type}</span>
                      </p>
                    </div>
                  ))
                )}
              </div>
              <button className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-colors">
                Ver historial completo
              </button>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-600/20">
            <h4 className="font-black text-lg mb-4">Ayuda Rápida</h4>
            <p className="text-indigo-100 text-xs font-medium mb-6 leading-relaxed">Como Super Admin, tienes control total sobre el ecosistema. Usa las acciones con precaución.</p>
            <div className="space-y-3">
              <button className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                <ExternalLink size={14} /> Documentación Global
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Position Action Menu */}
      {openMenuId && menuPosition && (() => {
        const org = organizations.find(o => o.id === openMenuId);
        if (!org) return null;
        return (
          <div
            className="action-menu-container fixed w-56 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            style={{ top: menuPosition.top, left: menuPosition.left }}
          >
            <div className="p-3 space-y-1">
              <button
                onClick={() => handleGoToDashboard(org)}
                className="w-full text-left px-4 py-3 text-sm font-black text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 rounded-2xl flex items-center gap-3 transition-all group"
              >
                <div className="size-8 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <LayoutDashboard size={16} />
                </div>
                Ir al Dashboard
              </button>
              <button
                onClick={() => handleEditOrg(org)}
                className="w-full text-left px-4 py-3 text-sm font-black text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:text-amber-600 rounded-2xl flex items-center gap-3 transition-all group"
              >
                <div className="size-8 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Edit size={16} />
                </div>
                Editar Instancia
              </button>
              <div className="h-px bg-slate-100 dark:bg-slate-800 my-2 mx-2"></div>
              <button
                onClick={() => handleDeleteOrg(org)}
                className="w-full text-left px-4 py-3 text-sm font-black text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl flex items-center gap-3 transition-all group"
              >
                <div className="size-8 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
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
