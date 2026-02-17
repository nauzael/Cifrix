/**
 * Store de Zustand para el módulo de Exógenas
 * Gestiona la carga, validación y mapeo de inconsistencias de reportes de terceros
 */

import { create } from 'zustand';
import { db, Exogeno, MapeoInconsistencia } from '@/lib/db';
import { exogenosService } from '@/lib/exogenos';
import { syncExogenos } from '@/lib/sync';
import { toast } from '@/store/toastStore';

interface ExogenosState {
    reportes: Exogeno[];
    inconsistencias: MapeoInconsistencia[];
    loading: boolean;
    error: string | null;

    // Acciones
    cargarReportes: (organizacionId: string) => Promise<void>;
    importarArchivo: (file: File, organizacionId: string) => Promise<void>;
    validarReporte: (reporteId: string) => Promise<void>;
    validarTodo: () => Promise<void>;
    resolverInconsistencia: (id: string, comentario: string) => Promise<void>;
    eliminarReporte: (id: string) => Promise<void>;
    generarDesdeContabilidad: (organizacionId: string, año: number) => Promise<void>;
    limpiarTodo: (organizacionId: string) => Promise<void>;
    sincronizarConNube: (organizacionId: string) => Promise<void>;
    limpiarEstado: () => void;
}

export const useExogenosStore = create<ExogenosState>((set, get) => ({
    reportes: [],
    inconsistencias: [],
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

    importarArchivo: async (file: File, organizacionId: string) => {
        set({ loading: true, error: null });
        try {
            const rawRows = await exogenosService.parser.parseFile(file);

            const newReportes: Exogeno[] = rawRows.map(row => ({
                id: crypto.randomUUID(),
                organization_id: organizacionId,
                nit_informante: '', // TODO: Get from organization settings
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
                created_at: new Date().toISOString(),
                sync_status: 'pendiente'
            }));

            await db.exogenos.bulkAdd(newReportes);

            // Recargar
            await get().cargarReportes(organizacionId);

            toast.success(`${newReportes.length} registros importados correctamente`);
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

            for (const reporte of reportes) {
                await get().validarReporte(reporte.id);
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
        } catch (error: any) {
            console.error('Error al generar exógenos:', error);
            const errorMessage = error.message || 'Error al generar exógenos desde contabilidad';
            set({ error: errorMessage, loading: false });
            toast.error(errorMessage);
        }
    },

    limpiarTodo: async (organizacionId: string) => {
        set({ loading: true });
        try {
            const reportesIds = get().reportes.map(r => r.id);
            const incsIds = get().inconsistencias.map(i => i.id);

            await db.exogenos.bulkDelete(reportesIds);
            await db.mapeo_inconsistencias.bulkDelete(incsIds);

            set({ reportes: [], inconsistencias: [], loading: false });
            toast.success('Módulo de exógenos limpiado correctamente');
        } catch (error) {
            console.error('Error al limpiar exógenos:', error);
            set({ loading: false });
            toast.error('Error al limpiar los datos');
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

    limpiarEstado: () => {
        set({ reportes: [], inconsistencias: [], error: null, loading: false });
    }
}));
