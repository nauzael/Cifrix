import { useState, useEffect } from 'react';
import { Search, Edit, Trash2, User, Building, Plus, Merge } from 'lucide-react';
import { useExogenosStore } from '@/store/exogenosStore';
import { ThirdParty } from '@/lib/db';
import { toast } from '@/store/toastStore';
import { DuplicateResolver } from './DuplicateResolver';
import { ExogenosValidator } from '@/lib/exogenos';

interface ThirdPartyTableProps {
    organizationId: string;
}

export const ThirdPartyTable = ({ organizationId }: ThirdPartyTableProps) => {
    const { thirdParties, balanceLines, reportes, loading, cargarTerceros, actualizarTercero, eliminarTercero } = useExogenosStore();
    const [filter, setFilter] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<ThirdParty>>({});
    const [showDuplicates, setShowDuplicates] = useState(false);

    useEffect(() => {
        cargarTerceros(organizationId);
    }, [organizationId, cargarTerceros]);

    const filtered = thirdParties.filter(tp =>
        tp.nombre.toLowerCase().includes(filter.toLowerCase()) ||
        tp.nit.includes(filter)
    );

    const handleEdit = (tp: ThirdParty) => {
        setEditingId(tp.id);
        setEditForm(tp);
    };

    const handleSave = async () => {
        if (!editingId) return;
        await actualizarTercero(editingId, editForm);
        setEditingId(null);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Eliminar este tercero?')) {
            await eliminarTercero(id);
        }
    };

    const formatMoney = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

    return (
        <div className="bg-card rounded-2xl border border-border shadow-sm flex flex-col min-h-[500px]">
            {showDuplicates && <DuplicateResolver organizationId={organizationId} onClose={() => setShowDuplicates(false)} />}

            {/* Toolbar */}
            <div className="p-4 border-b border-border flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Buscar terceros..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-muted/50 border-none rounded-xl focus:ring-2 focus:ring-primary text-sm"
                    />
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setShowDuplicates(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-sm font-medium transition-colors"
                    >
                        <Merge className="size-4" />
                        Gestionar Duplicados
                    </button>
                    <button
                        onClick={() => toast.info('Funcionalidad en desarrollo: Crear nuevo tercero manualmente')}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                    >
                        <Plus className="size-4" />
                        Nuevo Tercero
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto flex-1">
                <table className="w-full text-left">
                    <thead className="bg-muted/50 sticky top-0 z-10 border-b border-border">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Nombre</th>
                            <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">NIT</th>
                            <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Saldo Balance</th>
                            <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Saldo Exógeno</th>
                            <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={6} className="px-6 py-4 h-16 bg-muted/5">
                                        <div className="h-4 bg-muted/20 rounded w-3/4 mb-2"></div>
                                        <div className="h-3 bg-muted/20 rounded w-1/2"></div>
                                    </td>
                                </tr>
                            ))
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={6} className="p-12 text-center text-muted-foreground">No se encontraron terceros</td></tr>
                        ) : (
                            filtered.map(tp => {
                                // Calcular saldos detallados
                                const nitTercero = ExogenosValidator.normalizeNit(tp.nit);

                                const lines = balanceLines.filter(l => ExogenosValidator.normalizeNit(l.nit_tercero) === nitTercero);
                                const currentReportes = reportes.filter(r => ExogenosValidator.normalizeNit(r.nit_contribuyente) === nitTercero);

                                const saldoBalance = lines.reduce((acc, l) => acc + (l.saldo || 0), 0);
                                const saldoExogeno = currentReportes.reduce((acc, r) => acc + (r.monto || 0), 0);

                                return (
                                    <tr key={tp.id} className="hover:bg-accent/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            {editingId === tp.id ? (
                                                <input
                                                    className="w-full p-1 border rounded bg-background text-sm font-medium"
                                                    value={editForm.nombre || ''}
                                                    onChange={e => setEditForm({ ...editForm, nombre: e.target.value })}
                                                    placeholder="Nombre del Tercero"
                                                />
                                            ) : (
                                                <div className="font-bold text-foreground text-sm text-balance">
                                                    {tp.nombre || <span className="text-muted-foreground italic">Sin nombre registrado</span>}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {editingId === tp.id ? (
                                                <input
                                                    className="w-full p-1 border rounded bg-background text-sm font-mono"
                                                    value={editForm.nit || ''}
                                                    onChange={e => setEditForm({ ...editForm, nit: e.target.value })}
                                                    placeholder="NIT"
                                                />
                                            ) : (
                                                <div className="font-mono text-sm text-foreground/80 bg-muted/30 px-2 py-1 rounded w-fit">
                                                    {tp.nit}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`text-sm font-bold font-mono ${saldoBalance < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                                                {formatMoney(saldoBalance)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`text-sm font-bold font-mono ${saldoExogeno !== saldoBalance ? 'text-amber-600' : 'text-slate-600'}`}>
                                                {formatMoney(saldoExogeno)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {editingId === tp.id ? (
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={handleSave} className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded text-xs font-bold hover:bg-emerald-100 border border-emerald-200">Guardar</button>
                                                    <button onClick={() => setEditingId(null)} className="px-2 py-1 bg-slate-50 text-slate-600 rounded text-xs font-bold hover:bg-slate-100 border border-slate-200">Cancelar</button>
                                                </div>
                                            ) : (
                                                <div className="flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleEdit(tp)} className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500 hover:text-blue-600 transition-colors">
                                                        <Edit className="size-4" />
                                                    </button>
                                                    <button onClick={() => handleDelete(tp.id)} className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500 hover:text-destructive transition-colors">
                                                        <Trash2 className="size-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
