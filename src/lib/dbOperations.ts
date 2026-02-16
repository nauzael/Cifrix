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
 * Mapea datos entre el esquema local (Dexie) y el remoto (Supabase)
 * Copiado/adaptado de sync.ts para consistencia en operaciones directas
 */
function mapTableSchema(tableName: string, data: any, toRemote: boolean) {
    if (!data) return data;
    const mapped = { ...data };

    // Siempre eliminar campos de control local antes de enviar a Supabase
    if (toRemote) {
        delete mapped.sync_status;
        // Si hay otros campos locales como updated_at que no están en Supabase, borrarlos aquí
    }

    if (tableName === 'members') {
        const statusMap: Record<string, string> = { 'activo': 'active', 'inactivo': 'inactive', 'visitante': 'active' };
        const revMap: Record<string, string> = { 'active': 'activo', 'inactive': 'inactivo', 'transferred': 'inactivo' };

        if (toRemote) {
            if ('status' in mapped) mapped.membership_status = statusMap[mapped.status] || 'active';
            if ('entry_date' in mapped) mapped.membership_date = mapped.entry_date || null;
            if ('birth_date' in mapped) mapped.birth_date = mapped.birth_date || null;
            if (mapped.is_active === undefined) mapped.is_active = mapped.membership_status === 'active';
            ['status', 'entry_date', 'pledge_amount', 'pledge_period', 'ministry', 'photo_url'].forEach(k => delete mapped[k]);
        } else {
            if ('membership_status' in mapped) mapped.status = revMap[mapped.membership_status] || 'activo';
            if ('membership_date' in mapped) mapped.entry_date = mapped.membership_date;
        }
    } else if (tableName === 'contributions') {
        if (toRemote) {
            if ('category' in mapped) mapped.contribution_type = mapped.category;
            if ('date' in mapped) mapped.contribution_date = mapped.date;
            const methodMap: Record<string, string> = {
                'EFECTIVO': 'CASH',
                'TARJETA': 'CARD',
                'TRANSFERENCIA': 'TRANSFER'
            };
            if ('method' in mapped) mapped.payment_method = methodMap[mapped.method.toUpperCase()] || 'CASH';
            ['category', 'date', 'method', 'fund_id', 'project_id'].forEach(k => delete mapped[k]);
        } else {
            const revMethodMap: Record<string, string> = {
                'CASH': 'EFECTIVO',
                'CARD': 'TARJETA',
                'TRANSFER': 'TRANSFERENCIA'
            };
            if ('contribution_type' in mapped) mapped.category = mapped.contribution_type;
            if ('contribution_date' in mapped) mapped.date = mapped.contribution_date;
            if ('payment_method' in mapped) mapped.method = revMethodMap[mapped.payment_method.toUpperCase()] || 'EFECTIVO';
        }
    }

    return mapped;
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

        if (shouldAttemptOnline()) {
            const mappedToRemote = mapTableSchema(tableName, record, true);
            const { data, error } = await (supabase as any)
                .from(tableName)
                .insert(mappedToRemote)
                .select()
                .single();

            if (!error) {
                const mappedToLocal = mapTableSchema(tableName, data, false);
                await (db as any)[tableName].put({ ...mappedToLocal, sync_status: 'sincronizado' });
                return { data: mappedToLocal, error: null, offline: false };
            }

            if (!(error.message?.includes('Fetch') || error.code === 'PGRST100')) {
                return { data: null, error, offline: false };
            }
            dbLog(`Network error in insertRecord, switching to offline mode`);
        }

        const offlineRecord = {
            ...record,
            sync_status: 'pendiente',
            updated_at: new Date().toISOString()
        };

        await (db as any)[tableName].put(offlineRecord);
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
            const mappedToRemote = mapTableSchema(tableName, updates, true);
            const { data, error } = await (supabase as any)
                .from(tableName)
                .update(mappedToRemote)
                .eq('id', id)
                .select()
                .single();

            if (!error) {
                const mappedToLocal = mapTableSchema(tableName, data, false);
                await (db as any)[tableName].update(id, { ...mappedToLocal, sync_status: 'sincronizado' });
                return { data: mappedToLocal, error: null, offline: false };
            }

            if (!(error.message?.includes('Fetch') || error.code === 'PGRST100')) {
                return { data: null, error, offline: false };
            }
        }

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

        await (db as any)[tableName].delete(id);
        await db.deleted_records.put({
            record_id: id,
            table_name: tableName,
            deleted_at: new Date().toISOString(),
            sync_status: 'pendiente'
        });

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
            const mappedToRemote = mapTableSchema(tableName, record, true);
            const { data, error } = await (supabase as any)
                .from(tableName)
                .upsert(mappedToRemote)
                .select()
                .single();

            if (!error) {
                const mappedToLocal = mapTableSchema(tableName, data, false);
                await (db as any)[tableName].put({ ...mappedToLocal, sync_status: 'sincronizado' });
                return { data: mappedToLocal, error: null, offline: false };
            }

            if (!(error.message?.includes('Fetch') || error.code === 'PGRST100')) {
                return { data: null, error, offline: false };
            }
        }

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
            const deletedIds = new Set(deletedLocalRecords.map(d => d.record_id));

            const itemsToCache = data
                .filter((item: any) => !deletedIds.has(item.id))
                .map((item: any) => {
                    const mapped = mapTableSchema(tableName, item, false);
                    return { ...mapped, sync_status: 'sincronizado' };
                });

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
    // 1. Si estamos online, refrescar desde la nube para asegurar prioridad de datos
    if (navigator.onLine) {
        try {
            await syncFromSupabase(tableName, organizationId);
        } catch (error) {
            console.warn(`[DB] Falló refresco desde nube para ${tableName}, usando caché:`, error);
        }
    }

    // 2. Obtener desde Dexie (Caché local actualizada o fallback)
    const cachedData = organizationId
        ? await (db as any)[tableName].where('organization_id').equals(organizationId).toArray()
        : await (db as any)[tableName].toArray();

    return cachedData as T[];
}
