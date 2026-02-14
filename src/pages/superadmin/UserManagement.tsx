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
  Trash2,
  Globe,
  ShieldCheck
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from '../../store/toastStore';
import { confirm } from '../../store/confirmStore';

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
        toast.error('Error cargando perfiles: ' + profilesError.message);
        setUsers([]);
        return;
      }

      if (!allProfiles || allProfiles.length === 0) {
        setUsers([]);
        return;
      }

      // PASO 2: Obtener datos de organizaciones
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

      const userOrgsMap = new Map<string, any[]>();
      (userOrgsData || []).forEach(uo => {
        if (!userOrgsMap.has(uo.user_id)) {
          userOrgsMap.set(uo.user_id, []);
        }
        userOrgsMap.get(uo.user_id)!.push(uo);
      });

      const mappedUsers: User[] = allProfiles.map(profile => {
        const userOrgs = userOrgsMap.get(profile.id) || [];
        const primaryOrg = userOrgs.find(o => o.is_primary) || userOrgs[0];

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

  const mapOrgType = (type: string) => {
    if (type === 'IGLESIA') return 'Church';
    if (type === 'EMPRESA') return 'Store';
    return 'Global';
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsEditModalOpen(true);
  };

  const handleResetPassword = async (user: User) => {
    confirm({
      title: 'Restablecer Contraseña',
      message: 'Ingrese el correo electrónico del usuario para enviar el enlace de restablecimiento:',
      inputType: 'email',
      inputPlaceholder: 'usuario@correo.com',
      defaultValue: user.email !== 'Email privado' && user.email !== 'Sin asignar' ? user.email : '',
      confirmText: 'Enviar Enlace',
      type: 'info',
      onConfirm: async (email) => {
        if (!email) return;
        try {
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
          });
          if (error) throw error;
          toast.success(`Correo de restablecimiento enviado a ${email}`);
        } catch (error: any) {
          toast.error('Error: ' + error.message);
        }
      }
    });
  };

  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';

    confirm({
      title: `${newStatus === 'active' ? 'Activar' : 'Desactivar'} Usuario`,
      message: `¿Estás seguro de que deseas ${newStatus === 'active' ? 'activar' : 'desactivar'} a ${user.name}?`,
      confirmText: newStatus === 'active' ? 'Activar' : 'Desactivar',
      type: 'warning',
      onConfirm: async () => {
        try {
          const { error } = await (supabase.from('user_organizations') as any).update({ status: newStatus }).eq('user_id', user.id);
          if (error) throw error;
          fetchUsers();
          toast.success(`Usuario ${newStatus === 'active' ? 'activado' : 'desactivado'} correctamente.`);
        } catch (error: any) {
          toast.error('Error al actualizar estado: ' + error.message);
        }
      }
    });
  };

  const handleDeleteUser = async (user: User) => {
    confirm({
      title: 'Eliminar Usuario',
      message: `ADVERTENCIA: ¿Estás seguro de que deseas ELIMINAR PERMANENTEMENTE a ${user.name}? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar Permanentemente',
      type: 'danger',
      onConfirm: async () => {
        try {
          const { error: rpcError } = await (supabase as any).rpc('delete_user_complete', { target_user_id: user.id });
          if (rpcError) {
            await supabase.from('user_organizations' as any).delete().eq('user_id', user.id);
            await supabase.from('user_invites' as any).delete().eq('user_id', user.id);
            toast.info('Usuario eliminado de la organización.');
          } else {
            toast.success('Usuario eliminado permanentemente del sistema.');
          }
          fetchUsers();
        } catch (error: any) {
          toast.error('Error al eliminar usuario: ' + error.message);
        }
      }
    });
  };

  const handleCancelInvite = async (id: string) => {
    confirm({
      title: 'Cancelar Invitación',
      message: '¿Estás seguro de que deseas cancelar esta invitación?',
      confirmText: 'Cancelar Invitación',
      type: 'warning',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('user_invites' as any).delete().eq('id', id);
          if (error) throw error;
          fetchUsers();
          toast.success('Invitación cancelada correctamente.');
        } catch (error: any) {
          toast.error('Error al cancelar la invitación: ' + error.message);
        }
      }
    });
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

  const getRoleBadgeStyles = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'AUDITOR':
      case 'ACCOUNTANT':
      case 'TREASURER': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'BASIC': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'SIN_ROL': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
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
      default: return <Building2 size={16} className="text-slate-400" />;
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' ||
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesOrg = orgFilter === 'Todas las Organizaciones' || user.organization === orgFilter;
    const matchesRole = roleFilter === 'Todos los Roles' || formatRole(user.role) === roleFilter || user.role === roleFilter;
    return matchesSearch && matchesOrg && matchesRole;
  });

  return (
    <div className="max-w-[1400px] mx-auto p-4 sm:p-5 pb-20 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold uppercase tracking-wide">
            <Globe className="size-3" /> Panel de Control Maestro
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Usuarios Globales</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Administración centralizada y control de accesos global.</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <UserPlus className="size-4" /> Nuevo Usuario Global
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Usuarios', value: users.length, icon: Globe, color: 'blue' },
          { label: 'Activos', value: users.filter(u => u.status === 'active').length, icon: UserCheck, color: 'green' },
          { label: 'Inactivos', value: users.filter(u => u.status === 'inactive').length, icon: UserX, color: 'indigo' },
          { label: 'Superadmins', value: users.filter(u => u.role === 'SUPER_ADMIN').length, icon: ShieldCheck, color: 'amber' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
            <div className={`p-2 bg-${stat.color}-100 dark:bg-${stat.color}-900/30 text-${stat.color}-600 dark:text-${stat.color}-400 rounded-lg w-fit mb-2`}>
              <stat.icon className="size-4" />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-none rounded-xl text-xs font-medium text-slate-900 dark:text-white transition-all placeholder:text-slate-400"
              placeholder="Buscar por nombre, correo electrónico o ID..."
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <select
              className="pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-800/50 border-none rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 appearance-none cursor-pointer"
              value={orgFilter}
              onChange={(e) => setOrgFilter(e.target.value)}
            >
              <option>Todas las Organizaciones</option>
              {[...new Set(users.map(u => u.organization))].filter(Boolean).map(org => (
                <option key={org} value={org}>{org}</option>
              ))}
            </select>
            <select
              className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-none rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 appearance-none cursor-pointer"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option>Todos los Roles</option>
              <option value="ADMIN">Administrador</option>
              <option value="ACCOUNTANT">Contador</option>
              <option value="TREASURER">Tesorero</option>
              <option value="AUDITOR">Auditor</option>
              <option value="BASIC">Soporte</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800">
          <h4 className="font-bold text-base text-slate-900 dark:text-white">Directorio de Usuarios</h4>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Ecosistema global de usuarios</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wide">
              <tr>
                <th className="px-5 py-2.5">Usuario</th>
                <th className="px-5 py-2.5">Rol</th>
                <th className="px-5 py-2.5">Organización</th>
                <th className="px-5 py-2.5">Estado</th>
                <th className="px-5 py-2.5 text-right">Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr><td colSpan={5} className="px-8 py-20 text-center text-sm font-bold text-slate-400 uppercase tracking-widest">Sincronizando...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={5} className="px-8 py-20 text-center text-sm font-bold text-slate-500">No se encontraron resultados</td></tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all group">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`size-9 rounded-xl flex items-center justify-center font-black text-xs ${user.role === 'SUPER_ADMIN' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                          {user.initials}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <p className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">{user.name}</p>
                          <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${getRoleBadgeStyles(user.role)}`}>
                        {formatRole(user.role)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs font-bold text-slate-600 dark:text-slate-400">
                      {user.organization}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wide border ${user.status === 'active' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 border-green-100' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-100'}`}>
                        {user.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEditUser(user)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all" title="Editar"><Edit size={16} /></button>
                        <button onClick={() => handleResetPassword(user)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl transition-all" title="Reset"><Lock size={16} /></button>
                        <button onClick={() => handleToggleStatus(user)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all" title="Eliminar"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateUserModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSuccess={fetchUsers} />
      <EditUserModal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setEditingUser(null); }} onSuccess={fetchUsers} user={editingUser} />
    </div>
  );
}
