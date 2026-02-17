import { Search, Bell, HelpCircle, LogOut, RefreshCw, Wifi, WifiOff, Menu, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useSync } from '../../hooks/useSync';
import { useState, useEffect } from 'react';
import { testConnection } from '../../lib/supabase';
import { useTheme } from '../../hooks/useTheme';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { signOut, profile } = useAuthStore();
  const navigate = useNavigate();
  const { syncAll, isSyncing } = useSync();
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    const checkConnection = async () => {
      const result = await testConnection();
      setIsConnected(result.success);
    };
    checkConnection();

    // Check every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-10">
      <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
        <button
          onClick={onMenuClick}
          className="touch-target p-2 -ml-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-lg md:hidden transition-colors"
        >
          <Menu className="size-5" />
        </button>
        <div className="relative w-full max-w-[180px] sm:max-w-xs lg:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
          <input
            className="w-full pl-9 pr-4 py-2 lg:py-2.5 bg-muted/50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-muted-foreground"
            placeholder="Buscar..."
            type="text"
          />
        </div>
      </div>
      <div className="flex items-center gap-2 md:gap-3">
        <div
          className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-colors ${isConnected === true ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
            isConnected === false ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-muted text-muted-foreground'
            }`}
          title={isConnected === true ? 'Conectado a Supabase' : isConnected === false ? 'Error de conexión' : 'Verificando...'}
        >
          {isConnected === true ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
          <span className="hidden md:inline">{isConnected === true ? 'Cloud Online' : isConnected === false ? 'Cloud Offline' : 'Verificando'}</span>
        </div>

        <button
          onClick={() => syncAll(profile?.organizationId)}
          disabled={isSyncing}
          className={`touch-target p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-lg transition-all ${isSyncing ? 'animate-spin text-primary' : ''}`}
          title="Sincronizar datos"
        >
          <RefreshCw className="size-5" />
        </button>

        <button
          className="touch-target p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-lg hidden sm:block transition-colors"
          onClick={() => navigate('/support')}
          title="Ayuda y Soporte"
        >
          <HelpCircle className="size-5" />
        </button>

        <button
          onClick={toggleTheme}
          className="touch-target p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors"
          title={isDark ? "Modo Claro" : "Modo Oscuro"}
        >
          {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </button>

        <button
          onClick={handleLogout}
          className="touch-target p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors"
          title="Cerrar sesión"
        >
          <LogOut className="size-5" />
        </button>
      </div>
    </header>
  );
}
