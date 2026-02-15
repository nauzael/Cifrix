/**
 * Store de Zustand para el módulo de Renta
 * Gestiona el estado global de declaraciones, ingresos y deducciones
 */

import { create } from 'zustand';
import { db, DeclaracionRenta, IngresoRenta, DeduccionRenta, ActivoPasivoRenta } from '@/lib/db';
import { rentaCalculator, rentaValidator, ResultadoCalculo, ResultadoValidacion } from '@/lib/renta';
import { useAuthStore } from './authStore';

interface RentaState {
    // Estado
    declaraciones: DeclaracionRenta[];
    declaracionActual: DeclaracionRenta | null;
    ingresos: IngresoRenta[];
    deducciones: DeduccionRenta[];
    activosPasivos: ActivoPasivoRenta[];
    resultadoCalculo: ResultadoCalculo | null;
    resultadoValidacion: ResultadoValidacion | null;
    loading: boolean;
    error: string | null;

    // Acciones - Declaraciones
    cargarDeclaraciones: () => Promise<void>;
    cargarDeclaracion: (id: string) => Promise<void>;
    crearDeclaracion: (data: Partial<DeclaracionRenta>) => Promise<string>;
    actualizarDeclaracion: (id: string, data: Partial<DeclaracionRenta>) => Promise<void>;
    eliminarDeclaracion: (id: string) => Promise<void>;

    // Acciones - Ingresos
    agregarIngreso: (data: Partial<IngresoRenta>) => Promise<void>;
    actualizarIngreso: (id: string, data: Partial<IngresoRenta>) => Promise<void>;
    eliminarIngreso: (id: string) => Promise<void>;

    // Acciones - Deducciones
    agregarDeduccion: (data: Partial<DeduccionRenta>) => Promise<void>;
    actualizarDeduccion: (id: string, data: Partial<DeduccionRenta>) => Promise<void>;
    eliminarDeduccion: (id: string) => Promise<void>;

    // Acciones - Activos y Pasivos
    agregarActivoPasivo: (data: Partial<ActivoPasivoRenta>) => Promise<void>;
    actualizarActivoPasivo: (id: string, data: Partial<ActivoPasivoRenta>) => Promise<void>;
    eliminarActivoPasivo: (id: string) => Promise<void>;

    // Acciones - Cálculos y Validaciones
    calcularImpuesto: () => void;
    validarDeclaracion: () => Promise<void>;
    recalcularTotales: () => Promise<void>;

    // Utilidades
    limpiarEstado: () => void;
}

