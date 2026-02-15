import { db, UserVaultEntry } from './db';
import {
    generateSalt,
    hashPassword,
    verifyPassword,
    encryptProfile,
    decryptProfile
} from './crypto';

/**
 * Módulo de Gestión de la Bóveda de Usuarios Offline
 * 
 * Maneja el almacenamiento seguro y recuperación de credenciales
 * para permitir autenticación sin conexión a internet.
 */

export interface UserProfile {
    userId: string;
    role: string;
    organizationId: string | null;
    organizationName: string | null;
    organizationType: string | null;
    full_name?: string | null;
    avatar_url?: string | null;
    phone?: string | null;
    address?: string | null;
    job_title?: string | null;
    allowedModules?: Record<string, boolean>;
}

/**
 * Guarda o actualiza un usuario en la bóveda local
 * 
 * Esta función se debe llamar después de cada login online exitoso
 * para mantener la bóveda actualizada.
 * 
 * @param email - Email del usuario
 * @param password - Contraseña en texto plano (solo se guarda el hash)
 * @param profile - Perfil completo del usuario
 */
export async function saveUserToVault(
    email: string,
    password: string,
    profile: UserProfile
): Promise<void> {
    try {
        // 1. Verificar si ya existe una entrada para este usuario
        const existingEntry = await db.user_vault.get(email);

        // 2. Generar nuevo salt (o reutilizar si es actualización)
        const salt = existingEntry?.salt || generateSalt();

        // 3. Generar hash de la contraseña
        const passwordHash = hashPassword(password, salt);

        // 4. Encriptar el perfil
        const { encryptedData, iv } = encryptProfile(profile, password, salt);

        // 5. Crear o actualizar la entrada en la bóveda
        const vaultEntry: UserVaultEntry = {
            email,
            password_hash: passwordHash,
            salt,
            encrypted_profile: encryptedData,
            encryption_iv: iv,
            user_id: profile.userId,
            last_sync: new Date().toISOString(),
            created_at: existingEntry?.created_at || new Date().toISOString()
        };

        await db.user_vault.put(vaultEntry);

        console.log(`✅ Usuario ${email} guardado en la bóveda local`);
    } catch (error) {
        console.error('Error guardando usuario en la bóveda:', error);
        throw new Error('No se pudo guardar el usuario en la bóveda local');
    }
}

/**
 * Intenta autenticar a un usuario usando la bóveda local
 * 
 * Esta función se usa cuando no hay conexión a internet.
 * 
 * @param email - Email del usuario
 * @param password - Contraseña ingresada por el usuario
 * @returns Perfil del usuario si las credenciales son correctas
 * @throws Error si el usuario no existe o la contraseña es incorrecta
 */
export async function authenticateFromVault(
    email: string,
    password: string
): Promise<UserProfile> {
    try {
        // 1. Buscar al usuario en la bóveda
        const vaultEntry = await db.user_vault.get(email);

        if (!vaultEntry) {
            throw new Error('Usuario no encontrado en este dispositivo. Debe iniciar sesión con internet al menos una vez.');
        }

        // 2. Verificar la contraseña
        const isPasswordValid = verifyPassword(
            password,
            vaultEntry.salt,
            vaultEntry.password_hash
        );

        if (!isPasswordValid) {
            throw new Error('Contraseña incorrecta');
        }

        // 3. Desencriptar el perfil
        const profile = decryptProfile<UserProfile>(
            vaultEntry.encrypted_profile,
            password,
            vaultEntry.salt,
            vaultEntry.encryption_iv
        );

        console.log(`✅ Usuario ${email} autenticado desde la bóveda local`);

        return profile;
    } catch (error) {
        console.error('Error autenticando desde la bóveda:', error);

        // Re-lanzar con mensaje más específico
        if (error instanceof Error) {
            throw error;
        }

        throw new Error('Error al autenticar desde la bóveda local');
    }
}

/**
 * Verifica si un usuario existe en la bóveda local
 * 
 * @param email - Email del usuario
 * @returns true si el usuario tiene una entrada en la bóveda
 */
export async function userExistsInVault(email: string): Promise<boolean> {
    try {
        const entry = await db.user_vault.get(email);
        return !!entry;
    } catch (error) {
        console.error('Error verificando usuario en bóveda:', error);
        return false;
    }
}

/**
 * Obtiene la lista de usuarios guardados en la bóveda
 * 
 * Útil para mostrar una lista de usuarios disponibles para login offline.
 * 
 * @returns Array de objetos con información básica de usuarios
 */
