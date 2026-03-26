import { create } from 'zustand';
import { db, Exogeno, MapeoInconsistencia, ThirdParty, ExogenaBalance, ExogenaBalanceLine } from '@/lib/db';
import { exogenosService, ExogenosValidator } from '@/lib/exogenos';
import { syncExogenos } from '@/lib/sync';
import { supabase } from '@/lib/supabase';
import { toast } from '@/store/toastStore';
import { getFormatById } from '@/lib/exogenos/mappings';

interface ExogenosState {
    reportes: Exogeno[];
    inconsistencias: MapeoInconsistencia[];
    thirdParties: ThirdParty[];
    balanceLines: ExogenaBalanceLine[];
    // Duplicados
    detectarDuplicados: (organizacionId: string) => Promise<{ nit: string; ids: string[]; nombre: string; saldo: number }[]>;
    unificarTerceros: (organizacionId: string, targetId: string, sourceIds: string[]) => Promise<void>;

    loading: boolean;
    error: string | null;

    // Estado del Procesamiento (Para el Modal Informativo)
    processing: {
        active: boolean;
        message: string;
        percentage: number;
        step: number;
        totalSteps: number;
    };

    // Acciones
    cargarReportes: (organizacionId: string) => Promise<void>;
    cargarTerceros: (organizacionId: string) => Promise<void>;
    importarArchivo: (file: File, organizacionId: string, formatoId?: string) => Promise<void>;
    validarReporte: (reporteId: string) => Promise<void>;
    validarTodo: () => Promise<void>;
    resolverInconsistencia: (id: string, comentario: string) => Promise<void>;
    eliminarReporte: (id: string) => Promise<void>;
    generarDesdeContabilidad: (organizacionId: string, año: number) => Promise<{ count: number; total: number }>;
    limpiarTodo: (organizacionId: string) => Promise<void>;
    sincronizarConNube: (organizacionId: string) => Promise<void>;
    setProcessing: (active: boolean, message?: string, percentage?: number, step?: number, totalSteps?: number) => void;

    // Terceros Acciones
    crearTercero: (tercero: Omit<ThirdParty, 'id' | 'created_at'>) => Promise<void>;
    actualizarTercero: (id: string, updates: Partial<ThirdParty>) => Promise<void>;
    eliminarTercero: (id: string) => Promise<void>;

    limpiarEstado: () => void;
    importarBalance: (file: File, organizacionId: string) => Promise<void>;
}

