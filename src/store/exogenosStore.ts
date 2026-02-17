import { create } from 'zustand';
import { db, Exogeno, MapeoInconsistencia, ThirdParty } from '@/lib/db';
import { exogenosService } from '@/lib/exogenos';
import { syncExogenos } from '@/lib/sync';
import { toast } from '@/store/toastStore';

interface ExogenosState {
    reportes: Exogeno[];
    inconsistencias: MapeoInconsistencia[];
    thirdParties: ThirdParty[];
    loading: boolean;
    error: string | null;

    // Acciones
    cargarReportes: (organizacionId: string) => Promise<void>;
    cargarTerceros: (organizacionId: string) => Promise<void>;
    importarArchivo: (file: File, organizacionId: string) => Promise<void>;
    validarReporte: (reporteId: string) => Promise<void>;
    validarTodo: () => Promise<void>;
    resolverInconsistencia: (id: string, comentario: string) => Promise<void>;
    eliminarReporte: (id: string) => Promise<void>;
    generarDesdeContabilidad: (organizacionId: string, año: number) => Promise<{ count: number; total: number }>;
    limpiarTodo: (organizacionId: string) => Promise<void>;
    sincronizarConNube: (organizacionId: string) => Promise<void>;

    // Terceros Acciones
    crearTercero: (tercero: Omit<ThirdParty, 'id' | 'created_at'>) => Promise<void>;
    actualizarTercero: (id: string, updates: Partial<ThirdParty>) => Promise<void>;
    eliminarTercero: (id: string) => Promise<void>;

    limpiarEstado: () => void;
}

