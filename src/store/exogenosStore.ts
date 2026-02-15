/**
 * Store de Zustand para el módulo de Exógenas
 * Gestiona la carga, validación y mapeo de inconsistencias de reportes de terceros
 */

import { create } from 'zustand';
import { db, Exogeno, MapeoInconsistencia } from '@/lib/db';
import { exogenosService } from '@/lib/exogenos';
import { toast } from 'react-hot-toast';

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
                tercero_id: row.nit_tercero,
                tercero_nombre: row.nombre_tercero,
                periodo_fiscal: new Date().getFullYear() - 1, // Default al año anterior
                concepto: row.concepto,
                valor_reportado: row.valor,
                tipo_movimiento: row.tipo_movimiento,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                sync_status: 'pending'
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
                    organization_id: reporte.organization_id,
                    exogeno_id: reporte.id,
                    tipo_error: result.tipo,
                    descripcion: result.descripcion,
                    valor_reportado: result.valorReportado,
                    valor_contable: result.valorInterno,
                    diferencia: result.diferencia,
                    estado: 'PENDIENTE',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    sync_status: 'pending'
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
                .filter(i => i.estado === 'PENDIENTE')
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
                estado: 'RESUELTO',
                explicacion_ajuste: comentario,
                updated_at: new Date().toISOString(),
                sync_status: 'pending'
            });

            set(state => ({
                inconsistencias: state.inconsistencias.map(inc =>
                    inc.id === id ? { ...inc, estado: 'RESUELTO', explicacion_ajuste: comentario } : inc
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

    limpiarEstado: () => {
        set({ reportes: [], inconsistencias: [], error: null, loading: false });
    }
}));