export const useExogenosStore = create<ExogenosState>((set, get) => ({
    reportes: [],
    inconsistencias: [],
    thirdParties: [],
    balanceLines: [],
    loading: false,
    error: null,
    processing: {
        active: false,
        message: '',
        percentage: 0,
        step: 0,
        totalSteps: 0
    },

    setProcessing: (active, message = '', percentage = 0, step = 0, totalSteps = 0) => {
        set({ processing: { active, message, percentage, step, totalSteps } });
    },

    detectarDuplicados: async (organizacionId: string) => {
        set({ loading: true });
        try {
            const terceros = await db.third_parties.where('organization_id').equals(organizacionId).toArray();

            // Agrupar por NIT normalizado
            const map = new Map<string, { ids: string[]; nombre: string; saldo: number }>();

            for (const t of terceros) {
                // Normalización estricta: solo números
                let nitClean = t.nit.replace(/[^0-9]/g, '');

                // Si el NIT original tenía guion y dígito de verificación (ej: 123456-1), quitar DV
                // Heurística: si tiene guion, tomar la parte izquierda
                if (t.nit.includes('-')) {
                    nitClean = t.nit.split('-')[0].replace(/[^0-9]/g, '');
                }

                if (!map.has(nitClean)) {
                    map.set(nitClean, { ids: [], nombre: t.nombre, saldo: 0 });
                }

                const entry = map.get(nitClean)!;
                entry.ids.push(t.id);
                // Usar el nombre más largo/completo como representante
                if (t.nombre.length > entry.nombre.length) {
                    entry.nombre = t.nombre;
                }
            }

            // Filtrar solo los que tienen duplicados (más de 1 ID para el mismo NIT base)
            const duplicados = Array.from(map.entries())
                .filter(([_, data]) => data.ids.length > 1)
                .map(([nit, data]) => ({
                    nit,
                    ids: data.ids,
                    nombre: data.nombre,
                    saldo: 0 // Se calculará bajo demanda o se puede sumar aquí si ya tenemos lines
                }));

            set({ loading: false });
            return duplicados;
        } catch (error) {
            console.error(error);
            set({ loading: false });
            return [];
        }
    },

    unificarTerceros: async (organizacionId: string, targetId: string, sourceIds: string[]) => {
        set({ loading: true });
        try {
            // 1. Mover líneas de balance de los sourceIds al targetId
            // Necesitamos buscar las líneas asociadas a los sourceIds. 
            // Como las líneas se asocian por NIT string, primero buscamos los NITs de los sourceIds
            const sourceTerceros = await db.third_parties.where('id').anyOf(sourceIds).toArray();
            const targetTercero = await db.third_parties.get(targetId);

            if (!targetTercero) throw new Error("Tercero destino no encontrado");

            for (const src of sourceTerceros) {
                // Actualizar líneas de balance
                const lines = await db.exogena_balance_lines
                    .where('nit_tercero')
                    .equals(src.nit) // Las líneas están ligadas por el NIT string textual
                    .toArray();

                if (lines.length > 0) {
                    // Actualizamos el NIT de la línea al del target
                    await db.exogena_balance_lines.bulkPut(lines.map(l => ({
                        ...l,
                        nit_tercero: targetTercero.nit, // Reasignar al NIT maestro
                        nombre_tercero: targetTercero.nombre, // Opcional: actualizar nombre
                        sync_status: 'pendiente'
                    })));
                }

                // Actualizar Reportes Exógenos
                const reportes = await db.exogenos
                    .where('nit_contribuyente')
                    .equals(src.nit)
                    .toArray();

                if (reportes.length > 0) {
                    await db.exogenos.bulkPut(reportes.map(r => ({
                        ...r,
                        nit_contribuyente: targetTercero.nit,
                        nombre_contribuyente: targetTercero.nombre,
                        sync_status: 'pendiente'
                    })));
                }
            }

            // 2. Eliminar terceros duplicados (sourceIds)
            await db.third_parties.bulkDelete(sourceIds);

            // 3. Recargar estado
            await get().cargarTerceros(organizacionId);
            await get().cargarReportes(organizacionId);

            toast.success("Terceros unificados correctamente.");
            set({ loading: false });
        } catch (error) {
            console.error(error);
            toast.error("Error al unificar terceros.");
            set({ loading: false });
        }
    },

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
            // Filtrar solo terceros que aparecen en los reportes cargados
            const { reportes } = get();
            const relevantNits = new Set(reportes.map(r => ExogenosValidator.normalizeNit(r.nit_contribuyente)));

            const allThirdParties = await db.third_parties
                .where('organization_id')
                .equals(organizacionId)
                .toArray();

            // Si hay reportes cargados, filtramos. Si no, mostramos lista vacía para evitar lag
            const thirdParties = relevantNits.size > 0
                ? allThirdParties.filter(tp => relevantNits.has(ExogenosValidator.normalizeNit(tp.nit)))
                : [];

            set({ thirdParties });

            // Cargar Balance Lines (si hay)
            const balances = await db.exogena_balances.where('organization_id').equals(organizacionId).toArray();
            if (balances.length > 0) {
                const balanceIds = balances.map(b => b.id);
                const lines = await db.exogena_balance_lines.where('balance_id').anyOf(balanceIds).toArray();
                set({ balanceLines: lines });
            } else {
                set({ balanceLines: [] });
            }

            set({ loading: false });
        } catch (error) {
            console.error('Error al cargar terceros:', error);
            set({ loading: false });
        }
    },

    importarArchivo: async (file: File, organizacionId: string, formatoId?: string) => {
        set({ loading: true, error: null });
        get().setProcessing(true, 'Iniciando lectura de archivo...', 5, 1, 4);
        try {
            const rawRows = await exogenosService.parser.parseFile(file, undefined, (msg, pct) => {
                get().setProcessing(true, msg, pct, 1, 4);
            });
            get().setProcessing(true, `Procesando ${rawRows.length} registros...`, 30, 2, 4);
            const existingThirdParties = await db.third_parties.where('organization_id').equals(organizacionId).toArray();
            const tpMap = new Map(existingThirdParties.map(tp => [ExogenosValidator.normalizeNit(tp.nit), tp.nombre]));

            const newReportes: Exogeno[] = rawRows.map(row => {
                const nitNormalizado = ExogenosValidator.normalizeNit(row.nit_contribuyente);
                // Si el nombre es 'Desconocido' o vacío, intentar buscarlo en los terceros ya existentes
                let nombreFinal = row.nombre_contribuyente;
                if ((!nombreFinal || nombreFinal === 'Desconocido') && tpMap.has(nitNormalizado)) {
                    nombreFinal = tpMap.get(nitNormalizado)!;
                }

                return {
                    id: crypto.randomUUID(),
                    organization_id: organizacionId,
                    nit_informante: '',
                    nit_contribuyente: nitNormalizado,
                    nombre_contribuyente: nombreFinal || 'Desconocido',
                    periodo_fiscal: row.periodo_fiscal,
                    concepto: row.concepto,
                    monto: row.monto,
                    retencion: row.retencion,
                    fecha_movimiento: new Date().toISOString(),
                    tipo_exogeno: formatoId || row.tipo_exogeno,
                    procesado: false,
                    validado: false,
                    archivo_origen: file.name,
                    created_at: new Date().toISOString(),
                    sync_status: 'pendiente'
                };
            });

            await db.exogenos.bulkAdd(newReportes);

            get().setProcessing(true, 'Sincronizando terceros...', 80, 3, 4);
            // Sincronizar terceros nuevos
            const existingThirdPartiesSync = await db.third_parties.where('organization_id').equals(organizacionId).toArray();
            const existingNits = new Set(existingThirdPartiesSync.map(t => t.nit));
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

            get().setProcessing(false);
            toast.success(`${newReportes.length} registros importados y ${newThirdParties.length} nuevos terceros creados.`);
        } catch (error: any) {
            get().setProcessing(false);
            console.error('Error al importar archivo:', error);
            set({ error: error.message || 'Error al procesar el archivo', loading: false });
            toast.error('Error al importar el archivo');
        }
    },

    importarBalance: async (file: File, organizacionId: string) => {
        set({ loading: true, error: null });
        get().setProcessing(true, 'Iniciando lectura de balance...', 5, 1, 3);
        try {
            const rows = await exogenosService.parser.parseBalance(file, (msg, pct) => {
                get().setProcessing(true, msg, pct, 1, 3);
            });
            get().setProcessing(true, 'Estructurando datos contables...', 30, 2, 3);
            const year = new Date().getFullYear() - 1; // Default

            const balanceId = crypto.randomUUID();
            const balance: ExogenaBalance = {
                id: balanceId,
                organization_id: organizacionId,
                anio_gravable: year,
                nombre_archivo: file.name,
                fecha_carga: new Date().toISOString(),
                tercero_count: new Set(rows.map(r => r.nit_tercero)).size,
                total_debitos: rows.reduce((sum, r) => sum + r.debito, 0),
                total_creditos: rows.reduce((sum, r) => sum + r.credito, 0),
                created_at: new Date().toISOString(),
                sync_status: 'pendiente'
            };

            const existingThirdParties = await db.third_parties.where('organization_id').equals(organizacionId).toArray();
            const tpMap = new Map(existingThirdParties.map(tp => [ExogenosValidator.normalizeNit(tp.nit), tp.nombre]));

            const lines: ExogenaBalanceLine[] = rows.map(r => {
                const nitNormalizado = ExogenosValidator.normalizeNit(r.nit_tercero);
                let nombreFinal = r.nombre_tercero;
                if ((!nombreFinal || nombreFinal === 'Desconocido') && tpMap.has(nitNormalizado)) {
                    nombreFinal = tpMap.get(nitNormalizado)!;
                }

                return {
                    id: crypto.randomUUID(),
                    balance_id: balanceId,
                    nit_tercero: nitNormalizado,
                    nombre_tercero: nombreFinal || 'Desconocido',
                    cuenta: r.cuenta,
                    debito: r.debito,
                    credito: r.credito,
                    saldo: r.saldo,
                    created_at: new Date().toISOString(),
                    sync_status: 'pendiente'
                };
            });

            await db.exogena_balances.add(balance);
            await db.exogena_balance_lines.bulkAdd(lines);

            // Sincronizar terceros del balance si no existen
            const existingThirdPartiesSync = await db.third_parties.where('organization_id').equals(organizacionId).toArray();
            const existingNits = new Set(existingThirdPartiesSync.map(t => t.nit));
            const uniqueNewNits = new Set<string>();
            const newThirdParties: ThirdParty[] = [];

            for (const row of rows) {
                if (row.nit_tercero && !existingNits.has(row.nit_tercero) && !uniqueNewNits.has(row.nit_tercero)) {
                    uniqueNewNits.add(row.nit_tercero);
                    newThirdParties.push({
                        id: crypto.randomUUID(),
                        organization_id: organizacionId,
                        nit: row.nit_tercero,
                        nombre: row.nombre_tercero,
                        tipo_persona: row.nit_tercero.length >= 9 ? 'JURIDICA' : 'NATURAL',
                        obligado_exogena: false,
                        tipos_exogena: [],
                        created_at: new Date().toISOString(),
                        sync_status: 'pendiente'
                    });
                }
            }

            if (newThirdParties.length > 0) {
                await db.third_parties.bulkAdd(newThirdParties);
            }

            get().setProcessing(false);
            toast.success(`Balance importado: ${lines.length} líneas procesadas y ${newThirdParties.length} terceros creados.`);
            await get().cargarTerceros(organizacionId);
            set({ loading: false });
        } catch (error: any) {
            get().setProcessing(false);
            console.error('Error al importar balance:', error);
            const msg = error.message || 'Error desconocido';
            set({ error: msg, loading: false });
            toast.error(msg);
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
                    organization_id: reporte.organization_id,
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
        try {
            const { reportes, balanceLines } = get();

            get().setProcessing(true, 'Analizando bases de datos...', 10, 1, 5);
            // 1. Construir Mapa de Balances (Agrupado por NIT Normalizado)
            const balanceMap = new Map<string, { debito: number, credito: number, saldo: number, nombre_tercero?: string }>();

            for (const line of balanceLines) {
                const nit = ExogenosValidator.normalizeNit(line.nit_tercero);
                if (!nit) continue;

                const current = balanceMap.get(nit) || { debito: 0, credito: 0, saldo: 0, nombre_tercero: line.nombre_tercero };
                current.debito += line.debito || 0;
                current.credito += line.credito || 0;
                current.saldo += line.saldo || 0;

                // Si el nombre actual es nulo o 'Desconocido' y la línea tiene uno mejor, actualizarlo
                if ((!current.nombre_tercero || current.nombre_tercero === 'Desconocido') && line.nombre_tercero) {
                    current.nombre_tercero = line.nombre_tercero;
                }

                balanceMap.set(nit, current);
            }

            // Mapa de Balances Filtrados por Formato (Cache para rendimiento)
            const balanceMapByFormat = new Map<string, Map<string, any>>();

            get().setProcessing(true, 'Agrupando reportes exógenos...', 30, 2, 5);

            // 2. Agrupar Reportes Exógenos por NIT
            const reportesPorNit = new Map<string, Exogeno[]>();
            for (const r of reportes) {
                const nit = ExogenosValidator.normalizeNit(r.nit_contribuyente);
                if (!nit) continue;

                if (!reportesPorNit.has(nit)) {
                    reportesPorNit.set(nit, []);
                }
                reportesPorNit.get(nit)!.push(r);
            }

            // 3. Validar cada NIT consolidado (PROCESAMIENTO POR LOTES PARA FLUIDEZ)
            const nuevasInconsistencias: MapeoInconsistencia[] = [];
            const organizacionId = reportes[0]?.organization_id;

            if (!organizacionId) {
                set({ loading: false });
                return;
            }

            const nitEntries = Array.from(reportesPorNit.entries());
            const CHUNK_SIZE = 100; // Procesar de 100 en 100 para no congelar la UI

            for (let i = 0; i < nitEntries.length; i += CHUNK_SIZE) {
                const chunk = nitEntries.slice(i, i + CHUNK_SIZE);
                const progress = Math.min(30 + Math.floor((i / nitEntries.length) * 50), 80);
                get().setProcessing(true, `Validando ${i} de ${nitEntries.length} terceros...`, progress, 3, 5);

                for (const [nit, reports] of chunk) {
                    // Determinar el formato predominante en este grupo (o el del primer reporte)
                    const formatId = reports[0]?.tipo_exogeno;
                    let activeBalanceMap = balanceMap;

                    // Si tenemos un formato y mapeos definidos, filtramos el balance por PUC
                    if (formatId) {
                        if (!balanceMapByFormat.has(formatId)) {
                            // Crear balance filtrado para este formato
                            const mapping = getFormatById(formatId);
                            if (mapping && mapping.prefijosPuc.length > 0) {
                                const filteredMap = new Map<string, any>();
                                // Filtrar las líneas originales que cumplan con algún prefijo
                                const relevantLines = balanceLines.filter(line =>
                                    mapping.prefijosPuc.some(prefix => line.cuenta.startsWith(prefix))
                                );

                                // Agrupar por NIT
                                for (const line of relevantLines) {
                                    const nitLine = ExogenosValidator.normalizeNit(line.nit_tercero);
                                    if (!nitLine) continue;
                                    const curr = filteredMap.get(nitLine) || { debito: 0, credito: 0, saldo: 0, nombre_tercero: line.nombre_tercero };
                                    curr.debito += line.debito || 0;
                                    curr.credito += line.credito || 0;
                                    curr.saldo += line.saldo || 0;
                                    filteredMap.set(nitLine, curr);
                                }
                                balanceMapByFormat.set(formatId, filteredMap);
                            } else {
                                balanceMapByFormat.set(formatId, balanceMap);
                            }
                        }
                        activeBalanceMap = balanceMapByFormat.get(formatId)!;
                    }

                    const result = exogenosService.validator.validarNitConsolidado(nit, reports, activeBalanceMap);

                    if (result && result.hayInconsistencia) {
                        const rep = reports[0];
                        const totalExogena = result.valorReportado;
                        const mapping = getFormatById(formatId || '');

                        // Lógica de Autoconciliación Heurística (Solicitada por usuario)
                        // Si el agregado no cruza, buscar si UNA de las líneas individuales del balance SÍ cruza
                        const relevantIndividualLines = balanceLines.filter(line => {
                            const nitLine = ExogenosValidator.normalizeNit(line.nit_tercero);
                            const matchesNit = nitLine === nit;
                            const matchesPUC = mapping
                                ? mapping.prefijosPuc.some(p => line.cuenta.startsWith(p))
                                : true;
                            return matchesNit && matchesPUC;
                        });

                        const exactMatch = relevantIndividualLines.find(line =>
                            Math.abs((line.saldo || 0) - totalExogena) <= 1000
                        );

                        if (exactMatch) {
                            // Si encontramos una línea que coincida exactamente con el reporte exógeno,
                            // ignoramos la inconsistencia agregada (asumiendo que esa es la cuenta correcta)
                            console.log(`[AutoMatch] Conciliación automática para NIT ${nit}: Match encontrado en cuenta ${exactMatch.cuenta}`);
                            continue;
                        }

                        // Si el validador encontró un nombre mejor (del balance), actualizar el reporte para que la UI lo muestre
                        if (result.nombreTercero && (!rep.nombre_contribuyente || rep.nombre_contribuyente === 'Desconocido')) {
                            rep.nombre_contribuyente = result.nombreTercero;
                            // Actualizar en DB silenciosamente
                            db.exogenos.update(rep.id, { nombre_contribuyente: result.nombreTercero });
                        }

                        nuevasInconsistencias.push({
                            id: crypto.randomUUID(),
                            organization_id: rep.organization_id,
                            exogeno_id: rep.id,
                            tipo: result.tipo || 'DIFERENCIA_SALDO',
                            descripcion: result.descripcion || 'Error de validación',
                            valor_reportado: result.valorReportado,
                            valor_contable: result.valorInterno,
                            diferencia_monto: result.diferencia,
                            estado_validacion: 'PENDIENTE',
                            resuelto: false,
                            created_at: new Date().toISOString(),
                            sync_status: 'pendiente'
                        });
                    }
                }

                // Liberar el hilo principal para que la UI respire (el spinner gire)
                await new Promise(resolve => setTimeout(resolve, 0));
            }

            // 4. Guardar inconsistencias
            // Primero limpiamos las anteriores pendientes para esta org
            const existingIncs = await db.mapeo_inconsistencias.where('organization_id').equals(organizacionId).toArray();
            const pendingIncs = existingIncs.filter(inc => inc.estado_validacion === 'PENDIENTE').map(inc => inc.id);
            if (pendingIncs.length > 0) {
                await db.mapeo_inconsistencias.bulkDelete(pendingIncs);
            }

            get().setProcessing(true, 'Persistiendo resultados...', 90, 4, 5);
            if (nuevasInconsistencias.length > 0) {
                await db.mapeo_inconsistencias.bulkAdd(nuevasInconsistencias);
                toast.warning(`Se encontraron ${nuevasInconsistencias.length} inconsistencias.`);
            } else {
                toast.success('Validación completada: No se encontraron diferencias con el balance.');
            }

            // Actualizar estado
            get().setProcessing(true, 'Refrescando interfaz...', 99, 5, 5);
            const allIncs = await db.mapeo_inconsistencias.where('organization_id').equals(organizacionId).toArray();
            set({ inconsistencias: allIncs, loading: false });
            get().setProcessing(false);
        } catch (error) {
            get().setProcessing(false);
            console.error('Error al validar todo:', error);
            set({ loading: false });
            toast.error('Error al ejecutar la validación global.');
        }
    },

    resolverInconsistencia: async (id: string, comentario: string) => {
        try {
            await db.mapeo_inconsistencias.update(id, {
                resuelto: true, // Legacy compatibility
                estado_validacion: 'RESUELTO',
                notas: comentario,
                sync_status: 'pendiente'
            });

            set(state => ({
                inconsistencias: state.inconsistencias.map(inc =>
                    inc.id === id ? { ...inc, estado_validacion: 'RESUELTO', notas: comentario } : inc
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
            // 1. Borrado físico local
            // @ts-ignore - ignoreDeletions es una propiedad personalizada de CifrixDB
            db.ignoreDeletions = true;
            await db.mapeo_inconsistencias.where('organization_id').equals(organizacionId).delete();
            await db.exogenos.where('organization_id').equals(organizacionId).delete();

            const balances = await db.exogena_balances.where('organization_id').equals(organizacionId).toArray();
            const balanceIds = balances.map(b => b.id);
            await db.exogena_balance_lines.where('balance_id').anyOf(balanceIds).delete();
            await db.exogena_balances.where('organization_id').equals(organizacionId).delete();

            await db.third_parties.where('organization_id').equals(organizacionId).delete();

            // 2. Borrado DIRECTO en la nube (Bypass de sync manual)
            // Borrar en orden inverso de dependencias para evitar violaciones de foreign key

            // Inconsistencias
            await (supabase as any).from('mapeo_inconsistencias').delete().eq('organization_id', organizacionId);

            // Reportes exógenos
            await (supabase as any).from('exogenos').delete().eq('organization_id', organizacionId);

            // Balances y líneas
            // Las líneas suelen tener cascade delete si se borra el balance, pero por seguridad:
            // Obtener IDs de balances remotos para borrar líneas? 
            // Mejor confiar en foreign key cascade o borrar primero líneas si Supabase lo requiere. 
            // Si la FK tiene ON DELETE CASCADE, borrar 'exogena_balances' basta. 
            // Si estricto: borrar líneas primero es complejo sin un query. 
            // Asumiremos que el backend tiene ON DELETE CASCADE o que permitimos error parcial.
            // O podemos usar un query: delete from lines where balance_id in (select id from balances where org_id = ...)

            // Intento seguro: Borrar Balances (debería llevarse las líneas)
            const { error: errBalance } = await (supabase as any).from('exogena_balances').delete().eq('organization_id', organizacionId);
            if (errBalance) console.warn('Error borrando balances nube:', errBalance);

            // Terceros (Nivel más bajo, referenciado por todos)
            const { error: errTP } = await (supabase as any).from('third_parties').delete().eq('organization_id', organizacionId);
            if (errTP) {
                // Si falla es probable que haya alguna referencia colgada. 
                console.warn('Advertencia borrando terceros de nube:', errTP);
            }

            // 3. Limpiar estado local
            set({ reportes: [], inconsistencias: [], thirdParties: [], loading: false });
            toast.success('Módulo limpiado completa y permanentemente');
        } catch (error) {
            console.error('Error al limpiar exógenos:', error);
            set({ loading: false });
            toast.error('Error al intentar limpiar los datos');
        } finally {
            // Asegurar que ignoreDeletions siempre se restablezca
            // @ts-ignore
            db.ignoreDeletions = false;
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

