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
  HelpCircle,
  Building2,
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
        name: 'Reportes',
        href: '/reports',
        icon: BarChart3,
        id: 'reports'
      },
      {
        name: 'Ayuda',
        href: '/support',
        icon: HelpCircle,
        id: 'support'
      },
      {
        name: 'Configuración',
        href: '/settings',
        icon: Settings,
        id: 'settings'
      },
    ];

  const filteredNavigation = navigation.filter(item => {
    // 1. Existing hidden check
    if (item.hidden) return false;

    // 2. Organization Settings Check
    const orgModules = (organization?.settings as any)?.modules;
    if (orgModules && orgModules[item.id] === false) return false;

    // 3. User Permissions Check
    // Super Admin bypasses permission checks
    if (profile?.role === 'SUPER_ADMIN') return true;

    const userModules = profile?.allowedModules;
    if (userModules && userModules[item.id] === false) return false;

    return true;
  });

  const formatRole = (role: string) => {
    const map: Record<string, string> = {
      'SUPER_ADMIN': 'Superadmin',
      'ADMIN': 'Admin',
      'ACCOUNTANT': 'Contador',
      'TREASURER': 'Tesorero',
      'AUDITOR': 'Auditor',
      'BASIC': 'Support'
    };
    return map[role] || role;
  };

  return (
    <aside className={cn(
      "w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col fixed h-full z-50 transition-transform duration-300 ease-in-out md:translate-x-0 shadow-xl shadow-slate-200/50 dark:shadow-none",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="p-6 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
              <LayoutDashboard className="size-6" />
            </div>
            <div>
              <h1 className="font-black text-xl tracking-tighter text-slate-900 dark:text-white leading-none">Cifrix</h1>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">v1.2.0 PRO</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="md:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Org Info Widget */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm text-slate-400">
              {orgType === 'IGLESIA' ? <Church className="size-5" /> : <Building2 className="size-5" />}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Organización</p>
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate uppercase">{organization?.name || 'Cargando...'}</p>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
        <p className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 mt-2">Menú Principal</p>
        {filteredNavigation.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={() => window.innerWidth < 768 && onClose()}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn(
                    "size-5 transition-transform duration-200 group-hover:scale-110",
                    isActive ? "drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" : ""
                  )} />
                  <span className="text-sm font-bold">{item.name}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 mt-auto">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-900 dark:to-slate-950 p-4 rounded-2xl shadow-lg relative overflow-hidden group border border-slate-700/50">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-600/10 -mr-8 -mt-8 rounded-full blur-2xl group-hover:bg-blue-600/20 transition-colors"></div>

          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="size-10 rounded-xl bg-slate-700/50 flex items-center justify-center border border-slate-600/50 shadow-inner">
              <Users className="size-5 text-slate-300" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <p className="text-sm font-black truncate text-white">
                {profile?.full_name?.split(' ')[0] || 'Usuario'}
              </p>
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                {profile?.role ? formatRole(profile.role) : 'Admin'}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 py-2.5 rounded-xl transition-all text-xs font-black text-slate-200 hover:text-white border border-white/10 relative z-10 active:scale-95"
          >
            <LogOut className="size-4" />
            CERRAR SESIÓN
          </button>
        </div>
      </div>
    </aside>
  );
}
