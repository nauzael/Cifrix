import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Category } from '../../lib/db';
import { useAccountingStore } from '../../store/accountingStore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, Tag, ChevronRight, X, LayoutGrid } from 'lucide-react';

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
        <div className={`flex items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl group transition-all hover:shadow-md ${depth > 0 ? 'ml-8' : ''}`}>
          <div 
            className="size-10 rounded-lg flex items-center justify-center text-white"
            style={{ backgroundColor: node.color || '#94a3b8' }}
          >
            <Tag size={20} />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-slate-900 dark:text-white">{node.name}</h4>
            {depth === 0 && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Categoría Principal</p>}
          </div>
          <button 
            onClick={() => deleteCategory(node.id)}
            className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-fit">
          <button 
            onClick={() => setActiveType('ingreso')}
            className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-black transition-all ${
              activeType === 'ingreso' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500'
            }`}
          >
            Ingresos
          </button>
          <button 
            onClick={() => setActiveType('egreso')}
            className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-black transition-all ${
              activeType === 'egreso' ? 'bg-white dark:bg-slate-700 text-red-600 shadow-sm' : 'text-slate-500'
            }`}
          >
            Egresos
          </button>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
        >
          <Plus size={20} /> Nueva Categoría
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
             <LayoutGrid size={48} className="mx-auto text-slate-300 mb-4" />
             <p className="text-slate-500 font-bold">No hay categorías de {activeType === 'ingreso' ? 'ingreso' : 'egreso'} registradas.</p>
          </div>
        ) : (
          renderCategories()
        )}
      </div>

      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Nueva Categoría</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Nombre</label>
                <input 
                  {...register('name')}
                  autoFocus
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none"
                  placeholder="Ej. Servicios Públicos"
                />
                {errors.name && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Tipo</label>
                <select 
                  {...register('type')}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none"
                >
                  <option value="ingreso">Ingreso</option>
                  <option value="egreso">Egreso</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Categoría Padre (Opcional)</label>
                <select 
                  {...register('parent_id')}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none"
                >
                  <option value="">-- Ninguna --</option>
                  {filteredCategories.filter(c => !c.parent_id).map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Color</label>
                  <input 
                    type="color"
                    {...register('color')}
                    className="w-full h-12 p-1 bg-slate-50 dark:bg-slate-950 border-none rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Icono</label>
                  <select 
                    {...register('icon')}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none"
                  >
                    <option value="Tag">Etiqueta</option>
                    <option value="ShoppingBag">Compras</option>
                    <option value="Home">Hogar</option>
                    <option value="Car">Vehículo</option>
                    <option value="Heart">Donaciones</option>
                  </select>
                </div>
              </div>

              <div className="pt-4">
                <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-black shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all">
                  Crear Categoría
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
