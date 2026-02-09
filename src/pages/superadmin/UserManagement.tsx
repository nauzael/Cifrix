import React, { useEffect, useState } from 'react';
import { CreateUserModal } from '../../components/superadmin/CreateUserModal';
import { EditUserModal } from '../../components/superadmin/EditUserModal';
import {
  UserPlus,
  Search,
  Filter,
  Edit,
  Lock,
  UserX,
  UserCheck,
  Building2,
  Church,
  HelpCircle,
  Store,
  Trash2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface User {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: string;
  organization: string;
  organizationId: string | null;
  orgType: string;
  lastLogin: string;
  status: 'active' | 'inactive';
  type: 'user' | 'invite';
  allowedModules?: Record<string, boolean>;
}

export function UserManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [orgFilter, setOrgFilter] = useState('Todas las Organizaciones');
  const [roleFilter, setRoleFilter] = useState('Todos los Roles');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);

      // PASO 1: Obtener TODOS los usuarios desde profiles
      const { data: allProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        // Evitar crash por error de red o permisos
        alert('Error cargando perfiles: ' + profilesError.message);
        setUsers([]);
        return;
      }

      if (!allProfiles || allProfiles.length === 0) {
        console.warn('No profiles found');
        setUsers([]);
        return;
      }

      // PASO 2: Obtener datos de organizaciones para los usuarios que las tienen
      const { data: userOrgsData, error: userOrgsError } = await supabase
        .from('user_organizations')
        .select(`
          user_id,
          status,
          is_primary,
          module_permissions,
          created_at,
          organization_id,
          roles!inner (
            code,
            name,
            level
          ),
          organizations!inner (
            name,
            type
          )
        `)
        .eq('status', 'active')
        .order('is_primary', { ascending: false });

      if (userOrgsError) {
        console.warn('Error fetching user organizations:', userOrgsError);
      }

      // PASO 3: Crear mapa de organizaciones por user_id
      const userOrgsMap = new Map<string, any[]>();
      (userOrgsData || []).forEach(uo => {
        if (!userOrgsMap.has(uo.user_id)) {
          userOrgsMap.set(uo.user_id, []);
        }
        userOrgsMap.get(uo.user_id)!.push(uo);
      });

      // PASO 4: Mapear todos los usuarios (con o sin organización)
      const mappedUsers: User[] = allProfiles.map(profile => {
        const userOrgs = userOrgsMap.get(profile.id) || [];
        const primaryOrg = userOrgs.find(o => o.is_primary) || userOrgs[0];

        // Si el usuario NO tiene organización
        if (!primaryOrg) {
          return {
            id: profile.id,
            name: profile.full_name || `Usuario ${profile.id.substring(0, 8)}`,
            email: 'Sin asignar',
            initials: (profile.full_name?.[0] || 'U').toUpperCase(),
            role: 'SIN_ROL',
            organization: '⚠️ Sin Organización',
            organizationId: null,
            orgType: 'Unknown',
            lastLogin: new Date(profile.created_at).toLocaleDateString(),
            status: 'inactive',
            type: 'user',
            allowedModules: undefined
          };
        }

        // Si el usuario SÍ tiene organización
        // Convertir module_permissions a allowedModules
        let allowedModules: Record<string, boolean> | undefined;
        if (primaryOrg.module_permissions) {
          allowedModules = {};
          for (const [moduleName, perms] of Object.entries(primaryOrg.module_permissions as Record<string, any>)) {
            if (typeof perms === 'object' && perms !== null) {
              allowedModules[moduleName] = perms.read === true;
            }
          }
        }

        return {
          id: profile.id,
          name: profile.full_name || `Usuario ${profile.id.substring(0, 8)}`,
          email: 'Email privado',
          initials: (profile.full_name?.[0] || 'U').toUpperCase(),
          role: primaryOrg.roles?.code || 'USER',
          organization: userOrgs.length > 1
            ? `${primaryOrg.organizations?.name} (+${userOrgs.length - 1})`
            : (primaryOrg.organizations?.name || 'Sin Organización'),
          organizationId: primaryOrg.organization_id,
          orgType: mapOrgType(primaryOrg.organizations?.type || 'Unknown'),
          lastLogin: new Date(primaryOrg.created_at).toLocaleDateString(),
          status: primaryOrg.status || 'active',
          type: 'user',
          allowedModules
        };
      });

      setUsers(mappedUsers.filter(u => u.role !== 'SUPER_ADMIN'));
    } catch (err) {
      console.error('Error fetching users:', err);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsEditModalOpen(true);
  };

  const handleResetPassword = async (user: User) => {
    const email = prompt("Ingrese el correo electrónico del usuario para enviar el reset:", user.email !== 'Datos privados' ? user.email : '');
    if (!email) return;

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      alert(`Correo de restablecimiento enviado a ${email}`);
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'active' ? 'activar' : 'desactivar';

    if (!window.confirm(`¿Estás seguro de que deseas ${action} a este usuario?`)) return;

    try {
      const { error } = await (supabase
        .from('user_organizations') as any)
        .update({ status: newStatus })
        .eq('user_id', user.id);

      if (error) throw error;
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating status:', error);
      alert('Error al actualizar estado: ' + error.message);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!window.confirm('ADVERTENCIA: ¿Estás seguro de que deseas ELIMINAR PERMANENTEMENTE a este usuario? Esta acción no se puede deshacer.')) return;

    try {
      // 3. Finally delete the user from auth.users (via RPC)
      const { error: rpcError } = await (supabase as any).rpc('delete_user_complete', { target_user_id: user.id });

      if (rpcError) {
        console.warn('RPC delete_user_complete failed, falling back to soft delete:', rpcError);
        // Fallback: Delete from user_organizations and user_invites
        const { error: orgError } = await supabase
          .from('user_organizations' as any)
          .delete()
          .eq('user_id', user.id);

        if (orgError) throw orgError;

        // Also delete from invites if exists
        await supabase
          .from('user_invites' as any)
          .delete()
          .eq('user_id', user.id);

        alert('Usuario eliminado de la organización. (Nota: El registro de autenticación puede permanecer si no se ha configurado la función RPC en la base de datos).');
      } else {
        alert('Usuario eliminado permanentemente del sistema.');
      }

      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      alert('Error al eliminar usuario: ' + error.message);
    }
  };

  const handleCancelInvite = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas cancelar esta invitación?')) return;

    try {
      const { error } = await supabase
        .from('user_invites' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      fetchUsers();
    } catch (error: any) {
      console.error('Error cancelling invite:', error);
      if (error.code === '42501') {
        alert('Error de permisos: Asegúrate de aplicar la política de eliminación en Supabase.');
      } else {
        alert('Error al cancelar la invitación: ' + (error.message || 'Intente nuevamente'));
      }
    }
  };

  const formatRole = (role: string) => {
    const map: Record<string, string> = {
      'SUPER_ADMIN': 'Superadmin',
      'ADMIN': 'Admin',
      'ACCOUNTANT': 'Contador',
      'TREASURER': 'Tesorero',
      'AUDITOR': 'Auditor',
      'BASIC': 'Support',
      'SIN_ROL': '⚠️ Sin Rol'
    };
    return map[role] || role;
  };

  const mapOrgType = (type: string) => {
    if (type === 'IGLESIA') return 'Church';
    if (type === 'EMPRESA') return 'Store';
    return 'Global';
  };


  const getRoleBadgeStyles = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'AUDITOR':
      case 'ACCOUNTANT':
      case 'TREASURER':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'BASIC':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'SIN_ROL':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const getRoleDotColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-blue-500';
      case 'AUDITOR':
      case 'ACCOUNTANT':
      case 'TREASURER': return 'bg-purple-500';
      case 'BASIC': return 'bg-amber-500';
      default: return 'bg-slate-500';
    }
  };

  const getOrgIcon = (type: string) => {
    switch (type) {
      case 'Global': return <Building2 size={16} className="text-slate-400" />;
      case 'Church': return <Church size={16} className="text-slate-400" />;
      case 'Store': return <Store size={16} className="text-slate-400" />;
      case 'Support': return <HelpCircle size={16} className="text-slate-400" />;
      default: return <Building2 size={16} className="text-slate-400" />;
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' ||
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesOrg = orgFilter === 'Todas las Organizaciones' || user.organization === orgFilter;

    // Fix role matching logic to handle both raw codes and display names if needed
    const matchesRole = roleFilter === 'Todos los Roles' ||
      formatRole(user.role) === roleFilter || // Match display name
      user.role === roleFilter; // Match raw code

    return matchesSearch && matchesOrg && matchesRole;
  });

  return (
    <div className="p-4 sm:p-8 space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20">
              <UserPlus className="text-white" size={24} />
            </div>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Directorio de Usuarios
            </h3>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            Administración centralizada y control de accesos global.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="group relative bg-blue-600 text-white px-6 py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-3 shadow-xl shadow-blue-600/20 hover:bg-blue-700 hover:shadow-blue-600/40 transition-all duration-300 active:scale-95 w-full sm:w-auto overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          <UserPlus size={18} className="group-hover:rotate-12 transition-transform" />
          <span>Nuevo Usuario Global</span>
        </button>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Usuarios', value: users.length, color: 'blue' },
          { label: 'Activos', value: users.filter(u => u.status === 'active').length, color: 'green' },
          { label: 'Inactivos', value: users.filter(u => u.status === 'inactive').length, color: 'slate' },
          { label: 'Superadmins', value: users.filter(u => u.role === 'SUPER_ADMIN').length, color: 'purple' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <p className={`text-2xl font-black text-slate-900 dark:text-white`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters Section */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
            <input
              className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-blue-600/20 rounded-2xl text-sm font-medium outline-none text-slate-900 dark:text-white transition-all placeholder:text-slate-400"
              placeholder="Buscar por nombre, correo electrónico o ID..."
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 sm:flex-none sm:min-w-[220px]">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <select
                className="w-full pl-10 pr-10 py-4 bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 appearance-none cursor-pointer focus:ring-2 focus:ring-blue-600/20 transition-all"
                value={orgFilter}
                onChange={(e) => setOrgFilter(e.target.value)}
              >
                <option>Todas las Organizaciones</option>
                {[...new Set(users.map(u => u.organization))].filter(Boolean).map(org => (
                  <option key={org} value={org}>{org}</option>
                ))}
              </select>
            </div>

            <div className="relative flex-1 sm:flex-none sm:min-w-[180px]">
              <select
                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 appearance-none cursor-pointer focus:ring-2 focus:ring-blue-600/20 transition-all"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option>Todos los Roles</option>
                <option value="SUPER_ADMIN">Superadmin</option>
                <option value="ADMIN">Administrador</option>
                <option value="ACCOUNTANT">Contador</option>
                <option value="TREASURER">Tesorero</option>
                <option value="AUDITOR">Auditor</option>
                <option value="BASIC">Soporte</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Usuario</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Rol & Permisos</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Organización</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Estado</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative">
                        <div className="size-12 border-4 border-blue-600/20 rounded-full"></div>
                        <div className="absolute inset-0 size-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                      <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Sincronizando Directorio...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-50">
                      <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full">
                        <Search size={32} className="text-slate-400" />
                      </div>
                      <span className="text-sm font-bold text-slate-500">No se encontraron resultados para tu búsqueda</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all duration-300 group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className={`relative size-12 rounded-2xl flex items-center justify-center font-black text-sm transition-all shadow-sm overflow-hidden group-hover:scale-105 duration-300 ${user.role === 'SUPER_ADMIN'
                          ? 'bg-blue-600 text-white shadow-blue-500/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}>
                          {user.initials}
                          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <p className="text-base font-black text-slate-900 dark:text-slate-100 truncate tracking-tight group-hover:text-blue-600 transition-colors">
                            {user.name}
                          </p>
                          <p className="text-xs font-medium text-slate-400 dark:text-slate-500 truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col gap-1.5">
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider w-fit ${getRoleBadgeStyles(user.role)}`}>
                          <span className={`size-2 rounded-full ${getRoleDotColor(user.role)} animate-pulse`}></span>
                          {formatRole(user.role)}
                        </span>
                        {user.allowedModules && (
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                            {Object.keys(user.allowedModules).length} módulos activos
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3 text-sm font-bold text-slate-600 dark:text-slate-400 group/org">
                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg group-hover/org:bg-blue-50 dark:group-hover/org:bg-blue-900/20 transition-colors">
                          {getOrgIcon(user.orgType)}
                        </div>
                        <span className="truncate max-w-[180px] group-hover/org:text-slate-900 dark:group-hover/org:text-slate-200 transition-colors">
                          {user.organization}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col gap-1">
                        <span className={`px-3 py-1.5 text-[10px] font-black rounded-xl uppercase tracking-widest w-fit shadow-sm ${user.lastLogin === 'Pendiente'
                          ? 'bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30'
                          : user.status === 'active'
                            ? 'bg-green-50 text-green-600 border border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30'
                            : 'bg-slate-50 text-slate-400 border border-slate-100 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700'
                          }`}>
                          {user.lastLogin === 'Pendiente' ? 'Pendiente' : (user.status === 'active' ? 'Activo' : 'Inactivo')}
                        </span>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 ml-1">
                          Ref: {user.lastLogin}
                        </p>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        {user.type === 'invite' ? (
                          <button
                            onClick={() => handleCancelInvite(user.id)}
                            className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all duration-300"
                            title="Cancelar Invitación"
                          >
                            <Trash2 size={18} />
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEditUser(user)}
                              className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-2xl transition-all duration-300"
                              title="Configurar Perfil"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleResetPassword(user)}
                              className="p-3 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-2xl transition-all duration-300"
                              title="Seguridad: Reset"
                            >
                              <Lock size={18} />
                            </button>
                            {user.status === 'active' ? (
                              <button
                                onClick={() => handleToggleStatus(user)}
                                className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all"
                                title="Desactivar"
                              >
                                <UserX size={16} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleStatus(user)}
                                className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-xl transition-all"
                                title="Reactivar"
                              >
                                <UserCheck size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                              title="Eliminar Permanentemente"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchUsers}
      />

      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingUser(null);
        }}
        onSuccess={fetchUsers}
        user={editingUser}
      />
    </div>
  );
}