export const useExogenosStore = create<ExogenosState>((set, get) => ({
    reportes: [],
    inconsistencias: [],
    thirdParties: [],
    loading: false,
    error: null,

    cargarReportes: async (organizacionId: string) => {
        set({ loading: true, error: null });
        try {
            const reportes = await db.exogenos
                .where('organization_id')
                .equals(organizacionId)
                .toArray();

            const inconsistencias = await db.mapeo_inconsistencias
                .where('organization_id')
                .equals(organizacionId)
                .toArray();

            set({ reportes, inconsistencias, loading: false });
        } catch (error) {
            console.error('Error al cargar reportes exógenos:', error);
            set({ error: 'No se pudieron cargar los reportes', loading: false });
        }
    },

    cargarTerceros: async (organizacionId: string) => {
        set({ loading: true });
        try {
            const thirdParties = await db.third_parties
                .where('organization_id')
                .equals(organizacionId)
                .toArray();
            set({ thirdParties, loading: false });
        } catch (error) {
            console.error('Error al cargar terceros:', error);
            set({ loading: false });
        }
    },

    importarArchivo: async (file: File, organizacionId: string) => {
        set({ loading: true, error: null });
        try {
            const rawRows = await exogenosService.parser.parseFile(file);

            const newReportes: Exogeno[] = rawRows.map(row => ({
                id: crypto.randomUUID(),
                organization_id: organizacionId,
                nit_informante: '',
                nit_contribuyente: row.nit_contribuyente,
                nombre_contribuyente: row.nombre_contribuyente,
                periodo_fiscal: row.periodo_fiscal,
                concepto: row.concepto,
                monto: row.monto,
                retencion: row.retencion,
                fecha_movimiento: new Date().toISOString(),
                tipo_exogeno: row.tipo_exogeno,
                procesado: false,
                validado: false,
                archivo_origen: file.name,
                created_at: new Date().toISOString(),
                sync_status: 'pendiente'
            }));

            await db.exogenos.bulkAdd(newReportes);

            // Sincronizar terceros nuevos
            const existingThirdParties = await db.third_parties.where('organization_id').equals(organizacionId).toArray();
            const existingNits = new Set(existingThirdParties.map(t => t.nit));
            const uniqueNewNits = new Set<string>();
            const newThirdParties: ThirdParty[] = [];

            for (const row of rawRows) {
                if (!existingNits.has(row.nit_contribuyente) && !uniqueNewNits.has(row.nit_contribuyente)) {
                    uniqueNewNits.add(row.nit_contribuyente);
                    newThirdParties.push({
                        id: crypto.randomUUID(),
                        organization_id: organizacionId,
                        nit: row.nit_contribuyente,
                        nombre: row.nombre_contribuyente,
                        tipo_persona: row.nit_contribuyente.length === 9 || row.nit_contribuyente.length === 10 ? 'JURIDICA' : 'NATURAL', // Heurística simple
                        obligado_exogena: false,
                        tipos_exogena: [], // Se llenará si se configura
                        created_at: new Date().toISOString(),
                        sync_status: 'pendiente'
                    });
                }
            }

            if (newThirdParties.length > 0) {
                await db.third_parties.bulkAdd(newThirdParties);
            }

            // Recargar todo
            await get().cargarReportes(organizacionId);
            await get().cargarTerceros(organizacionId);

            toast.success(`${newReportes.length} registros importados y ${newThirdParties.length} nuevos terceros creados.`);
        } catch (error: any) {
            console.error('Error al importar archivo:', error);
            set({ error: error.message || 'Error al procesar el archivo', loading: false });
            toast.error('Error al importar el archivo');
        }
    },

    validarReporte: async (reporteId: string) => {
        const reporte = get().reportes.find(r => r.id === reporteId);
        if (!reporte) return;

        try {
            const result = await exogenosService.validator.validarContraContabilidad(reporte);

            if (result.hayInconsistencia) {
                const inconsistencia: MapeoInconsistencia = {
                    id: crypto.randomUUID(),
                    exogeno_id: reporte.id,
                    estado_validacion: 'PENDIENTE',
                    diferencia_monto: result.diferencia,
                    resuelto: false,
                    notas: result.descripcion,
                    created_at: new Date().toISOString(),
                    sync_status: 'pendiente'
                };

                await db.mapeo_inconsistencias.add(inconsistencia);

                // Actualizar estado local
                set(state => ({
                    inconsistencias: [...state.inconsistencias, inconsistencia]
                }));
            }
        } catch (error) {
            console.error('Error validando reporte:', error);
        }
    },

    validarTodo: async () => {
        set({ loading: true });
        const { reportes } = get();

        try {
            // Limpiar inconsistencias previas no resueltas
            const idsBorrar = get().inconsistencias
                .filter(i => i.estado_validacion === 'PENDIENTE')
                .map(i => i.id);

            await db.mapeo_inconsistencias.bulkDelete(idsBorrar);

            // Optimización: Validar lote
            // await exogenosService.validator.validarLote(reportes);
            // Por ahora individual para reutilizar logica
            for (const reporte of reportes) {
                await get().validarReporte(reporte.id);
            }

            // Recargar inconsistencias
            const orgId = reportes[0]?.organization_id;
            if (orgId) {
                const updatedIncs = await db.mapeo_inconsistencias.where('organization_id').equals(orgId).toArray();
                set({ inconsistencias: updatedIncs });
            }

            set({ loading: false });
            toast.success('Validación masiva completada');
        } catch (error) {
            console.error('Error en validación masiva:', error);
            set({ loading: false });
            toast.error('Error durante la validación masiva');
        }
    },

    resolverInconsistencia: async (id: string, comentario: string) => {
        try {
            await db.mapeo_inconsistencias.update(id, {
                resuelto: true,
                notas: comentario,
                sync_status: 'pendiente'
            });

            set(state => ({
                inconsistencias: state.inconsistencias.map(inc =>
                    inc.id === id ? { ...inc, resuelto: true, notas: comentario } : inc
                )
            }));

            toast.success('Inconsistencia marcada como resuelta');
        } catch (error) {
            console.error('Error al resolver inconsistencia:', error);
            toast.error('Error al actualizar inconsistencia');
        }
    },

    eliminarReporte: async (id: string) => {
        try {
            await db.exogenos.delete(id);
            // También borrar inconsistencias asociadas
            const incs = get().inconsistencias.filter(i => i.exogeno_id === id);
            await db.mapeo_inconsistencias.bulkDelete(incs.map(i => i.id));

            set(state => ({
                reportes: state.reportes.filter(r => r.id !== id),
                inconsistencias: state.inconsistencias.filter(i => i.exogeno_id !== id)
            }));

            toast.success('Reporte eliminado');
        } catch (error) {
            console.error('Error al eliminar reporte:', error);
            toast.error('Error al eliminar reporte');
        }
    },

    generarDesdeContabilidad: async (organizacionId: string, año: number) => {
        set({ loading: true, error: null });
        try {
            const result = await exogenosService.generator.generateFromAccounting(organizacionId, año);
            await get().cargarReportes(organizacionId);
            toast.success(`${result.count} registros generados automáticamente`);
            return result;
        } catch (error: any) {
            console.error('Error al generar exógenos:', error);
            const errorMessage = error.message || 'Error al generar exógenos desde contabilidad';
            set({ error: errorMessage, loading: false });
            toast.error(errorMessage);
            throw error;
        }
    },

    limpiarTodo: async (organizacionId: string) => {
        if (!organizacionId) return;
        set({ loading: true });
        try {
            // Obtener todos los IDs de reportes, inconsistencias y terceros para esta organización
            const reportes = await db.exogenos.where('organization_id').equals(organizacionId).toArray();
            const reportesIds = reportes.map(r => r.id);

            const inconsistencias = await db.mapeo_inconsistencias.where('organization_id').equals(organizacionId).toArray();
            const incsIds = inconsistencias.map(i => i.id);

            const terceros = await db.third_parties.where('organization_id').equals(organizacionId).toArray();
            const tercerosIds = terceros.map(t => t.id);

            // Borrado físico local
            await db.exogenos.bulkDelete(reportesIds);
            await db.mapeo_inconsistencias.bulkDelete(incsIds);
            await db.third_parties.bulkDelete(tercerosIds);

            // Sincronizar inmediatamente para que desaparezcan de Supabase
            // El hook 'deleting' de la DB habrá registrado estos IDs en deleted_records
            await get().sincronizarConNube(organizacionId);

            set({ reportes: [], inconsistencias: [], thirdParties: [], loading: false });
            toast.success('Información eliminada y sincronizada correctamente');
        } catch (error) {
            console.error('Error al limpiar exógenos:', error);
            set({ loading: false });
            toast.error('Error al intentar limpiar los datos');
        }
    },

    sincronizarConNube: async (organizacionId: string) => {
        set({ loading: true });
        try {
            await syncExogenos(organizacionId);
            set({ loading: false });
        } catch (error) {
            console.error('Error sync exogenos:', error);
            set({ loading: false });
        }
    },

    // CRUD Terceros
    crearTercero: async (tercero) => {
        try {
            const id = crypto.randomUUID();
            const newThirdParty = { ...tercero, id, created_at: new Date().toISOString(), sync_status: 'pendiente' as const };
            await db.third_parties.add(newThirdParty);
            set(state => ({ thirdParties: [...state.thirdParties, newThirdParty] }));
            toast.success('Tercero creado');
        } catch (error) {
            console.error(error);
            toast.error('Error al crear tercero');
        }
    },

    actualizarTercero: async (id, updates) => {
        try {
            await db.third_parties.update(id, { ...updates, sync_status: 'pendiente' });
            set(state => ({
                thirdParties: state.thirdParties.map(t => t.id === id ? { ...t, ...updates } : t)
            }));
            toast.success('Tercero actualizado');
        } catch (error) {
            console.error(error);
            toast.error('Error al actualizar tercero');
        }
    },

    eliminarTercero: async (id) => {
        try {
            await db.third_parties.delete(id);
            set(state => ({
                thirdParties: state.thirdParties.filter(t => t.id !== id)
            }));
            toast.success('Tercero eliminado');
        } catch (error) {
            console.error(error);
            toast.error('Error al eliminar tercero');
        }
    },

    limpiarEstado: () => {
        set({ reportes: [], inconsistencias: [], thirdParties: [], error: null, loading: false });
    }
}));

