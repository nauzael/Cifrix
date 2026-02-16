import { supabase } from './supabase';
import { useAuthStore } from '../store/authStore';
import { saveUserToVault } from './userVault';
import { syncToSupabase } from './sync';
import { toast } from '../store/toastStore';

/**
 * Módulo de Reconexión y Sincronización Automática
 * 
 * Maneja la transición de modo offline a online, incluyendo:
 * - Restauración de sesión real de Supabase
 * - Sincronización de datos pendientes
 * - Actualización de la bóveda local
 * - Notificaciones al usuario
 */

let isReconnecting = false;
let reconnectionAttempts = 0;
const MAX_RECONNECTION_ATTEMPTS = 3;

/**
 * Intenta restaurar una sesión real de Supabase cuando vuelve la conexión
 * 
 * Si el usuario estaba usando un "Usuario Virtual" (offline), intenta
 * convertirlo en una sesión real recuperando el token guardado.
 */
async function restoreSupabaseSession(): Promise<boolean> {
    const currentUser = useAuthStore.getState().user;
    const isOffline = useAuthStore.getState().isOfflineMode();

    if (!isOffline) {
        console.log('✅ Usuario ya tiene sesión online activa');
        return true;
    }

    try {
        console.log('🔄 Intentando restaurar sesión de Supabase...');

        // Intentar obtener sesión guardada
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
            console.warn('⚠️ No se pudo obtener sesión guardada:', error);
            return false;
        }

        if (session?.user) {
            // Tenemos una sesión válida, actualizar el store
            console.log('✅ Sesión de Supabase restaurada');

            // Actualizar usuario en el store (quitando la bandera isOffline)
            useAuthStore.getState().setUser(session.user);

            // Refrescar el perfil desde Supabase
            await useAuthStore.getState().refreshProfile();

            return true;
        } else {
            console.warn('⚠️ No hay sesión guardada. El usuario debe re-loguearse online para operaciones que requieran autenticación en la nube.');
            return false;
        }
    } catch (error) {
        console.error('❌ Error restaurando sesión:', error);
        return false;
    }
}

/**
 * Actualiza la bóveda local con los datos más recientes del perfil
 * 
 * Esto asegura que los cambios de permisos/roles se reflejen en
 * futuros logins offline.
 */
async function refreshUserVault(): Promise<void> {
    const user = useAuthStore.getState().user;
    const profile = useAuthStore.getState().profile;

    if (!user || !profile) {
        console.log('ℹ️ No hay usuario/perfil para actualizar en la bóveda');
        return;
    }

    // No podemos actualizar la bóveda sin la contraseña
    // La bóveda se actualizará en el próximo login online exitoso
    console.log('ℹ️ La bóveda se actualizará en el próximo login online');
}

/**
 * Ejecuta el proceso completo de reconexión
 * 
 * Este proceso se ejecuta automáticamente cuando se detecta
 * que vuelve la conexión a internet.
 */
export async function handleReconnection(): Promise<void> {
    // Evitar múltiples reconexiones simultáneas
    if (isReconnecting) {
        console.log('⏳ Reconexión ya en progreso...');
        return;
    }

    // Limitar intentos de reconexión
    if (reconnectionAttempts >= MAX_RECONNECTION_ATTEMPTS) {
        console.warn('⚠️ Máximo de intentos de reconexión alcanzado');
        toast.warning('No se pudo reconectar automáticamente. Por favor, recargue la página.');
        return;
    }

    isReconnecting = true;
    reconnectionAttempts++;

    try {
        console.log('🌐 Conexión a internet detectada. Iniciando reconexión...');

        // Notificar al usuario
        toast.info('Conexión restablecida. Sincronizando datos...', 3000);

        // 1. Intentar restaurar sesión real de Supabase
        const sessionRestored = await restoreSupabaseSession();

        if (sessionRestored) {
            console.log('✅ Sesión restaurada exitosamente');
        } else {
            console.log('ℹ️ Continuando con sesión offline (se requiere re-login para operaciones en la nube)');
        }

        // 2. Sincronizar datos pendientes
        const profile = useAuthStore.getState().profile;
        const organizationId = profile?.organizationId || undefined;

        try {
            await syncToSupabase(organizationId);
            console.log('✅ Sincronización completada');
        } catch (syncError) {
            console.error('❌ Error durante la sincronización:', syncError);
            toast.error('Error al sincronizar algunos datos. Se reintentará automáticamente.');
            throw syncError;
        }

        // 3. Actualizar bóveda (si es posible)
        await refreshUserVault();

        // 4. Notificar éxito
        toast.success('Sincronización completada exitosamente', 3000);

        // Resetear contador de intentos en caso de éxito
        reconnectionAttempts = 0;

    } catch (error) {
        console.error('❌ Error durante la reconexión:', error);

        // No mostrar toast de error si ya mostramos uno específico
        if (!(error instanceof Error && error.message.includes('sincronizar'))) {
            toast.error('Error al reconectar. Se reintentará automáticamente.');
        }
    } finally {
        isReconnecting = false;
    }
}

/**
 * Resetea el contador de intentos de reconexión
 * 
 * Útil para llamar después de un login manual exitoso
 */
export function resetReconnectionAttempts(): void {
    reconnectionAttempts = 0;
    isReconnecting = false;
}

import { TABLES_TO_SYNC } from './sync';

/**
 * Verifica si hay datos pendientes de sincronización
 * 
 * @returns Número de registros pendientes
 */
export async function getPendingSyncCount(): Promise<number> {
    const { db } = await import('./db');

    let total = 0;

    const tables = TABLES_TO_SYNC;

    for (const tableName of tables) {
        try {
            const count = await (db as any)[tableName]
                .where('sync_status')
                .equals('pendiente')
                .count();

            if (count > 0) {
                console.warn(`[Sync Debug] Stalled table detected: ${tableName} (${count} items)`);
                total += count;
            }
        } catch (error) {
            console.error(`Error contando pendientes en ${tableName}:`, error);
        }
    }

    // Contar eliminaciones pendientes
    try {
        const deletedCount = await db.deleted_records
            .where('sync_status')
            .equals('pendiente')
            .count();
        if (deletedCount > 0) {
            console.log(`[Sync Debug] Table 'deleted_records' has ${deletedCount} pending records`);
            const pendingDeletes = await db.deleted_records.where('sync_status').equals('pendiente').toArray();
            console.log('[Sync Debug] Pending deletions:', pendingDeletes);
        }
        total += deletedCount;
    } catch (error) {
        console.error('Error contando eliminaciones pendientes:', error);
    }

    return total;
}

// Registrar listener global de reconexión
let reconnectionListenerRegistered = false;

export function registerReconnectionListener(): void {
    if (reconnectionListenerRegistered) {
        console.log('ℹ️ Listener de reconexión ya registrado');
        return;
    }

    window.addEventListener('online', () => {
        console.log('🌐 Evento "online" detectado');

        // Esperar un momento para asegurar que la conexión es estable
        setTimeout(() => {
            handleReconnection();
        }, 1000);
    });

    reconnectionListenerRegistered = true;
    console.log('✅ Listener de reconexión registrado');
}

// Auto-registrar el listener cuando se importa este módulo
registerReconnectionListener();
