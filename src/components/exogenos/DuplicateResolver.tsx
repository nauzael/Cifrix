import { useState, useEffect } from 'react';
import { useExogenosStore } from '@/store/exogenosStore';
import { ThirdParty } from '@/lib/db';
import { Users, ArrowRight, Merge, AlertTriangle, X as CloseIcon } from 'lucide-react';
// Local formatMoney to avoid import errors
const formatMoney = (val: number) => new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
}).format(val);
import { toast } from '@/store/toastStore';

// Simple Button component since @/components/ui/button doesn't exist
const Button = ({ children, variant = 'default', size = 'default', className = '', ...props }: any) => {
    const baseStyles = "inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-all active:scale-95 disabled:pointer-events-none disabled:opacity-50";

    const variants: any = {
        default: "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90",
        outline: "border border-border bg-background hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    };

    const sizes: any = {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
    };

    const variantStyle = variants[variant] || variants.default;
    const sizeStyle = sizes[size] || sizes.default;

    return (
        <button className={`${baseStyles} ${variantStyle} ${sizeStyle} ${className}`} {...props}>
            {children}
        </button>
    );
};

interface DuplicateGroup {
    nit: string;
    ids: string[];
    nombre: string;
    saldo: number;
}

export function DuplicateResolver({ organizationId, onClose }: { organizationId: string; onClose: () => void }) {
    const { detectarDuplicados, unificarTerceros, thirdParties, balanceLines } = useExogenosStore();
    const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedGroup, setSelectedGroup] = useState<DuplicateGroup | null>(null);
    const [targetId, setTargetId] = useState<string | null>(null);

    useEffect(() => {
        loadDuplicates();
    }, [organizationId]);

    const loadDuplicates = async () => {
        setLoading(true);
        const dups = await detectarDuplicados(organizationId);
        setDuplicates(dups);
        setLoading(false);
    };

    const handleResolve = async () => {
        if (!selectedGroup || !targetId) return;

        const sourceIds = selectedGroup.ids.filter(id => id !== targetId);

        if (confirm(`¿Estás seguro de unificar ${sourceIds.length} registros en el tercero seleccionado? Esta acción no se puede deshacer.`)) {
            await unificarTerceros(organizationId, targetId, sourceIds);

            // Remove resolved group
            setDuplicates(prev => prev.filter(d => d.nit !== selectedGroup.nit));
            setSelectedGroup(null);
            setTargetId(null);
        }
    };

    const getThirdPartyDetails = (id: string) => {
        const tp = thirdParties.find(t => t.id === id);
        if (!tp) return null;

        // Calculate balance for this specific third party record
        // Note: In the store, balanceLines are linked by NIT string. 
        // If we have multiple TPs with same/similar NITs, they might share lines if the NIT string is IDENTICAL.
        // But here we are dealing with duplicates that might have slight variations or same NIT but different IDs.
        // The robust way is filtering lines by the exact NIT string of this TP.
        const lines = balanceLines.filter(l => l.nit_tercero === tp.nit);
        const saldo = lines.reduce((acc, l) => acc + (l.saldo || 0), 0);

        return { ...tp, saldo };
    };

    if (loading) return <div className="p-8 text-center">Buscando duplicados...</div>;

    if (duplicates.length === 0) {
        return (
            <div className="p-8 text-center flex flex-col items-center gap-4">
                <div className="bg-emerald-100 p-4 rounded-full">
                    <Users className="size-8 text-emerald-600" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-emerald-900">¡Todo limpio!</h3>
                    <p className="text-emerald-700">No se encontraron terceros duplicados por NIT.</p>
                </div>
                <Button onClick={onClose} variant="outline">Cerrar</Button>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-background rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b flex justify-between items-center bg-muted/30">
                    <div className="flex items-center gap-3">
                        <div className="bg-amber-100 p-2 rounded-lg">
                            <Merge className="size-5 text-amber-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Unificar Duplicados</h2>
                            <p className="text-muted-foreground text-sm">Se encontraron {duplicates.length} grupos de terceros con NITs similares.</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <CloseIcon className="size-5" />
                    </Button>
                </div>

                <div className="flex-1 overflow-hidden flex">
                    {/* Sidebar List */}
                    <div className="w-1/3 border-r overflow-y-auto bg-muted/10">
                        {duplicates.map((group) => (
                            <button
                                key={group.nit}
                                onClick={() => { setSelectedGroup(group); setTargetId(null); }}
                                className={`w-full text-left p-4 border-b hover:bg-muted/50 transition-colors ${selectedGroup?.nit === group.nit ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
                            >
                                <div className="font-mono font-bold text-sm text-primary mb-1">{group.nit}</div>
                                <div className="text-xs text-muted-foreground">{group.ids.length} registros encontrados</div>
                                <div className="font-medium text-sm truncate">{group.nombre}</div>
                            </button>
                        ))}
                    </div>

                    {/* Detail View */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {selectedGroup ? (
                            <div className="space-y-6">
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 text-amber-800 text-sm">
                                    <AlertTriangle className="size-5 shrink-0" />
                                    <p>Selecciona el <strong>Tercero Principal</strong>. Los demás registros serán eliminados y su información (saldos, reportes) se moverá al principal.</p>
                                </div>

                                <div className="space-y-3">
                                    {selectedGroup.ids.map(id => {
                                        const tp = getThirdPartyDetails(id);
                                        if (!tp) return null;
                                        const isSelected = targetId === id;

                                        return (
                                            <div
                                                key={id}
                                                onClick={() => setTargetId(id)}
                                                className={`relative border rounded-lg p-4 cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary border-primary bg-primary/5' : 'hover:border-primary/50'}`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="font-bold text-lg">{tp.nombre}</div>
                                                        <div className="font-mono text-sm text-muted-foreground bg-muted inline-block px-2 rounded mt-1">{tp.nit}</div>
                                                        <div className="text-xs text-muted-foreground mt-1">ID: {tp.id.substring(0, 8)}...</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xs text-muted-foreground uppercase font-bold">Saldo Actual</div>
                                                        <div className={`font-mono font-bold text-lg ${tp.saldo < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                                                            {formatMoney(tp.saldo)}
                                                        </div>
                                                    </div>
                                                </div>
                                                {isSelected && (
                                                    <div className="absolute top-4 right-4 bg-primary text-primary-foreground rounded-full p-1">
                                                        <ArrowRight className="size-4" />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                                <Merge className="size-16 mb-4" />
                                <p>Selecciona un grupo para resolver</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t bg-muted/30 flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button
                        disabled={!selectedGroup || !targetId}
                        onClick={handleResolve}
                        className="bg-primary text-primary-foreground"
                    >
                        Unificar Terceros
                    </Button>
                </div>
            </div>
        </div>
    );
}

