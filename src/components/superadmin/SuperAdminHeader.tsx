import { Search, Bell, Moon, Sun } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

export function SuperAdminHeader() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-6 lg:px-8 sticky top-0 z-10">
      <div className="flex items-center gap-4 flex-1">
        <h2 className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest text-xs">Panel de Control Maestro</h2>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        >
          {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </button>
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
          <input
            className="w-48 lg:w-64 pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500/50 outline-none text-slate-900 dark:text-white"
            placeholder="Buscar organización..."
            type="text"
          />
        </div>
        <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg relative transition-colors">
          <Bell className="size-5" />
          <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
        </button>
      </div>
    </header>
  );
}
