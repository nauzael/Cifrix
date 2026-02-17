import { useState, useEffect } from 'react';
import { Search, Edit, Trash2, User, Building, Plus } from 'lucide-react';
import { useExogenosStore } from '@/store/exogenosStore';
import { ThirdParty } from '@/lib/db';
import { toast } from '@/store/toastStore';

interface ThirdPartyTableProps {
    organizationId: string;
}

export const ThirdPartyTable = ({ organizationId }: ThirdPartyTableProps) => {
    const { thirdParties, loading, cargarTerceros, actualizarTercero, eliminarTercero } = useExogenosStore();
    const [filter, setFilter] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<ThirdParty>>({});

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

    return (
        <div className="bg-card rounded-2xl border border-border shadow-sm flex flex-col min-h-[500px]">
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
                <button
                    onClick={() => toast.info('Funcionalidad en desarrollo: Crear nuevo tercero manualmente')}
                >
                    <Plus className="size-4" />
                    Nuevo Tercero
                </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto flex-1">
                <table className="w-full text-left">
                    <thead className="bg-muted/50 sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Tercero</th>
                            <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Tipo</th>
                            <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">Obligado Exógena</th>
                            <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {loading ? (
                            <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Cargando terceros...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No se encontraron terceros</td></tr>
                        ) : (
                            filtered.map(tp => (
                                <tr key={tp.id} className="hover:bg-accent/50 transition-colors">
                                    <td className="px-6 py-4">
                                        {editingId === tp.id ? (
                                            <div className="space-y-2">
                                                <input
                                                    className="w-full p-1 border rounded"
                                                    value={editForm.nombre}
                                                    onChange={e => setEditForm({ ...editForm, nombre: e.target.value })}
                                                />
                                                <input
                                                    className="w-full p-1 border rounded text-xs"
                                                    value={editForm.nit}
                                                    onChange={e => setEditForm({ ...editForm, nit: e.target.value })}
                                                />
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="font-bold text-foreground text-sm">{tp.nombre}</div>
                                                <div className="text-muted-foreground text-xs font-medium uppercase tracking-tight">{tp.nit}</div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {tp.tipo_persona === 'JURIDICA' ? <Building className="size-4 text-blue-500" /> : <User className="size-4 text-emerald-500" />}
                                            <span className="text-xs font-medium">{tp.tipo_persona}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {editingId === tp.id ? (
                                            <input
                                                type="checkbox"
                                                checked={editForm.obligado_exogena}
                                                onChange={e => setEditForm({ ...editForm, obligado_exogena: e.target.checked })}
                                            />
                                        ) : (
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${tp.obligado_exogena ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {tp.obligado_exogena ? 'SI' : 'NO'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {editingId === tp.id ? (
                                            <div className="flex justify-end gap-2">
                                                <button onClick={handleSave} className="text-emerald-600 font-bold text-xs hover:underline">Guardar</button>
                                                <button onClick={() => setEditingId(null)} className="text-slate-500 font-bold text-xs hover:underline">Cancelar</button>
                                            </div>
                                        ) : (
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleEdit(tp)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-blue-600 transition-colors">
                                                    <Edit className="size-4" />
                                                </button>
                                                <button onClick={() => handleDelete(tp.id)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-red-600 transition-colors">
                                                    <Trash2 className="size-4" />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
