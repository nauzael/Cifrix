import { supabase } from './supabase';
import { db } from './db';
import { APP_CONFIG, dbLog } from './config';

/**
 * Capa de Abstracción para Operaciones de Base de Datos
 * 
 * En modo HYBRID:
 * - Escrituras (INSERT/UPDATE/DELETE) → Directo a Supabase + Actualizar caché local
 * - Lecturas (SELECT) → Desde caché local (más rápido)
 */

export interface WriteResult<T = any> {
    data: T | null;
    error: any;
}

/**
 * Inserta un registro directamente en Supabase y actualiza la caché local
 */
export async function insertRecord<T extends Record<string, any>>(
    tableName: string,
    record: T
): Promise<WriteResult<T>> {
    try {
        dbLog(`INSERT ${tableName}`, { id: record.id });

        // 1. Insertar en Supabase (producción)
        const { data, error } = await supabase
            .from(tableName)
            .insert(record)
            .select()
            .single();

        if (error) {
            console.error(`Error inserting into ${tableName}:`, error);
            return { data: null, error };
        }

        // 2. Actualizar caché local si está habilitado
        if (APP_CONFIG.USE_LOCAL_CACHE) {
            try {
                await (db as any)[tableName].put({
                    ...data,
                    sync_status: 'sincronizado'
                });
                dbLog(`Cache updated for ${tableName}`, { id: data.id });
            } catch (cacheError) {
                console.warn(`Cache update failed for ${tableName}:`, cacheError);
                // No fallar la operación si solo falla la caché
            }
        }

        return { data, error: null };
    } catch (error) {
        console.error(`Unexpected error in insertRecord for ${tableName}:`, error);
        return { data: null, error };
    }
}

/**
 * Actualiza un registro directamente en Supabase y actualiza la caché local
 */
export async function updateRecord<T extends Record<string, any>>(
    tableName: string,
    id: string,
    updates: Partial<T>
): Promise<WriteResult<T>> {
    try {
        dbLog(`UPDATE ${tableName}`, { id, updates });

        // 1. Actualizar en Supabase (producción)
        const { data, error } = await supabase
            .from(tableName)
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error(`Error updating ${tableName}:`, error);
            return { data: null, error };
        }

        // 2. Actualizar caché local si está habilitado
        if (APP_CONFIG.USE_LOCAL_CACHE) {
            try {
                await (db as any)[tableName].update(id, {
                    ...updates,
                    sync_status: 'sincronizado'
                });
                dbLog(`Cache updated for ${tableName}`, { id });
            } catch (cacheError) {
                console.warn(`Cache update failed for ${tableName}:`, cacheError);
            }
        }

        return { data, error: null };
    } catch (error) {
        console.error(`Unexpected error in updateRecord for ${tableName}:`, error);
        return { data: null, error };
    }
}

/**
 * Elimina un registro directamente de Supabase y de la caché local
 */
export async function deleteRecord(
    tableName: string,
    id: string
): Promise<WriteResult<void>> {
    try {
        dbLog(`DELETE ${tableName}`, { id });

        // 1. Eliminar de Supabase (producción)
        const { error } = await supabase
            .from(tableName)
            .delete()
            .eq('id', id);

        if (error) {
            console.error(`Error deleting from ${tableName}:`, error);
            return { data: null, error };
        }

        // 2. Eliminar de caché local si está habilitado
        if (APP_CONFIG.USE_LOCAL_CACHE) {
            try {
                await (db as any)[tableName].delete(id);
                dbLog(`Cache cleared for ${tableName}`, { id });
            } catch (cacheError) {
                console.warn(`Cache delete failed for ${tableName}:`, cacheError);
            }
        }

        return { data: null, error: null };
    } catch (error) {
        console.error(`Unexpected error in deleteRecord for ${tableName}:`, error);
        return { data: null, error };
    }
}

/**
 * Realiza un upsert (insert o update) directamente en Supabase
 */
export async function upsertRecord<T extends Record<string, any>>(
    tableName: string,
    record: T
): Promise<WriteResult<T>> {
    try {
        dbLog(`UPSERT ${tableName}`, { id: record.id });

        // 1. Upsert en Supabase (producción)
        const { data, error } = await supabase
            .from(tableName)
            .upsert(record)
            .select()
            .single();

        if (error) {
            console.error(`Error upserting into ${tableName}:`, error);
            return { data: null, error };
        }

        // 2. Actualizar caché local si está habilitado
        if (APP_CONFIG.USE_LOCAL_CACHE) {
            try {
                await (db as any)[tableName].put({
                    ...data,
                    sync_status: 'sincronizado'
                });
                dbLog(`Cache updated for ${tableName}`, { id: data.id });
            } catch (cacheError) {
                console.warn(`Cache update failed for ${tableName}:`, cacheError);
            }
        }

        return { data, error: null };
    } catch (error) {
        console.error(`Unexpected error in upsertRecord for ${tableName}:`, error);
        return { data: null, error };
    }
}

/**
 * Sincroniza datos desde Supabase hacia la caché local
 * Útil para refrescar la caché después de operaciones masivas
 */
export async function syncFromSupabase(
    tableName: string,
    organizationId?: string
): Promise<void> {
    if (!APP_CONFIG.USE_LOCAL_CACHE) {
        dbLog(`Sync skipped for ${tableName} - cache disabled`);
        return;
    }

    try {
        dbLog(`Syncing ${tableName} from Supabase to cache...`);

        let query = supabase.from(tableName).select('*');

        if (organizationId) {
            query = query.eq('organization_id', organizationId);
        }

        const { data, error } = await query;

        if (error) {
            console.error(`Error fetching ${tableName} from Supabase:`, error);
            return;
        }

        if (data && data.length > 0) {
            // Limpiar tabla local primero (opcional, depende del caso de uso)
            // await (db as any)[tableName].clear();

            // Insertar/actualizar en caché local
            await (db as any)[tableName].bulkPut(
                data.map((item: any) => ({
                    ...item,
                    sync_status: 'sincronizado'
                }))
            );

            dbLog(`Synced ${data.length} records to cache for ${tableName}`);
        }
    } catch (error) {
        console.error(`Error syncing ${tableName}:`, error);
    }
}

/**
 * Hook helper para obtener datos desde la caché local
 * Si la caché está vacía, sincroniza desde Supabase primero
 */
export async function getFromCacheOrSupabase<T>(
    tableName: string,
    organizationId?: string
): Promise<T[]> {
    if (!APP_CONFIG.USE_LOCAL_CACHE) {
        // Si no hay caché, ir directo a Supabase
        let query = supabase.from(tableName).select('*');
        if (organizationId) {
            query = query.eq('organization_id', organizationId);
        }
        const { data } = await query;
        return (data || []) as T[];
    }

    // Intentar obtener desde caché
    let cachedData = organizationId
        ? await (db as any)[tableName].where('organization_id').equals(organizationId).toArray()
        : await (db as any)[tableName].toArray();

    // Si la caché está vacía, sincronizar desde Supabase
    if (!cachedData || cachedData.length === 0) {
        dbLog(`Cache miss for ${tableName}, syncing from Supabase...`);
        await syncFromSupabase(tableName, organizationId);

        cachedData = organizationId
            ? await (db as any)[tableName].where('organization_id').equals(organizationId).toArray()
            : await (db as any)[tableName].toArray();
    }

    return cachedData as T[];
}
