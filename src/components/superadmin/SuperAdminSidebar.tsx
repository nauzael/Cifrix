import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Network,
  Globe,
  Settings,
  LogOut,
  ShieldCheck,
  CreditCard,
  Receipt,
  Megaphone,
  BarChart3,
  MessageSquare
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export function SuperAdminSidebar() {
  const { signOut } = useAuthStore();

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col fixed h-full z-20">
      <div className="p-6 flex items-center gap-3">
        <div className="size-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
          <ShieldCheck className="size-5" />
        </div>
        <div>
          <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white leading-none">SuperAdmin</h1>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-0.5">Dashboard</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        <NavLink
          to="/super-admin"
          end
          className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${isActive ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        >
          <Network className="size-5" />
          <span className="text-sm font-bold">Gestión de Instancias</span>
        </NavLink>

        <NavLink
          to="/super-admin/users"
          className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${isActive ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        >
          <Globe className="size-5" />
          <span className="text-sm font-bold">Usuarios Globales</span>
        </NavLink>

        <div className="pt-3 pb-1">
          <p className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Operaciones</p>
        </div>



        <NavLink
          to="/super-admin/billing"
          className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${isActive ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        >
          <Receipt className="size-5" />
          <span className="text-sm font-bold">Facturación</span>
        </NavLink>

        <NavLink
          to="/super-admin/communications"
          className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${isActive ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        >
          <Megaphone className="size-5" />
          <span className="text-sm font-bold">Comunicaciones</span>
        </NavLink>

        <div className="pt-3 pb-1">
          <p className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Análisis</p>
        </div>

        <NavLink
          to="/super-admin/reports"
          className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${isActive ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        >
          <BarChart3 className="size-5" />
          <span className="text-sm font-bold">Reportes</span>
        </NavLink>

        <NavLink
          to="/super-admin/support"
          className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${isActive ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        >
          <MessageSquare className="size-5" />
          <span className="text-sm font-bold">Soporte</span>
        </NavLink>

        <div className="pt-3 pb-1">
          <p className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sistema</p>
        </div>

        <NavLink
          to="/super-admin/settings"
          className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${isActive ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        >
          <Settings className="size-5" />
          <span className="text-sm font-bold">Configuración</span>
        </NavLink>
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 mb-3 p-2">
          <div className="size-10 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
            <ShieldCheck className="size-5 text-slate-500" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <p className="text-sm font-black truncate text-slate-900 dark:text-white">Super Admin</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Master Access</p>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 py-2.5 rounded-xl transition-colors text-xs font-black text-slate-600 dark:text-slate-300"
        >
          <LogOut className="size-4" />
          CERRAR SESIÓN
        </button>
      </div>
    </aside>
  );
}
