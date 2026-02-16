import { supabase } from './supabase';
import { db } from './db';
import { APP_CONFIG, dbLog } from './config';

/**
 * Capa de Abstracción para Operaciones de Base de Datos (MODO OFFLINE-FIRST)
 * 
 * Lógica:
 * 1. Si hay internet y modo != offline: Intenta Supabase primero.
 * 2. Si no hay internet o falla: Guarda en Dexie con sync_status = 'pendiente'.
 * 3. Las lecturas siempre vienen de Dexie (Velocidad instantánea).
 */

export interface WriteResult<T = any> {
    data: T | null;
    error: any;
    offline: boolean;
}

/**
 * Determina si debemos intentar escribir en Supabase directamente
 */
function shouldAttemptOnline(): boolean {
    return navigator.onLine && APP_CONFIG.DB_MODE !== 'offline';
}

/**
 * Inserta un registro. Soporta modo offline automático.
 */
export async function insertRecord<T extends Record<string, any>>(
    tableName: string,
    record: T
): Promise<WriteResult<T>> {
    try {
        dbLog(`INSERT ${tableName}`, { id: (record as any).id });

        // 1. Si estamos online y no es modo offline estricto, intentamos Supabase
        if (shouldAttemptOnline()) {
            const { data, error } = await (supabase as any)
                .from(tableName)
                .insert(record)
                .select()
                .single();

            if (!error) {
                // Éxito en la nube -> Guardar en local como sincronizado
                await (db as any)[tableName].put({ ...data, sync_status: 'sincronizado' });
                return { data, error: null, offline: false };
            }

            // Si el error es de red, continuamos hacia la lógica offline
            if (error.message?.includes('Fetch') || error.code === 'PGRST100') {
                dbLog(`Network error in insertRecord, switching to offline mode`);
            } else {
                return { data: null, error, offline: false };
            }
        }

        // 2. Lógica Offline: Guardar en Dexie con estado 'pendiente'
        const offlineRecord = {
            ...record,
            sync_status: 'pendiente',
            updated_at: new Date().toISOString()
        };

        await (db as any)[tableName].put(offlineRecord);
        dbLog(`Record saved OFFLINE in ${tableName}`, { id: (record as any).id });

        return { data: offlineRecord as any, error: null, offline: true };
    } catch (error) {
        console.error(`Error in insertRecord for ${tableName}:`, error);
        return { data: null, error, offline: true };
    }
}

/**
 * Actualiza un registro. Soporta modo offline automático.
 */
export async function updateRecord<T extends Record<string, any>>(
    tableName: string,
    id: string,
    updates: Partial<T>
): Promise<WriteResult<T>> {
    try {
        dbLog(`UPDATE ${tableName}`, { id, updates });

        if (shouldAttemptOnline()) {
            const { data, error } = await (supabase as any)
                .from(tableName)
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (!error) {
                await (db as any)[tableName].update(id, { ...updates, sync_status: 'sincronizado' });
                return { data, error: null, offline: false };
            }

            if (!(error.message?.includes('Fetch') || error.code === 'PGRST100')) {
                return { data: null, error, offline: false };
            }
        }

        // Modo Offline / Fallback
        await (db as any)[tableName].update(id, {
            ...updates,
            sync_status: 'pendiente',
            updated_at: new Date().toISOString()
        });

        const updated = await (db as any)[tableName].get(id);
        return { data: updated, error: null, offline: true };
    } catch (error) {
        console.error(`Error in updateRecord for ${tableName}:`, error);
        return { data: null, error, offline: true };
    }
}

/**
 * Elimina un registro. Soporta modo offline automático.
 */
