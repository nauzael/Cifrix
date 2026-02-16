import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Account } from '../../lib/db';
import { useAuthStore } from '../../store/authStore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, FolderTree, ChevronRight, Loader2, Tag } from 'lucide-react';
import { UNIVERSAL_PUC } from '../../lib/pucTemplates';
import { logActivity } from '../../lib/audit';
import { SearchableSelect } from '../ui/SearchableSelect';
import PUC_MD from '../../../.documentacion/PUC.md?raw';
import { Modal } from '../ui/Modal';
import { toast } from '../../store/toastStore';
import { confirm } from '../../store/confirmStore';
import { deleteRecord } from '../../lib/dbOperations';

const accountSchema = z.object({
  code: z.string().min(1, 'El código es requerido'),
  name: z.string().min(1, 'El nombre es requerido'),
  type: z.enum(['ACTIVO', 'PASIVO', 'PATRIMONIO', 'INGRESO', 'EGRESO']),
  nature: z.enum(['DEBITO', 'CREDITO']),
  accepts_movement: z.boolean(),
  parent_id: z.string().nullable(),
});

type AccountFormData = z.infer<typeof accountSchema>;

interface PUCManagerProps {
  organizationId: string;
}

export function PUCManager({ organizationId }: PUCManagerProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [orgId, setOrgId] = useState<string>(organizationId);
  const { user } = useAuthStore();
  const [query, setQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState<Account | null>(null);

  useEffect(() => {
    setOrgId(organizationId);
  }, [organizationId]);

  const accounts = useLiveQuery(
    () => (orgId ? db.accounts.where('organization_id').equals(orgId).sortBy('code') : []),
    [orgId]
  );

  const { register, handleSubmit, reset, setValue, formState: { errors }, watch } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      type: 'ACTIVO',
      nature: 'DEBITO',
      accepts_movement: true,
      parent_id: null,
    }
  });

  const catalog = useMemo(() => {
    const lines = (PUC_MD || '').split(/\r?\n/);
    const entries: Array<{ code: string; name: string; type: Account['type']; nature: Account['nature']; accepts_movement: boolean }> = [];
    const typeMap: Record<string, Account['type']> = {
      '1': 'ACTIVO', '2': 'PASIVO', '3': 'PATRIMONIO', '4': 'INGRESO', '5': 'EGRESO', '6': 'EGRESO', '7': 'EGRESO', '8': 'ACTIVO', '9': 'PASIVO'
    };
    const natureByType: Record<Account['type'], Account['nature']> = {
      ACTIVO: 'DEBITO', PASIVO: 'CREDITO', PATRIMONIO: 'CREDITO', INGRESO: 'CREDITO', EGRESO: 'DEBITO'
    };
    for (const raw of lines) {
      const m = raw.match(/^\s*(\d{1,6})\s+(.+)$/);
      if (!m) continue;
      const code = m[1];
      let name = m[2].trim().replace(/<[^>]+>/g, '').trim();
      if (/^\s*a\s+\d+/.test(name)) continue;
      const t = typeMap[code[0]];
      if (!t) continue;
      const nature: Account['nature'] = natureByType[t];
      const accepts = code.length >= 6;
      entries.push({ code, name, type: t, nature, accepts_movement: accepts });
    }
    return entries;
  }, []);

  const filteredCatalog = useMemo(() => {
    if (!selectedParent) return catalog;
    const pref = selectedParent.code;
    return catalog.filter(c => c.code.startsWith(pref) && c.code.length > pref.length);
  }, [catalog, selectedParent]);

  const codeOptions = useMemo(() => {
    return filteredCatalog.map(c => ({
      value: c.code,
      label: `${c.code} - ${c.name}`,
      type: c.type,
      nature: c.nature,
      accepts_movement: c.accepts_movement,
      name: c.name
    }));
  }, [filteredCatalog]);

  const nameOptions = useMemo(() => {
    return filteredCatalog.map(c => ({
      value: c.name,
      label: `${c.name} (${c.code})`,
      type: c.type,
      nature: c.nature,
      accepts_movement: c.accepts_movement,
      code: c.code
    }));
  }, [filteredCatalog]);

  const onSubmit = async (data: AccountFormData) => {
    if (!orgId) return;
    try {
      await db.accounts.add({
        id: uuidv4(),
        organization_id: orgId,
        code: data.code,
        name: data.name,
        type: data.type,
        nature: data.nature,
        level: data.code.length,
        accepts_movement: data.accepts_movement,
        parent_id: data.parent_id === "" ? null : data.parent_id,
        created_at: new Date().toISOString(),
        sync_status: 'pendiente'
      });
      setIsModalOpen(false);
      reset();
      toast.success('Cuenta guardada exitosamente');
    } catch (error) {
      toast.error('Error al crear la cuenta. Verifique que el código no exista.');
    }
  };

  const deleteAccount = async (id: string) => {
    const hasEntries = await db.journal_entries.where('account_id').equals(id).count() > 0;

    if (hasEntries) {
      toast.error('No se puede eliminar esta cuenta porque ya tiene movimientos contables registrados.');
      return;
    }

    confirm({
      title: 'Eliminar Cuenta',
      message: '¿Está seguro de eliminar esta cuenta?',
      confirmText: 'Eliminar',
      type: 'danger',
      onConfirm: async () => {
        try {
          await deleteRecord('accounts', id);
          toast.success('Cuenta eliminada correctamente.');
        } catch (error) {
          toast.error('Error al eliminar la cuenta.');
        }
      }
    });
  };

  const clearPUC = async () => {
    if (!orgId) return;
    confirm({
      title: 'Limpiar PUC',
      message: '¿Está seguro de eliminar TODO el Plan Único de Cuentas? Esta acción no se puede deshacer.',
      confirmText: 'Limpiar Todo',
      type: 'danger',
      onConfirm: async () => {
        try {
          const accountsToDelete = await db.accounts.where('organization_id').equals(orgId).toArray();
          await db.transaction('rw', db.accounts, db.deleted_records, async () => {
            for (const acc of accountsToDelete) {
              await db.accounts.delete(acc.id);
            }
          });
          toast.success('PUC limpiado correctamente.');
        } catch (error) {
          console.error('Error clearing PUC:', error);
          toast.error('Error al limpiar el PUC.');
        }
      }
    });
  };

  const seedPUC = async () => {
    if (!orgId) return;
    try {
      const existing = await db.accounts.where('organization_id').equals(orgId).count();
      if (existing > 0) {
        confirm({
          title: 'Cargar PUC Universal',
          message: 'Ya existen cuentas en el PUC. ¿Desea agregar las cuentas base universales?',
          confirmText: 'Agregar',
          type: 'warning',
          onConfirm: performSeed
        });
        return;
      }
      performSeed();
    } catch (error) {
      toast.error('Error al cargar el PUC universal.');
    }
  };

  const performSeed = async () => {
    try {
      await db.transaction('rw', db.accounts, async () => {
        for (const item of UNIVERSAL_PUC) {
          await db.accounts.add({
            id: uuidv4(),
            organization_id: orgId,
            code: item.code,
            name: item.name,
            type: item.type,
            nature: item.nature,
            level: item.code.length,
            accepts_movement: item.accepts_movement,
            parent_id: null,
            created_at: new Date().toISOString(),
            sync_status: 'pendiente'
          });
        }
      });
      toast.success('PUC universal cargado correctamente.');
    } catch (error) {
      toast.error('Error al cargar el PUC universal.');
    }
  };

  const renderTree = (parentId: string | null = null, depth = 0) => {
    const q = query.trim().toLowerCase();
    const nodes = accounts?.filter(acc => acc.parent_id === parentId && (q ? (acc.code.includes(q) || acc.name.toLowerCase().includes(q)) : true)) || [];

    return nodes.map(node => {
      const hasChildren = accounts?.some(acc => acc.parent_id === node.id);
      const isExpanded = q ? true : !!expanded[node.id];

      return (
        <div key={node.id} className="select-none">
          <div
            className={`flex flex-col sm:flex-row sm:items-center gap-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/50 px-4 rounded-2xl transition-all group ${depth > 0 ? 'ml-8 relative before:absolute before:left-[-15px] before:top-1/2 before:w-4 before:h-[1px] before:bg-slate-200 dark:before:bg-slate-800' : ''}`}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                onClick={() => setExpanded(prev => ({ ...prev, [node.id]: !prev[node.id] }))}
                className={`p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg shadow-sm transition-transform shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
              >
                {hasChildren ? <ChevronRight size={14} className="text-slate-400" /> : <div className="size-[14px]" />}
              </button>

              <span className={`font-mono text-xs font-black min-w-[70px] ${node.level === 1 ? 'text-blue-600' : 'text-slate-500'
                }`}>
                {node.code}
              </span>

              <span className={`text-sm truncate tracking-tight font-bold ${node.level === 1 ? 'uppercase text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                {node.name}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${node.nature === 'DEBITO' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                }`}>
                {node.nature}
              </span>
              {!node.accepts_movement && (
                <span className="text-[9px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">GRUPO</span>
              )}
              <button
                onClick={() => {
                  setSelectedParent(node);
                  reset({ code: node.code, type: node.type, nature: node.nature, accepts_movement: true, parent_id: node.id, name: '' });
                  setIsModalOpen(true);
                }}
                className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 transition-all active:scale-95"
                title="Nueva subcuenta"
              >
                <Plus size={16} />
              </button>
              <button
                onClick={() => deleteAccount(node.id)}
                className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 transition-all active:scale-95"
                title="Eliminar"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          {isExpanded && renderTree(node.id, depth + 1)}
        </div>
      );
    });
  };

  if (!orgId) return (
    <div className="flex flex-col items-center justify-center py-32 space-y-4">
      <div className="size-16 border-4 border-blue-500/20 border-t-blue-600 rounded-full animate-spin" />
      <p className="text-slate-400 font-bold animate-pulse">Cargando estructura PUC...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Estructura Contable (PUC)</h3>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Organización de cuentas y niveles</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <button
            onClick={clearPUC}
            className="flex-1 lg:flex-none text-[11px] font-black uppercase tracking-widest bg-red-50 dark:bg-red-900/10 text-red-600 hover:bg-red-100 px-5 py-3 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Trash2 size={16} /> Limpiar
          </button>
          <button
            onClick={seedPUC}
            className="flex-1 lg:flex-none text-[11px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 px-5 py-3 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <FolderTree size={16} /> Cargar Universal
          </button>
          <button
            onClick={() => {
              setSelectedParent(null);
              reset({ type: 'ACTIVO', nature: 'DEBITO', accepts_movement: true, parent_id: null, code: '', name: '' });
              setIsModalOpen(true);
            }}
            className="flex-[2] lg:flex-none text-[11px] font-black uppercase tracking-widest bg-blue-600 text-white shadow-xl shadow-blue-600/20 hover:bg-blue-700 px-8 py-3 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Nueva Cuenta
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden min-h-[500px] flex flex-col">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-800/10 backdrop-blur-sm">
          <div className="relative max-w-2xl">
            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por código (ej: 1105) o nombre de la cuenta..."
              className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all dark:text-white shadow-inner"
            />
          </div>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {accounts && accounts.length > 0 ? (
            <div className="space-y-1">
              {renderTree()}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="size-20 bg-slate-100 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center text-slate-400">
                <FolderTree size={40} />
              </div>
              <p className="text-slate-400 font-bold max-w-sm">No se han encontrado cuentas registradas. Inicie cargando el Plan Único de Cuentas Universal.</p>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedParent ? 'Nueva subcuenta' : 'Nueva cuenta contable'}
        subtitle={selectedParent ? `Nivel inferior de ${selectedParent.code}` : 'Configuración de cuenta principal'}
        icon={Plus}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {selectedParent && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-800/50 flex items-center gap-4">
              <div className="size-10 bg-blue-600 text-white rounded-xl shadow-lg flex items-center justify-center font-black">P</div>
              <div>
                <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Cuenta superior</p>
                <p className="text-sm font-black text-slate-900 dark:text-white font-mono">{selectedParent.code} — {selectedParent.name}</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2 group">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">Código de cuenta</label>
              <div className="grid gap-3">
                <input
                  {...register('code')}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all font-mono"
                  placeholder="Ej: 110505"
                  autoFocus
                />
                <SearchableSelect
                  options={codeOptions}
                  value={codeOptions.find(o => o.value === watch('code'))?.value}
                  onChange={(val) => {
                    const opt = codeOptions.find(o => o.value === val);
                    if (!opt) return;
                    setValue('code', val);
                    setValue('name', opt.name);
                    setValue('type', opt.type);
                    setValue('nature', opt.nature);
                    setValue('accepts_movement', opt.accepts_movement);
                  }}
                  placeholder="Sugerencias del catálogo contable..."
                  size="lg"
                  className="rounded-2xl border-slate-200 dark:border-slate-800"
                />
              </div>
              {errors.code && <p className="text-red-500 text-[10px] font-bold mt-1.5 ml-1">{errors.code.message}</p>}
            </div>

            <div className="space-y-2 group">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">Nombre descriptivo</label>
              <div className="grid gap-3">
                <input
                  {...register('name')}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all"
                  placeholder="Ej: Caja General Regional"
                />
                <SearchableSelect
                  options={nameOptions}
                  value={nameOptions.find(o => o.value === watch('name'))?.value}
                  onChange={(val) => {
                    const opt = nameOptions.find(o => o.value === val);
                    if (!opt) return;
                    setValue('name', val);
                    setValue('code', opt.code);
                    setValue('type', opt.type);
                    setValue('nature', opt.nature);
                    setValue('accepts_movement', opt.accepts_movement);
                  }}
                  placeholder="Buscar nombre en base de datos..."
                  size="lg"
                  className="rounded-2xl border-slate-200 dark:border-slate-800"
                />
              </div>
              {errors.name && <p className="text-red-500 text-[10px] font-bold mt-1.5 ml-1">{errors.name.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Clase de cuenta</label>
              <select {...register('type')} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all appearance-none">
                <option value="ACTIVO">ACTIVO</option>
                <option value="PASIVO">PASIVO</option>
                <option value="PATRIMONIO">PATRIMONIO</option>
                <option value="INGRESO">INGRESO</option>
                <option value="EGRESO">EGRESO / GASTO</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Naturaleza contable</label>
              <select {...register('nature')} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all appearance-none">
                <option value="DEBITO">DÉBITO (+)</option>
                <option value="CREDITO">CRÉDITO (-)</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex border-t border-slate-100 dark:border-slate-800 pt-6">
              <label className="flex items-center gap-4 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    {...register('accepts_movement')}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-slate-200 dark:bg-slate-800 rounded-full peer peer-checked:bg-blue-600 transition-all shadow-inner" />
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all peer-checked:left-7 shadow-sm" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-white tracking-tight">Recibe movimientos</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">¿Es una cuenta de registro o grupo?</p>
                </div>
              </label>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="group relative flex-[2] px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl text-sm font-bold shadow-xl shadow-blue-600/20 hover:from-blue-700 hover:to-indigo-700 transition-all active:scale-95 overflow-hidden flex items-center justify-center gap-3"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <span>Guardar cuenta</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