export const useRentaStore = create<RentaState>((set, get) => ({
    // Estado inicial
    declaraciones: [],
    declaracionActual: null,
    ingresos: [],
    deducciones: [],
    activosPasivos: [],
    resultadoCalculo: null,
    resultadoValidacion: null,
    loading: false,
    error: null,

    // Cargar todas las declaraciones de la organización
    cargarDeclaraciones: async () => {
        set({ loading: true, error: null });
        try {
            const orgId = useAuthStore.getState().currentOrganization?.id;
            if (!orgId) throw new Error('No hay organización seleccionada');

            const declaraciones = await db.declaraciones_renta
                .where({ organization_id: orgId })
                .reverse()
                .sortBy('periodo_fiscal');

            set({ declaraciones, loading: false });
        } catch (error) {
            set({ error: (error as Error).message, loading: false });
        }
    },

    // Cargar una declaración específica con sus datos relacionados
    cargarDeclaracion: async (id: string) => {
        set({ loading: true, error: null });
        try {
            const declaracion = await db.declaraciones_renta.get(id);
            if (!declaracion) throw new Error('Declaración no encontrada');

            const ingresos = await db.ingresos_renta
                .where({ declaracion_id: id })
                .toArray();

            const deducciones = await db.deducciones_renta
                .where({ declaracion_id: id })
                .toArray();

            const activosPasivos = await db.activos_pasivos_renta
                .where({ declaracion_id: id })
                .toArray();

            set({
                declaracionActual: declaracion,
                ingresos,
                deducciones,
                activosPasivos,
                loading: false
            });

            // Calcular automáticamente
            get().calcularImpuesto();
        } catch (error) {
            set({ error: (error as Error).message, loading: false });
        }
    },

    // Crear nueva declaración
    crearDeclaracion: async (data: Partial<DeclaracionRenta>) => {
        set({ loading: true, error: null });
        try {
            const orgId = useAuthStore.getState().currentOrganization?.id;
            if (!orgId) throw new Error('No hay organización seleccionada');

            const nuevaDeclaracion: DeclaracionRenta = {
                id: crypto.randomUUID(),
                organization_id: orgId,
                periodo_fiscal: data.periodo_fiscal || new Date().getFullYear() - 1,
                contribuyente_id: data.contribuyente_id || '',
                contribuyente_nombre: data.contribuyente_nombre || '',
                estado: 'BORRADOR',
                total_ingresos: 0,
                total_costos: 0,
                total_gastos: 0,
                total_deducciones: 0,
                base_gravable: 0,
                impuesto_calculado: 0,
                creditos_tributarios: 0,
                impuesto_neto: 0,
                fecha_creacion: new Date().toISOString(),
                sync_status: 'pendiente',
                ...data
            };

            await db.declaraciones_renta.add(nuevaDeclaracion);

            set({
                declaracionActual: nuevaDeclaracion,
                ingresos: [],
                deducciones: [],
                activosPasivos: [],
                loading: false
            });

            // Recargar lista
            await get().cargarDeclaraciones();

            return nuevaDeclaracion.id;
        } catch (error) {
            set({ error: (error as Error).message, loading: false });
            throw error;
        }
    },

    // Actualizar declaración
    actualizarDeclaracion: async (id: string, data: Partial<DeclaracionRenta>) => {
        try {
            await db.declaraciones_renta.update(id, {
                ...data,
                sync_status: 'pendiente'
            });

            // Actualizar estado local
            const declaracionActual = get().declaracionActual;
            if (declaracionActual?.id === id) {
                set({ declaracionActual: { ...declaracionActual, ...data } });
            }

            // Recargar lista
            await get().cargarDeclaraciones();
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        }
    },

    // Eliminar declaración
    eliminarDeclaracion: async (id: string) => {
        set({ loading: true, error: null });
        try {
            // Eliminar datos relacionados
            const ingresos = await db.ingresos_renta.where({ declaracion_id: id }).toArray();
            const deducciones = await db.deducciones_renta.where({ declaracion_id: id }).toArray();
            const activosPasivos = await db.activos_pasivos_renta.where({ declaracion_id: id }).toArray();

            await Promise.all([
                ...ingresos.map(ing => db.ingresos_renta.delete(ing.id)),
                ...deducciones.map(ded => db.deducciones_renta.delete(ded.id)),
                ...activosPasivos.map(ap => db.activos_pasivos_renta.delete(ap.id)),
                db.declaraciones_renta.delete(id)
            ]);

            // Limpiar estado si es la declaración actual
            if (get().declaracionActual?.id === id) {
                get().limpiarEstado();
            }

            // Recargar lista
            await get().cargarDeclaraciones();
            set({ loading: false });
        } catch (error) {
            set({ error: (error as Error).message, loading: false });
            throw error;
        }
    },

    // Agregar ingreso
    agregarIngreso: async (data: Partial<IngresoRenta>) => {
        try {
            const declaracionId = get().declaracionActual?.id;
            if (!declaracionId) throw new Error('No hay declaración activa');

            const nuevoIngreso: IngresoRenta = {
                id: crypto.randomUUID(),
                declaracion_id: declaracionId,
                tipo_ingreso: data.tipo_ingreso || 'LABORAL',
                concepto: data.concepto || '',
                monto: data.monto || 0,
                retencion_aplicada: data.retencion_aplicada || 0,
                mes: data.mes,
                sync_status: 'pendiente',
                ...data
            };

            await db.ingresos_renta.add(nuevoIngreso);
            set({ ingresos: [...get().ingresos, nuevoIngreso] });

            // Recalcular totales
            await get().recalcularTotales();
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        }
    },

    // Actualizar ingreso
    actualizarIngreso: async (id: string, data: Partial<IngresoRenta>) => {
        try {
            await db.ingresos_renta.update(id, {
                ...data,
                sync_status: 'pendiente'
            });

            const ingresos = get().ingresos.map(ing =>
                ing.id === id ? { ...ing, ...data } : ing
            );
            set({ ingresos });

            await get().recalcularTotales();
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        }
    },

    // Eliminar ingreso
    eliminarIngreso: async (id: string) => {
        try {
            await db.ingresos_renta.delete(id);
            set({ ingresos: get().ingresos.filter(ing => ing.id !== id) });
            await get().recalcularTotales();
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        }
    },

    // Agregar deducción
    agregarDeduccion: async (data: Partial<DeduccionRenta>) => {
        try {
            const declaracionId = get().declaracionActual?.id;
            if (!declaracionId) throw new Error('No hay declaración activa');

            const nuevaDeduccion: DeduccionRenta = {
                id: crypto.randomUUID(),
                declaracion_id: declaracionId,
                tipo_deduccion: data.tipo_deduccion || 'SALUD',
                concepto: data.concepto || '',
                monto: data.monto || 0,
                monto_deducido: data.monto_deducido,
                documento_soporte: data.documento_soporte,
                sync_status: 'pendiente',
                ...data
            };

            await db.deducciones_renta.add(nuevaDeduccion);
            set({ deducciones: [...get().deducciones, nuevaDeduccion] });

            await get().recalcularTotales();
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        }
    },

    // Actualizar deducción
    actualizarDeduccion: async (id: string, data: Partial<DeduccionRenta>) => {
        try {
            await db.deducciones_renta.update(id, {
                ...data,
                sync_status: 'pendiente'
            });

            const deducciones = get().deducciones.map(ded =>
                ded.id === id ? { ...ded, ...data } : ded
            );
            set({ deducciones });

            await get().recalcularTotales();
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        }
    },

    // Eliminar deducción
    eliminarDeduccion: async (id: string) => {
        try {
            await db.deducciones_renta.delete(id);
            set({ deducciones: get().deducciones.filter(ded => ded.id !== id) });
            await get().recalcularTotales();
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        }
    },

    // Agregar activo/pasivo
    agregarActivoPasivo: async (data: Partial<ActivoPasivoRenta>) => {
        try {
            const declaracionId = get().declaracionActual?.id;
            if (!declaracionId) throw new Error('No hay declaración activa');

            const nuevoAP: ActivoPasivoRenta = {
                id: crypto.randomUUID(),
                declaracion_id: declaracionId,
                tipo: data.tipo || 'ACTIVO',
                concepto: data.concepto || '',
                valor: data.valor || 0,
                sync_status: 'pendiente',
                ...data
            };

            await db.activos_pasivos_renta.add(nuevoAP);
            set({ activosPasivos: [...get().activosPasivos, nuevoAP] });
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        }
    },

    // Actualizar activo/pasivo
    actualizarActivoPasivo: async (id: string, data: Partial<ActivoPasivoRenta>) => {
        try {
            await db.activos_pasivos_renta.update(id, {
                ...data,
                sync_status: 'pendiente'
            });

            const activosPasivos = get().activosPasivos.map(ap =>
                ap.id === id ? { ...ap, ...data } : ap
            );
            set({ activosPasivos });
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        }
    },

    // Eliminar activo/pasivo
    eliminarActivoPasivo: async (id: string) => {
        try {
            await db.activos_pasivos_renta.delete(id);
            set({ activosPasivos: get().activosPasivos.filter(ap => ap.id !== id) });
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        }
    },

    // Calcular impuesto
    calcularImpuesto: () => {
        const declaracion = get().declaracionActual;
        if (!declaracion) return;

        try {
            const resultado = rentaCalculator.calcularImpuesto(declaracion);
            set({ resultadoCalculo: resultado });
        } catch (error) {
            set({ error: (error as Error).message });
        }
    },

    // Validar declaración
    validarDeclaracion: async () => {
        const declaracion = get().declaracionActual;
        if (!declaracion) return;

        try {
            const resultado = await rentaValidator.validarDeclaracion(declaracion.id);
            set({ resultadoValidacion: resultado });
        } catch (error) {
            set({ error: (error as Error).message });
        }
    },

    // Recalcular totales
    recalcularTotales: async () => {
        const declaracion = get().declaracionActual;
        if (!declaracion) return;

        const ingresos = get().ingresos;
        const deducciones = get().deducciones;

        const totalIngresos = ingresos.reduce((sum, ing) => sum + ing.monto, 0);
        const totalDeducciones = deducciones.reduce((sum, ded) => sum + (ded.monto_deducido || ded.monto), 0);

        await get().actualizarDeclaracion(declaracion.id, {
            total_ingresos: totalIngresos,
            total_deducciones: totalDeducciones,
            base_gravable: Math.max(0, totalIngresos - declaracion.total_costos - declaracion.total_gastos - totalDeducciones)
        });

        // Recalcular impuesto
        get().calcularImpuesto();
    },

    // Limpiar estado
    limpiarEstado: () => {
        set({
            declaracionActual: null,
            ingresos: [],
            deducciones: [],
            activosPasivos: [],
            resultadoCalculo: null,
            resultadoValidacion: null,
            error: null
        });
    }
}));