export async function deleteRecord(
    tableName: string,
    id: string
): Promise<WriteResult<void>> {
    try {
        dbLog(`DELETE ${tableName}`, { id });

        if (shouldAttemptOnline()) {
            const { error } = await (supabase as any)
                .from(tableName)
                .delete()
                .eq('id', id);

            if (!error) {
                await (db as any)[tableName].delete(id);
                return { data: null, error: null, offline: false };
            }

            if (!(error.message?.includes('Fetch') || error.code === 'PGRST100')) {
                return { data: null, error, offline: false };
            }
        }

        // Modo Offline: Marcar para eliminación en la tabla de registros eliminados
        await (db as any)[tableName].delete(id);
        await db.deleted_records.put({
            id,
            table_name: tableName,
            deleted_at: new Date().toISOString(),
            sync_status: 'pendiente'
        });

        dbLog(`Record marked for OFFLINE deletion in ${tableName}`, { id });
        return { data: null, error: null, offline: true };
    } catch (error) {
        console.error(`Error in deleteRecord for ${tableName}:`, error);
        return { data: null, error, offline: true };
    }
}

/**
 * Realiza un upsert (insert o update). Soporta modo offline automático.
 */
export async function upsertRecord<T extends Record<string, any>>(
    tableName: string,
    record: T
): Promise<WriteResult<T>> {
    try {
        dbLog(`UPSERT ${tableName}`, { id: (record as any).id });

        if (shouldAttemptOnline()) {
            const { data, error } = await (supabase as any)
                .from(tableName)
                .upsert(record)
                .select()
                .single();

            if (!error) {
                await (db as any)[tableName].put({ ...data, sync_status: 'sincronizado' });
                return { data, error: null, offline: false };
            }

            if (!(error.message?.includes('Fetch') || error.code === 'PGRST100')) {
                return { data: null, error, offline: false };
            }
        }

        // Modo Offline
        const offlineRecord = {
            ...record,
            sync_status: 'pendiente',
            updated_at: new Date().toISOString()
        };
        await (db as any)[tableName].put(offlineRecord);

        return { data: offlineRecord as any, error: null, offline: true };
    } catch (error) {
        console.error(`Error in upsertRecord for ${tableName}:`, error);
        return { data: null, error, offline: true };
    }
}

/**
 * Sincroniza datos DESDE Supabase hacia Dexie (Lectura)
 */
export async function syncFromSupabase(
    tableName: string,
    organizationId?: string
): Promise<void> {
    if (!navigator.onLine) return;

    try {
        dbLog(`Refreshing ${tableName} from cloud...`);
        let query = (supabase as any).from(tableName).select('*');
        if (organizationId) query = query.eq('organization_id', organizationId);

        const { data, error } = await query;
        if (error) throw error;

        if (data && data.length > 0) {
            // Obtener registros eliminados localmente para filtrar
            const deletedLocalRecords = await db.deleted_records
                .where('table_name')
                .equals(tableName)
                .toArray();
            const deletedIds = new Set(deletedLocalRecords.map(d => d.id));

            const itemsToCache = data
                .filter((item: any) => !deletedIds.has(item.id))
                .map((item: any) => ({ ...item, sync_status: 'sincronizado' }));

            if (itemsToCache.length > 0) {
                await (db as any)[tableName].bulkPut(itemsToCache);
            }
        }
    } catch (error) {
        console.error(`Error in syncFromSupabase for ${tableName}:`, error);
    }
}

/**
 * Lectura: Siempre intenta Dexie primero (Velocidad)
 */
export async function getFromCacheOrSupabase<T>(
    tableName: string,
    organizationId?: string
): Promise<T[]> {
    // 1. Obtener desde Dexie (Caché local)
    let cachedData = organizationId
        ? await (db as any)[tableName].where('organization_id').equals(organizationId).toArray()
        : await (db as any)[tableName].toArray();

    // 2. Si hay internet y la caché está vacía, refrescar desde la nube
    if (navigator.onLine && (!cachedData || cachedData.length === 0)) {
        await syncFromSupabase(tableName, organizationId);
        cachedData = organizationId
            ? await (db as any)[tableName].where('organization_id').equals(organizationId).toArray()
            : await (db as any)[tableName].toArray();
    }

    return cachedData as T[];
}