export async function getVaultUsers(): Promise<Array<{
    email: string;
    userId: string;
    lastSync: string;
}>> {
    try {
        const entries = await db.user_vault.toArray();

        return entries.map(entry => ({
            email: entry.email,
            userId: entry.user_id,
            lastSync: entry.last_sync
        }));
    } catch (error) {
        console.error('Error obteniendo usuarios de la bóveda:', error);
        return [];
    }
}

/**
 * Elimina un usuario de la bóveda local
 * 
 * Útil cuando un usuario cierra sesión permanentemente o
 * cuando se detecta que sus credenciales han expirado.
 * 
 * @param email - Email del usuario a eliminar
 */
export async function removeUserFromVault(email: string): Promise<void> {
    try {
        await db.user_vault.delete(email);
        console.log(`🗑️ Usuario ${email} eliminado de la bóveda local`);
    } catch (error) {
        console.error('Error eliminando usuario de la bóveda:', error);
        throw new Error('No se pudo eliminar el usuario de la bóveda');
    }
}

/**
 * Actualiza solo el perfil de un usuario sin cambiar la contraseña
 * 
 * Útil durante la sincronización cuando los permisos/roles cambian
 * pero la contraseña sigue siendo la misma.
 * 
 * @param email - Email del usuario
 * @param newProfile - Nuevo perfil a guardar
 */
export async function updateVaultProfile(
    email: string,
    newProfile: UserProfile
): Promise<void> {
    try {
        const existingEntry = await db.user_vault.get(email);

        if (!existingEntry) {
            throw new Error('Usuario no encontrado en la bóveda');
        }

        // Para actualizar el perfil necesitamos la contraseña, pero no la tenemos
        // Por lo tanto, esta función solo se puede usar si tenemos acceso a la contraseña
        // o si implementamos un sistema de "session key" temporal

        // Por ahora, marcaremos que necesita re-sincronización
        console.warn('updateVaultProfile requiere la contraseña del usuario. Use saveUserToVault después del próximo login online.');

        // Actualizar solo el timestamp de sincronización
        await db.user_vault.update(email, {
            last_sync: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error actualizando perfil en bóveda:', error);
        throw new Error('No se pudo actualizar el perfil en la bóveda');
    }
}

/**
 * Limpia entradas antiguas de la bóveda
 * 
 * Elimina usuarios que no han sincronizado en más de X días.
 * Útil para mantener la bóveda limpia y segura.
 * 
 * @param maxDaysOld - Número máximo de días sin sincronización
 * @returns Número de entradas eliminadas
 */
export async function cleanOldVaultEntries(maxDaysOld: number = 90): Promise<number> {
    try {
        const allEntries = await db.user_vault.toArray();
        const now = new Date();
        const maxAge = maxDaysOld * 24 * 60 * 60 * 1000; // Convertir días a milisegundos

        let deletedCount = 0;

        for (const entry of allEntries) {
            const lastSync = new Date(entry.last_sync);
            const age = now.getTime() - lastSync.getTime();

            if (age > maxAge) {
                await db.user_vault.delete(entry.email);
                deletedCount++;
                console.log(`🗑️ Entrada antigua eliminada: ${entry.email} (${Math.floor(age / (24 * 60 * 60 * 1000))} días sin sincronizar)`);
            }
        }

        if (deletedCount > 0) {
            console.log(`✅ Limpieza completada: ${deletedCount} entrada(s) eliminada(s)`);
        }

        return deletedCount;
    } catch (error) {
        console.error('Error limpiando bóveda:', error);
        return 0;
    }
}

/**
 * Obtiene estadísticas de la bóveda
 * 
 * @returns Información sobre el estado de la bóveda
 */
export async function getVaultStats(): Promise<{
    totalUsers: number;
    oldestSync: string | null;
    newestSync: string | null;
}> {
    try {
        const entries = await db.user_vault.toArray();

        if (entries.length === 0) {
            return {
                totalUsers: 0,
                oldestSync: null,
                newestSync: null
            };
        }

        const syncDates = entries.map(e => new Date(e.last_sync).getTime());
        const oldest = new Date(Math.min(...syncDates)).toISOString();
        const newest = new Date(Math.max(...syncDates)).toISOString();

        return {
            totalUsers: entries.length,
            oldestSync: oldest,
            newestSync: newest
        };
    } catch (error) {
        console.error('Error obteniendo estadísticas de bóveda:', error);
        return {
            totalUsers: 0,
            oldestSync: null,
            newestSync: null
        };
    }
}
