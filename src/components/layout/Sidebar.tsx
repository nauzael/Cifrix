import { NavLink, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuthStore } from '@/store/authStore';
import { db } from '@/lib/db';
import {
  LayoutDashboard,
  Users,
  Heart,
  Calculator,
  BarChart3,
  Settings,
  LogOut,
  Church,
  Receipt,
  Building2,
  FileSignature,
  FileDown,
  FileText,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { signOut, profile } = useAuthStore();
  const organization = useLiveQuery(async () => {
    if (profile?.organizationId) {
      const org = await db.organizations.get(profile.organizationId);
      if (org) return org;
    }
    return db.organizations.toArray().then(orgs => orgs[0]);
  }, [profile?.organizationId]);

  const navigate = useNavigate();

  // Determine type from local DB or profile fallback
  const orgType = organization?.type || profile?.organizationType;
  const isCompany = orgType === 'EMPRESA';

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const navigation: Array<{
    name: string;
    href: string;
    icon: typeof LayoutDashboard;
    id: string;
    hidden?: boolean;
  }> = [
      { name: 'Inicio', href: '/', icon: LayoutDashboard, id: 'dashboard' },
      {
        name: 'Miembros',
        href: '/members',
        icon: Users,
        id: 'members',
        hidden: isCompany
      },
      {
        name: 'Diezmos',
        href: '/diezmos',
        icon: Heart,
        id: 'contributions',
        hidden: isCompany
      },
      {
        name: 'Facturación',
        href: '/invoicing',
        icon: Receipt,
        id: 'invoicing'
      },
      {
        name: 'Contabilidad',
        href: '/accounting',
        icon: Calculator,
        id: 'accounting'
      },
      {
        name: 'Impuesto Renta',
        href: '/renta',
        icon: FileSignature,
        id: 'renta'
      },
      {
        name: 'Reportes Exógenos',
        href: '/exogenos',
        icon: FileDown,
        id: 'exogenos'
      },
      {
        name: 'Estados Financieros',
        href: '/financial-statements',
        icon: FileText,
        id: 'financial_statements'
      },
      {
        name: 'Reportes',
        href: '/reports',
        icon: BarChart3,
        id: 'reports'
      },
      {
        name: 'Configuración',
        href: '/settings',
        icon: Settings,
        id: 'settings'
      },
    ];

  const filteredNavigation = navigation.filter(item => {
    // 1. Existing hidden check (used for church vs company logic)
    if (item.hidden) return false;

    // 2. Organization Settings Check (Global switch for the whole org)
    const orgModules = (organization?.settings as any)?.modules;
    if (orgModules && orgModules[item.id] === false) return false;

    // 3. User Permissions Check
    // Super Admin bypasses permission checks
    if (profile?.role === 'SUPER_ADMIN') return true;

    // Dashboard and Settings are core modules always visible to any logged-in user
    if (item.id === 'dashboard' || item.id === 'settings') return true;

    const userModules = profile?.allowedModules;
    // If allowedModules exists, we use it as a strict allow-list
    // If it's missing from the object or set to false, we hide it
    if (userModules && userModules[item.id] !== true) return false;

    return true;
  });

  const formatRole = (role: string) => {
    const map: Record<string, string> = {
      'SUPER_ADMIN': 'Superadmin',
      'ADMIN': 'Admin',
      'ACCOUNTANT': 'Contador',
      'TREASURER': 'Tesorero',
      'AUDITOR': 'Auditor',
      'BASIC': 'Soporte'
    };
    return map[role] || role;
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[40] lg:hidden transition-all duration-300"
          onClick={onClose}
        />
      )}

      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-[50] transition-all duration-300 transform",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                <LayoutDashboard className="text-white size-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Cifrix</span>
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Contabilidad inteligente</span>
              </div>
            </div>
            <button onClick={onClose} className="lg:hidden p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Current Org Widget */}
          <div className="px-5 mb-4">
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex items-center gap-3 group transition-all">
              <div className="size-10 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-center shadow-sm">
                {isCompany ? <Building2 size={20} className="text-blue-600" /> : <Church size={20} className="text-blue-600" />}
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{isCompany ? 'Empresa' : 'Organización'}</span>
                </div>
                <span className="text-[13px] font-black text-slate-900 dark:text-white truncate">
                  {organization?.name || 'Cargando...'}
                </span>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto custom-scrollbar">
            <div className="px-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Menú principal</span>
              </div>
            </div>

            {filteredNavigation.map((item) => (
              <NavLink
                key={item.id}
                to={item.href}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 group relative",
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-[1.02]"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <item.icon className={cn(
                  "size-5 transition-transform duration-200 group-hover:scale-110",
                  "isActive group-hover:rotate-6"
                )} />
                <span className="flex-1">{item.name}</span>
                {/* Active Indicator Bar */}
                <div className={cn(
                  "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-r-full transition-all duration-300",
                  "isActive opacity-100 translate-x-0",
                  "!isActive opacity-0 -translate-x-2"
                )} />
              </NavLink>
            ))}
          </nav>

          {/* User Profile Summary */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800">
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center font-black text-blue-600 text-xs">
                  {profile?.full_name?.substring(0, 2).toUpperCase() || 'US'}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                    {profile?.full_name || 'Usuario'}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {formatRole(profile?.role || 'USER')}
                  </span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-red-600 hover:border-red-100 dark:hover:border-red-900/50 rounded-xl text-xs font-black transition-all hover:shadow-lg hover:shadow-red-500/5"
              >
                <LogOut size={16} />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
