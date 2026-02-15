import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { getPendingSyncCount } from '../lib/reconnection';
import { useAuthStore } from '../store/authStore';

/**
 * Indicador Global de Estado de Conexión
 * 
 * Muestra un banner persistente cuando la aplicación está en modo offline
 * e indica cuántos registros están pendientes de sincronización.
 */
export const OfflineIndicator: React.FC = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingCount, setPendingCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const user = useAuthStore(state => state.user);

    // Detectar cambios en la conexión
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setIsSyncing(true);
            // Después de 3 segundos, asumir que terminó la sincronización
            setTimeout(() => setIsSyncing(false), 3000);
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Contar registros pendientes de sincronización
    useEffect(() => {
        const countPendingRecords = async () => {
            try {
                const total = await getPendingSyncCount();
                setPendingCount(total);
            } catch (error) {
                console.error('Error contando registros pendientes:', error);
            }
        };

        // Contar al montar y cada 10 segundos
        countPendingRecords();
        const interval = setInterval(countPendingRecords, 10000);

        return () => clearInterval(interval);
    }, []);

    // Verificar si el usuario está en modo offline
    const isOfflineUser = (user as any)?.isOffline === true;

    // No mostrar nada si está online y no hay registros pendientes
    if (isOnline && !isOfflineUser && pendingCount === 0) {
        return null;
    }

    // Mostrar banner compacto si está online pero hay registros pendientes
    if (isOnline && pendingCount > 0) {
        return (
            <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
                            <Cloud className="h-4 w-4 flex-shrink-0" />
                            <span>
                                Sincronizando <span className="font-bold">{pendingCount}</span> registro{pendingCount !== 1 ? 's' : ''}...
                            </span>
                        </div>
                        {isSyncing && (
                            <RefreshCw className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin" />
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Mostrar banner prominente si está offline
    return (
        <div className="bg-orange-50 dark:bg-orange-900/20 border-b border-orange-200 dark:border-orange-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                            <WifiOff className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-orange-800 dark:text-orange-200">
                                Trabajando sin conexión
                            </p>
                            <p className="text-xs text-orange-700 dark:text-orange-300 mt-0.5">
                                {pendingCount > 0 ? (
                                    <>
                                        <span className="font-semibold">{pendingCount}</span> registro{pendingCount !== 1 ? 's' : ''} pendiente{pendingCount !== 1 ? 's' : ''} de sincronización
                                    </>
                                ) : (
                                    'Los cambios se sincronizarán automáticamente cuando vuelva la conexión'
                                )}
                            </p>
                        </div>
                    </div>

                    {isOfflineUser && (
                        <div className="flex items-center gap-2 text-xs text-orange-700 dark:text-orange-300">
                            <CloudOff className="h-4 w-4" />
                            <span className="font-medium">Sesión Offline</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
