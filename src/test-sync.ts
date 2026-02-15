import { insertRecord } from './lib/dbOperations';
import { syncToSupabase } from './lib/sync';
import { dbLog } from './lib/config';

/**
 * Script de prueba para el sistema de sincronización offline.
 * Ejecuta este comando en la consola del navegador (F12) para probar el flujo completo.
 */
export async function runOfflineSyncTest() {
    console.log('--- INICIANDO TEST DE SINCRONIZACIÓN OFFLINE ---');

    // 1. Crear datos de prueba para una nueva organización
    const testOrgId = crypto.randomUUID();
    const testOrg = {
        id: testOrgId,
        name: `Iglesia de Prueba Offline ${new Date().toLocaleTimeString()}`,
        type: 'IGLESIA' as const,
        tax_id: `900-${Math.floor(Math.random() * 1000000)}`,
        settings: { theme: 'dark', test: true },
        created_at: new Date().toISOString()
    };

    console.log('1. Creando organización localmente (Simulando Offline)...');
    const result = await insertRecord('organizations', testOrg);

    if (result.offline) {
        console.log('✅ Éxito: Registro guardado en Dexie con sync_status = "pendiente"');
    } else {
        console.log('⚠️ Aviso: El registro se guardó directamente en Supabase (estabas online).');
    }

    // 2. Mostrar estado actual
    console.log('2. Estado actual de la organización:', result.data);

    // 3. Forzar sincronización (Simulando Reconexión)
    console.log('3. Forzando sincronización hacia Supabase...');
    await syncToSupabase();

    console.log('--- TEST COMPLETADO ---');
    console.log('Revisa los logs anteriores para ver si el RPC se ejecutó correctamente.');
    console.log(`Busca en Supabase la organización con ID: ${testOrgId}`);
}

// Hacerlo disponible globalmente para facilitar la prueba desde la consola
(window as any).runSyncTest = runOfflineSyncTest;
