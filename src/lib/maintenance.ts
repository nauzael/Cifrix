import { cleanOldVaultEntries, getVaultStats } from './userVault';
import { getPendingSyncCount } from './reconnection';
import { toast } from '../store/toastStore';

/**
 * Módulo de Mantenimiento Automático
 * 
 * Ejecuta tareas de limpieza y optimización periódicamente:
 * - Limpieza de entradas antiguas de la bóveda
 * - Monitoreo de datos pendientes
 * - Alertas de sincronización
 */

const MAINTENANCE_INTERVAL = 24 * 60 * 60 * 1000; // 24 horas
const VAULT_MAX_AGE_DAYS = 90; // 90 días sin sincronización
const PENDING_SYNC_WARNING_THRESHOLD = 100; // Alertar si hay más de 100 registros pendientes

let maintenanceInterval: NodeJS.Timeout | null = null;
let lastMaintenanceRun: Date | null = null;

/**
 * Ejecuta la limpieza de la bóveda
 */
async function cleanVault(): Promise<void> {
    try {
        console.log('🧹 Iniciando limpieza de bóveda...');

        const deletedCount = await cleanOldVaultEntries(VAULT_MAX_AGE_DAYS);

        if (deletedCount > 0) {
            console.log(`✅ Limpieza completada: ${deletedCount} entrada(s) antigua(s) eliminada(s)`);
            toast.info(`Se eliminaron ${deletedCount} usuario(s) inactivo(s) de la bóveda local`, 5000);
        } else {
            console.log('✅ No hay entradas antiguas para limpiar');
        }
    } catch (error) {
        console.error('❌ Error durante la limpieza de bóveda:', error);
    }
}

/**
 * Verifica el estado de sincronización y alerta si hay muchos registros pendientes
 */
async function checkSyncStatus(): Promise<void> {
    try {
        const pendingCount = await getPendingSyncCount();

        if (pendingCount >= PENDING_SYNC_WARNING_THRESHOLD) {
            console.warn(`⚠️ Hay ${pendingCount} registros pendientes de sincronización`);

            if (!navigator.onLine) {
                toast.warning(
                    `Tienes ${pendingCount} cambios sin sincronizar. Conéctate a internet para sincronizarlos.`,
                    10000
                );
            }
        }
    } catch (error) {
        console.error('❌ Error verificando estado de sincronización:', error);
    }
}

/**
 * Muestra estadísticas de la bóveda en consola (para debugging)
 */
async function logVaultStats(): Promise<void> {
    try {
        const stats = await getVaultStats();

        if (stats.totalUsers > 0) {
            console.log('📊 Estadísticas de la bóveda:');
            console.log(`   - Total de usuarios: ${stats.totalUsers}`);
            console.log(`   - Última sincronización: ${stats.newestSync}`);
            console.log(`   - Sincronización más antigua: ${stats.oldestSync}`);
        }
    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
    }
}

/**
 * Ejecuta todas las tareas de mantenimiento
 */
async function runMaintenance(): Promise<void> {
    console.log('🔧 Ejecutando mantenimiento automático...');

    lastMaintenanceRun = new Date();

    // Ejecutar tareas en paralelo
    await Promise.all([
        cleanVault(),
        checkSyncStatus(),
        logVaultStats()
    ]);

    console.log('✅ Mantenimiento completado');
}

/**
 * Inicia el servicio de mantenimiento automático
 */
export function startMaintenanceService(): void {
    if (maintenanceInterval) {
        console.log('ℹ️ Servicio de mantenimiento ya está activo');
        return;
    }

    console.log('🚀 Iniciando servicio de mantenimiento automático...');
    console.log(`   - Intervalo: cada ${MAINTENANCE_INTERVAL / (60 * 60 * 1000)} horas`);
    console.log(`   - Edad máxima de bóveda: ${VAULT_MAX_AGE_DAYS} días`);

    // Ejecutar inmediatamente al iniciar
    runMaintenance();

    // Programar ejecuciones periódicas
    maintenanceInterval = setInterval(runMaintenance, MAINTENANCE_INTERVAL);

    console.log('✅ Servicio de mantenimiento iniciado');
}

/**
 * Detiene el servicio de mantenimiento automático
 */
export function stopMaintenanceService(): void {
    if (maintenanceInterval) {
        clearInterval(maintenanceInterval);
        maintenanceInterval = null;
        console.log('⏹️ Servicio de mantenimiento detenido');
    }
}

/**
 * Ejecuta el mantenimiento manualmente (útil para testing)
 */
export async function runManualMaintenance(): Promise<void> {
    console.log('🔧 Ejecutando mantenimiento manual...');
    await runMaintenance();
}

/**
 * Obtiene información sobre el último mantenimiento
 */
export function getMaintenanceInfo(): {
    isActive: boolean;
    lastRun: Date | null;
    nextRun: Date | null;
} {
    const nextRun = lastMaintenanceRun
        ? new Date(lastMaintenanceRun.getTime() + MAINTENANCE_INTERVAL)
        : null;

    return {
        isActive: maintenanceInterval !== null,
        lastRun: lastMaintenanceRun,
        nextRun
    };
}

// Auto-iniciar el servicio cuando se importa este módulo
startMaintenanceService();
