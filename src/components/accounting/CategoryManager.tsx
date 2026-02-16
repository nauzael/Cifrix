import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { useAccountingStore } from '../../store/accountingStore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, Tag, LayoutGrid } from 'lucide-react';
import { Modal } from '../ui/Modal';

const categorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  type: z.enum(['ingreso', 'egreso']),
  parent_id: z.string().nullable(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryManagerProps {
  organizationId: string;
}

export function CategoryManager({ organizationId }: CategoryManagerProps) {
  const {
    categoriesActiveType: activeType,
    setCategoriesActiveType: setActiveType
  } = useAccountingStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const categories = useLiveQuery(
    () => db.categories.where('organization_id').equals(organizationId).toArray(),
    [organizationId]
  );

  const filteredCategories = categories?.filter(c => c.type === activeType) || [];

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      type: 'ingreso',
      parent_id: null,
      icon: 'Tag',
      color: '#3B82F6'
    }
  });

  const onSubmit = async (data: CategoryFormData) => {
    try {
      await db.categories.add({
        id: uuidv4(),
        organization_id: organizationId,
        name: data.name,
        type: data.type,
        parent_id: data.parent_id === "" ? null : data.parent_id,
        icon: data.icon || null,
        color: data.color || null,
        created_at: new Date().toISOString(),
        sync_status: 'pendiente'
      });
      setIsModalOpen(false);
      reset();
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const deleteCategory = async (id: string) => {
    if (confirm('¿Está seguro de eliminar esta categoría?')) {
      await db.categories.delete(id);
    }
  };

  const renderCategories = (parentId: string | null = null, depth = 0) => {
    const nodes = filteredCategories.filter(c => c.parent_id === parentId);

    return nodes.map(node => (
      <div key={node.id} className="space-y-1">
        <div className={`flex items-center gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] group transition-all hover:shadow-lg hover:border-blue-500/20 ${depth > 0 ? 'ml-10 relative before:absolute before:left-[-20px] before:top-1/2 before:w-5 before:h-[2px] before:bg-slate-200 dark:before:bg-slate-800' : ''}`}>
          <div
            className="size-11 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0"
            style={{
              backgroundColor: node.color || '#94a3b8',
              boxShadow: `0 8px 16px -4px ${node.color}40`
            }}
          >
            <Tag size={20} className="drop-shadow-sm" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-black text-slate-900 dark:text-white truncate tracking-tight">{node.name}</h4>
            <div className="flex items-center gap-2">
              <span className={`size-1.5 rounded-full ${activeType === 'ingreso' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                {depth === 0 ? 'Categoría principal' : `Sub-categoría Nivel ${depth}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => deleteCategory(node.id)}
            className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all active:scale-90"
          >
            <Trash2 size={18} />
          </button>
        </div>
        {renderCategories(node.id, depth + 1)}
      </div>
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl w-full sm:w-fit">
          <button
            onClick={() => setActiveType('ingreso')}
            className={`flex-1 sm:flex-none px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${activeType === 'ingreso'
              ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-xl shadow-blue-500/10'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
          >
            Ingresos
          </button>
          <button
            onClick={() => setActiveType('egreso')}
            className={`flex-1 sm:flex-none px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${activeType === 'egreso'
              ? 'bg-white dark:bg-slate-800 text-red-600 shadow-xl shadow-red-500/10'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
          >
            Egresos
          </button>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="group w-full sm:w-auto bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform" />
          Nueva categoría
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-20 bg-slate-50/50 dark:bg-slate-950/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800/50">
            <div className="size-20 bg-white dark:bg-slate-900 rounded-2xl shadow-xl flex items-center justify-center mx-auto mb-6 text-slate-300">
              <LayoutGrid size={40} />
            </div>
            <p className="text-slate-400 font-bold max-w-xs mx-auto">
              No hay categorías de {activeType === 'ingreso' ? 'ingreso' : 'egreso'} configuradas actualmente.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {renderCategories()}
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nueva categoría"
        subtitle={`Clasificación para registros de ${activeType}`}
        icon={Tag}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2 group">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">Nombre de la categoría</label>
            <input
              {...register('name')}
              autoFocus
              className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all"
              placeholder="Ej. Servicios Públicos"
            />
            {errors.name && <p className="text-red-500 text-[10px] font-bold mt-1.5 ml-1">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 group">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">Tipo de flujo</label>
              <select
                {...register('type')}
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="ingreso">Ingreso (+)</option>
                <option value="egreso">Egreso (-)</option>
              </select>
            </div>

            <div className="space-y-2 group">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">Categoría padre</label>
              <select
                {...register('parent_id')}
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="">-- Nivel Principal --</option>
                {filteredCategories.filter(c => !c.parent_id).map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 group">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">Color distintivo</label>
              <div className="flex gap-3 items-center">
                <input
                  type="color"
                  {...register('color')}
                  className="size-14 p-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none cursor-pointer transition-all"
                />
                <span className="text-[11px] font-bold text-slate-400">Seleccionar color visual</span>
              </div>
            </div>

            <div className="space-y-2 group">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">Icono representativo</label>
              <select
                {...register('icon')}
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="Tag">📍 Etiqueta</option>
                <option value="ShoppingBag">🛍️ Compras</option>
                <option value="Home">🏠 Hogar</option>
                <option value="Car">🚗 Vehículo</option>
                <option value="Heart">❤️ Donaciones</option>
              </select>
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
              <span>Crear categoría</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

