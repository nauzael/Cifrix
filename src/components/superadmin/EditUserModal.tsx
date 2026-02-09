import React, { useState, useEffect } from 'react';
import { X, Loader2, Shield, Grid, Building2, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../lib/utils';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: {
    id: string;
    email: string;
    role: string;
    organizationId: string | null;
    type: 'user' | 'invite';
    allowedModules?: Record<string, boolean>;
  } | null;
}

const AVAILABLE_MODULES = [
  { id: 'members', label: 'Miembros' },
  { id: 'contributions', label: 'Diezmos' },
  { id: 'invoicing', label: 'Facturación' },
  { id: 'accounting', label: 'Contabilidad' },
  { id: 'reports', label: 'Reportes' },
];

export function EditUserModal({ isOpen, onClose, onSuccess, user }: EditUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    role: 'BASIC',
    organization_id: ''
  });
  const [selectedModules, setSelectedModules] = useState<Record<string, boolean>>({
    members: true,
    contributions: true,
    invoicing: true,
    accounting: true,
    reports: true
  });
  const [organizations, setOrganizations] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchOrganizations();
    }
  }, [isOpen]);

  useEffect(() => {
    if (user) {
      setFormData({
        role: user.role,
        organization_id: user.organizationId || ''
      });
      if (user.allowedModules) {
        setSelectedModules(user.allowedModules);
      } else {
        // Cargar module_permissions desde la BD
        (async () => {
          try {
            const { data, error } = await supabase
              .from('user_organizations')
              .select('module_permissions, organization_id, created_at')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(1);

            if (!error && data && data.length > 0) {
              const modulePerms = data[0].module_permissions as Record<string, any> | null;
              if (modulePerms && typeof modulePerms === 'object') {
                // Convertir de { module: { read: true, write: true } } a { module: true }
                const simplified: Record<string, boolean> = {};
                for (const [moduleName, perms] of Object.entries(modulePerms)) {
                  if (typeof perms === 'object' && perms !== null) {
                    simplified[moduleName] = perms.read === true;
                  }
                }
                setSelectedModules(simplified);
                return;
              }
            }
          } catch { }
          // Fallback: todos habilitados
          setSelectedModules({
            members: true,
            contributions: true,
            invoicing: true,
            accounting: true,
            reports: true
          });
        })();
      }
    }
  }, [user]);

  const fetchOrganizations = async () => {
    const { data } = await supabase.from('organizations').select('id, name');
    const orgs = (data || []) as any[];
    setOrganizations(orgs.filter(o => o.name !== 'Sistema Cifrix'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      if (user.type === 'user') {
        const currentUser = useAuthStore.getState().user;
        const isSelf = currentUser?.id === user.id;

        if (isSelf) {
          if (user.role === 'SUPER_ADMIN' && formData.role !== 'SUPER_ADMIN') {
            throw new Error('SEGURIDAD: No puedes quitarte el rol de Super Admin a ti mismo.');
          }
          if (!formData.organization_id) {
            throw new Error('SEGURIDAD: No puedes dejarte sin organización a ti mismo.');
          }
        }

        // Convertir módulos a formato adecuado para la RPC
        const modulePermissions: Record<string, any> = {};
        for (const [moduleName, isEnabled] of Object.entries(selectedModules)) {
          if (isEnabled) {
            modulePermissions[moduleName] = { read: true, write: true, delete: true };
          }
        }

        // LLAMADA RPC SEGURA Y ATÓMICA
        // Ejecuta toda la lógica de negocio en el servidor
        const { error: rpcError } = await (supabase as any).rpc('admin_update_user_full', {
          target_user_id: user.id,
          new_org_id: formData.organization_id || null, // NULL significa sin organización
          new_role_code: formData.role,
          new_modules: modulePermissions
        });

        if (rpcError) {
          console.error('RPC Error:', rpcError);
          // Si la RPC no existe (error 42883), lanzar error claro
          if (rpcError.code === '42883') {
            throw new Error('La función de actualización segura no está instalada en la base de datos. Por favor ejecute el script RPC_ADMIN_UPDATE_USER_FULL.sql');
          }
          throw rpcError;
        }

      } else {
        // Update user_invites (Legacy)
        const { error } = await (supabase
          .from('user_invites') as any)
          .update({
            role: formData.role,
            organization_id: formData.organization_id || null
          })
          .eq('id', user.id);

        if (error) throw error;
      }

      alert('Usuario actualizado exitosamente y de forma segura.');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating user:', error);
      alert('Error al actualizar usuario: ' + (error.message || error));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20">
              <Shield className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Gestionar Usuario
              </h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Permisos y Roles
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

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cuenta de Usuario</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-none">{user.email}</p>
            </div>
            <div className="px-3 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest">
              {user.type === 'invite' ? 'Invitación' : 'Activo'}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2 group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">
                Asignar Organización
              </label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                <select
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none font-bold appearance-none transition-all"
                  value={formData.organization_id}
                  onChange={e => setFormData({ ...formData, organization_id: e.target.value })}
                >
                  <option value="">Sin organización (Global)</option>
                  {organizations?.map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2 group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">
                Nivel de Acceso (Rol)
              </label>
              <select
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none font-bold appearance-none transition-all"
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="BASIC">Básico / Soporte</option>
                <option value="ACCOUNTANT">Contador</option>
                <option value="AUDITOR">Auditor</option>
                <option value="TREASURER">Tesorero</option>
                <option value="ADMIN">Administrador</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500">
                <Grid size={18} />
              </div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Permisos de Módulos (Solo Organizaciones)
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {AVAILABLE_MODULES?.map(module => (
                <label
                  key={module.id}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer active:scale-95 group",
                    selectedModules[module.id]
                      ? "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300 shadow-sm"
                      : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 opacity-60 hover:opacity-100"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                    selectedModules[module.id]
                      ? "bg-blue-600 border-blue-600"
                      : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 group-hover:border-blue-400"
                  )}>
                    {selectedModules[module.id] && <X size={12} className="text-white rotate-45" />}
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={!!selectedModules[module.id]}
                    onChange={e => setSelectedModules({
                      ...selectedModules,
                      [module.id]: e.target.checked
                    })}
                  />
                  <span className="text-xs font-black uppercase tracking-tight">
                    {module.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex-[2] px-6 py-4 bg-blue-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} className="group-hover:scale-110 transition-transform" />}
              <span>Guardar Cambios</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
