import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Account } from '../../lib/db';
import { useAuthStore } from '../../store/authStore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, FolderTree, ChevronRight, Loader2, Pencil, Check, X } from 'lucide-react';
import { UNIVERSAL_PUC } from '../../lib/pucTemplates';
import { logActivity } from '../../lib/audit';
import { SearchableSelect } from '../ui/SearchableSelect';
import PUC_MD from '../../../.documentacion/PUC.md?raw';

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
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [query, setQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState<Account | null>(null);

  useEffect(() => {
    setOrgId(organizationId);
  }, [organizationId]);

  // Organización no es necesaria para la carga universal

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
      '1': 'ACTIVO',
      '2': 'PASIVO',
      '3': 'PATRIMONIO',
      '4': 'INGRESO',
      '5': 'EGRESO',
      '6': 'EGRESO',
      '7': 'EGRESO',
      '8': 'ACTIVO',
      '9': 'PASIVO'
    };
    const natureByType: Record<Account['type'], Account['nature']> = {
      ACTIVO: 'DEBITO',
      PASIVO: 'CREDITO',
      PATRIMONIO: 'CREDITO',
      INGRESO: 'CREDITO',
      EGRESO: 'DEBITO'
    };
    for (const raw of lines) {
      const m = raw.match(/^\s*(\d{1,6})\s+(.+)$/);
      if (!m) continue;
      const code = m[1];
      let name = m[2].trim();
      if (/^\s*a\s+\d+/.test(name)) continue;
      name = name.replace(/<[^>]+>/g, '').trim();
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
      const level = data.code.length;
      await db.accounts.add({
        id: uuidv4(),
        organization_id: orgId,
        code: data.code,
        name: data.name,
        type: data.type,
        nature: data.nature,
        level: level,
        accepts_movement: data.accepts_movement,
        parent_id: data.parent_id === "" ? null : data.parent_id,
        created_at: new Date().toISOString(),
        sync_status: 'pendiente'
      });
      reset();
    } catch (error) {
      console.error('Error adding account:', error);
      alert('Error al crear la cuenta. Verifique que el código no exista.');
    }
  };

  const getDescendantIds = (rootId: string) => {
    const result: string[] = [];
    const stack = [rootId];
    while (stack.length) {
      const current = stack.pop() as string;
      const children = accounts?.filter(a => a.parent_id === current) || [];
      for (const ch of children) {
        result.push(ch.id);
        stack.push(ch.id);
      }
    }
    return result;
  };

  const deleteAccount = async (e: React.MouseEvent<HTMLButtonElement>, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    const descendantIds = getDescendantIds(id);
    const idsToDelete = [id, ...descendantIds];

    const hasEntries = await db.journal_entries.where('account_id').anyOf(idsToDelete).count() > 0;
    if (hasEntries) {
      alert('No se puede eliminar esta cuenta porque ya tiene movimientos contables registrados.');
      return;
    }

    const msg = descendantIds.length > 0 
      ? `Esta cuenta tiene ${descendantIds.length} sub-cuentas. ¿Desea eliminarla junto con sus sub-cuentas?`
      : '¿Está seguro de eliminar esta cuenta?';

    if (confirm(msg)) {
      try {
        const account = await db.accounts.get(id);
        await db.accounts.bulkDelete(idsToDelete);
        
        if (account && orgId) {
          await logActivity({
            organization_id: orgId,
            user_id: user?.id || 'unknown',
            action: 'DELETE',
            entity_type: 'ACCOUNT',
            entity_id: id,
            old_data: { account, deleted_ids: idsToDelete },
            new_data: null
          });
        }
        alert(`Se eliminaron ${idsToDelete.length} cuenta(s) correctamente.`);
      } catch (error) {
        console.error('Error deleting account:', error);
        alert('Error al eliminar la cuenta.');
      }
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const startEditAccount = (account: Account) => {
    setEditingAccountId(account.id);
    setEditingName(account.name);
  };

  const cancelEditAccount = () => {
    setEditingAccountId(null);
    setEditingName('');
  };

  const saveEditAccount = async () => {
    if (!editingAccountId || !orgId) return;
    const name = editingName.trim();
    if (!name) return;
    const existing = await db.accounts.get(editingAccountId);
    if (!existing) return;
    await db.accounts.update(editingAccountId, { name, sync_status: 'pendiente' });
    await logActivity({
      organization_id: orgId,
      user_id: user?.id || 'unknown',
      action: 'UPDATE',
      entity_type: 'ACCOUNT',
      entity_id: editingAccountId,
      old_data: { name: existing.name },
      new_data: { name }
    });
    setEditingAccountId(null);
    setEditingName('');
  };

  const seedPUC = async () => {
    if (!orgId) return;
    
    const defaultAccounts = UNIVERSAL_PUC;

    for (const acc of defaultAccounts) {
      const exists = await db.accounts.where({ organization_id: orgId, code: acc.code }).first();
      if (!exists) {
        let parentId: string | null = null;
        if ('parent_code' in acc && acc.parent_code) {
          const parent = await db.accounts.where({ organization_id: orgId, code: acc.parent_code }).first();
          if (parent) parentId = parent.id;
        }

        await db.accounts.add({
          id: uuidv4(),
          organization_id: orgId,
          code: acc.code,
          name: acc.name,
          type: acc.type,
          nature: acc.nature,
          level: acc.code.length,
          accepts_movement: acc.accepts_movement,
          parent_id: parentId,
          created_at: new Date().toISOString(),
          sync_status: 'pendiente'
        });
      }
    }
    alert('PUC universal cargado exitosamente.');
  };

  const clearPUC = async () => {
    if (!orgId) return;
    
    const count = await db.accounts.where('organization_id').equals(orgId).count();
    if (count === 0) {
      alert('La tabla PUC ya está vacía.');
      return;
    }

    const hasEntries = await db.journal_entries.count() > 0;
    if (hasEntries) {
      alert('No se puede limpiar el PUC porque existen movimientos contables que dependen de estas cuentas.');
      return;
    }

    if (confirm(`¿Está seguro de eliminar las ${count} cuentas del PUC? Esta acción no se puede deshacer.`)) {
      try {
        const accountIds = await db.accounts.where('organization_id').equals(orgId).primaryKeys();
        await db.accounts.bulkDelete(accountIds);
        alert('Tabla PUC limpiada exitosamente.');
      } catch (error) {
        console.error('Error clearing PUC:', error);
        alert('Error al limpiar la tabla PUC.');
      }
    }
  };

  const addChild = (parent: Account) => {
    reset({
      name: '',
      code: parent.code,
      type: parent.type,
      nature: parent.nature,
      accepts_movement: true,
      parent_id: parent.id
    });
    setSelectedParent(parent);
    setIsModalOpen(true);
  };

  const handleNewAccount = () => {
    setSelectedParent(null);
    reset({
      type: 'ACTIVO',
      nature: 'DEBITO',
      accepts_movement: true,
      parent_id: null,
      code: '',
      name: ''
    });
    setIsModalOpen(true);
  };

  const renderTree = (parentId: string | null = null, depth = 0) => {
    const q = query.trim().toLowerCase();
    const parentMap = new Map<string, string | null>((accounts || []).map(a => [a.id, a.parent_id]));
    const matchIds = q
      ? (accounts || []).filter(a => a.code.includes(q) || a.name.toLowerCase().includes(q)).map(a => a.id)
      : [];
    const ancestorIds = new Set<string>();
    const addAnc = (id: string) => {
      let p = parentMap.get(id) || null;
      while (p) {
        ancestorIds.add(p);
        p = parentMap.get(p) || null;
      }
    };
    matchIds.forEach(addAnc);
    const visibleIds = new Set<string>([...matchIds, ...Array.from(ancestorIds)]);

    const nodes = accounts?.filter(acc => acc.parent_id === parentId && (q ? visibleIds.has(acc.id) : true)) || [];
    
    return nodes.map(node => {
      const hasChildren = accounts?.some(acc => acc.parent_id === node.id);
      const isExpanded = q ? true : !!expanded[node.id];

      return (
        <div key={node.id} className="select-none">
          <div 
            className={`flex flex-col sm:flex-row sm:items-center gap-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 px-2 rounded transition-colors group ${depth > 0 ? 'ml-4 sm:ml-6' : ''}`}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <button 
                onClick={() => toggleExpand(node.id)}
                className={`p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              >
                {hasChildren ? <ChevronRight size={14} className="text-slate-400" /> : <div className="size-[14px]" />}
              </button>
              
              <span className={`font-mono text-xs w-16 font-bold flex-shrink-0 ${
                node.level === 1 ? 'text-blue-600' : 
                node.level === 2 ? 'text-indigo-600' : 'text-slate-500'
              }`}>
                {node.code}
              </span>
              
              <span className={`text-sm truncate ${node.level === 1 ? 'font-black uppercase' : node.level === 2 ? 'font-bold' : ''}`}>
                {node.name}
              </span>
            </div>

            <div className="flex items-center gap-2 ml-8 sm:ml-0 pb-1 sm:pb-0">
               <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                 node.nature === 'DEBITO' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
               }`}>
                 {node.nature[0]}
               </span>
               {!node.accepts_movement && (
                 <span className="text-[9px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded uppercase">G</span>
               )}
              <button
                onClick={() => addChild(node)}
                className="p-1.5 sm:px-2 sm:py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center gap-1 text-[10px] font-black uppercase transition-colors"
                title="Agregar subcuenta"
                type="button"
              >
                <Plus size={12} />
                <span className="hidden sm:inline">Subcuenta</span>
              </button>
              <button 
                onClick={(e) => deleteAccount(e, node.id)} 
                className="p-1.5 sm:px-2 sm:py-1 rounded-full bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 flex items-center gap-1 text-[10px] font-black uppercase transition-colors"
                type="button"
                title="Eliminar"
              >
                <Trash2 size={12} />
                <span className="hidden sm:inline">Eliminar</span>
              </button>
            </div>
          </div>
          {isExpanded && renderTree(node.id, depth + 1)}
        </div>
      );
    });
  };

  if (!orgId) return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400">
      <Loader2 className="animate-spin mb-4 text-blue-600" size={32} />
      <p className="font-bold">Cargando organización...</p>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h3 className="text-lg font-bold text-slate-900 dark:text-white">Plan Único de Cuentas (PUC)</h3>
           <p className="text-sm text-slate-500 dark:text-slate-400">Gestione la estructura contable de su organización</p>
        </div>
        <div className="flex w-full sm:w-auto gap-2">
          <button 
            onClick={clearPUC}
            className="flex-1 sm:flex-none text-xs bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 px-3 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <Trash2 size={14} />
            <span className="sm:hidden">Limpiar</span>
            <span className="hidden sm:inline">Limpiar PUC</span>
          </button>
          <button 
            onClick={seedPUC}
            className="flex-1 sm:flex-none text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
            title="Cargar plan de cuentas universal"
          >
            <FolderTree size={14} />
            <span className="sm:hidden">Cargar PUC</span>
            <span className="hidden sm:inline">Cargar PUC Universal</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 min-h-[400px] sm:min-h-[500px]">
        <div className="mb-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por código o nombre..."
            className="w-full text-sm border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="overflow-x-auto -mx-1 px-1">
          {accounts && accounts.length > 0 ? (
            renderTree()
          ) : (
            <div className="text-center py-10 text-slate-400">
              No hay cuentas registradas. Cargue el PUC universal o cree una nueva.
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X size={20} />
            </button>
            
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              {selectedParent ? 'Nueva Subcuenta' : 'Nueva Cuenta'}
            </h3>

            {selectedParent && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase mb-1">Cuenta Padre</p>
                <p className="font-mono font-bold text-slate-700 dark:text-slate-300">{selectedParent.code} - {selectedParent.name}</p>
              </div>
            )}

            <form onSubmit={handleSubmit((data) => { onSubmit(data); setIsModalOpen(false); })} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Código</label>
                <div className="grid grid-cols-1 gap-2">
                  <input 
                    {...register('code')}
                    className="w-full text-sm border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-blue-500 focus:border-blue-500"
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
                    placeholder="Buscar código en catálogo"
                    size="md"
                  />
                </div>
                {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Nombre</label>
                <div className="grid grid-cols-1 gap-2">
                  <input 
                    {...register('name')}
                    className="w-full text-sm border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: Caja General"
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
                    placeholder="Buscar nombre en catálogo"
                    size="md"
                  />
                </div>
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Tipo</label>
                <select {...register('type')} className="w-full text-sm border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-blue-500 focus:border-blue-500">
                  <option value="ACTIVO">Activo</option>
                  <option value="PASIVO">Pasivo</option>
                  <option value="PATRIMONIO">Patrimonio</option>
                  <option value="INGRESO">Ingresos</option>
                  <option value="EGRESO">Gastos</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Naturaleza</label>
                  <select {...register('nature')} className="w-full text-sm border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-blue-500 focus:border-blue-500">
                    <option value="DEBITO">Débito</option>
                    <option value="CREDITO">Crédito</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Movimiento</label>
                  <select 
                    {...register('accepts_movement', { setValueAs: v => v === 'true' })} 
                    className="w-full text-sm border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="true">Sí</option>
                    <option value="false">No (Grupo)</option>
                  </select>
                </div>
              </div>

              {!selectedParent && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Cuenta Padre (Opcional)</label>
                  <select {...register('parent_id')} className="w-full text-sm border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg focus:ring-blue-500 focus:border-blue-500">
                    <option value="">-- Ninguna --</option>
                    {accounts?.filter(a => !a.accepts_movement).map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors">
                Guardar Cuenta
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
