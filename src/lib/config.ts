/**
 * Configuración Global de Cifrix
 * 
 * MODO DE OPERACIÓN:
 * - 'production': Todas las operaciones se realizan directamente en Supabase (requiere conexión)
 * - 'hybrid': Escrituras en Supabase, lecturas desde caché local (recomendado)
 * - 'offline': Modo offline-first con sincronización posterior (legacy)
 */

export const APP_CONFIG = {
    /**
     * Modo de operación de la base de datos
     * 
     * 'production' = Todo en tiempo real con Supabase
     * 'hybrid' = Escrituras en Supabase + Caché local para lecturas
     * 'offline' = Modo offline-first (legacy)
     */
    DB_MODE: 'offline' as 'production' | 'hybrid' | 'offline',

    /**
     * Si está habilitado, se usará la base de datos local (Dexie) como caché
     * Solo aplica en modo 'hybrid'
     */
    USE_LOCAL_CACHE: true,

    /**
     * Sincronización automática en segundo plano
     * Solo aplica en modo 'offline'
     */
    AUTO_SYNC_ENABLED: true,

    /**
     * Intervalo de sincronización en milisegundos
     */
    SYNC_INTERVAL_MS: 3 * 60 * 1000, // 3 minutos (Punto óptimo entre frescura y rendimiento)

    /**
     * Habilitar logs de depuración para operaciones de BD
     */
    DEBUG_DB_OPERATIONS: true,

    /**
     * Tiempo máximo de espera para operaciones de BD (ms)
     */
    DB_TIMEOUT_MS: 10000,
} as const;

/**
 * Verifica si el modo actual requiere conexión a internet
 */
export function requiresOnlineConnection(): boolean {
    return APP_CONFIG.DB_MODE === 'production';
}

/**
 * Verifica si se debe usar la caché local
 */
export function shouldUseLocalCache(): boolean {
    return APP_CONFIG.DB_MODE === 'hybrid' && APP_CONFIG.USE_LOCAL_CACHE;
}

/**
 * Log de operaciones de BD (solo si DEBUG está habilitado)
 */
export function dbLog(operation: string, details?: any) {
    if (APP_CONFIG.DEBUG_DB_OPERATIONS) {
        console.log(`[DB:${APP_CONFIG.DB_MODE}] ${operation}`, details || '');
    }
}
