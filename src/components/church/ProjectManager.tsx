import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, Target, Calendar, X, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { syncToSupabase } from '../../lib/sync';

const projectSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  target_amount: z.coerce.number().min(1, 'La meta es requerida'),
  start_date: z.string(),
  end_date: z.string().optional(),
  status: z.enum(['activo', 'completado', 'cancelado']).default('activo'),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface ProjectManagerProps {
  organizationId: string;
}

export function ProjectManager({ organizationId }: ProjectManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const projects = useLiveQuery(
    () => db.projects.where('organization_id').equals(organizationId).toArray(),
    [organizationId]
  );

  const contributions = useLiveQuery(
    () => db.contributions.where('organization_id').equals(organizationId).toArray(),
    [organizationId]
  );

  const { register, handleSubmit, reset } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema) as any,
    defaultValues: {
      start_date: new Date().toISOString().split('T')[0],
      status: 'activo'
    }
  });

  const onSubmit = async (data: ProjectFormData) => {
    try {
      await db.projects.add({
        id: uuidv4(),
        organization_id: organizationId,
        ...data,
        description: data.description || null,
        end_date: data.end_date || null,
        created_at: new Date().toISOString(),
        sync_status: 'pendiente'
      });
      setIsModalOpen(false);
      reset();

      // Push inmediato a la nube
      if (organizationId) {
        syncToSupabase(organizationId);
      }
    } catch (error) {
      console.error('Error adding project:', error);
    }
  };

  const getProjectProgress = (projectId: string) => {
    const projectContribs = contributions?.filter(c => c.project_id === projectId) || [];
    return projectContribs.reduce((sum, c) => sum + c.amount, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Proyectos Especiales</h3>
          <p className="text-sm text-slate-500">Gestión de campañas y metas financieras</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
        >
          <Plus size={20} /> Nuevo Proyecto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {projects?.map(project => {
          const progress = getProjectProgress(project.id);
          const percent = Math.min(Math.round((progress / project.target_amount) * 100), 100);

          return (
            <div key={project.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-black text-lg text-slate-900 dark:text-white">{project.name}</h4>
                  <p className="text-xs text-slate-500">{project.description}</p>
                </div>
                <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${project.status === 'activo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                  {project.status}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-bold">Progreso: {percent}%</span>
                  <span className="font-black text-slate-900 dark:text-white">
                    $ {formatCurrency(progress)} / $ {formatCurrency(project.target_amount)}
                  </span>
                </div>
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-1000"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <span className="flex items-center gap-1"><Calendar size={12} /> {project.start_date}</span>
                  {project.end_date && <span className="flex items-center gap-1"><Target size={12} /> {project.end_date}</span>}
                </div>
                <button
                  onClick={async () => {
                    await db.projects.delete(project.id);
                    if (organizationId) {
                      syncToSupabase(organizationId);
                    }
                  }}
                  className="text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
        {projects?.length === 0 && (
          <div className="md:col-span-2 text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
            <TrendingUp size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 font-bold">No hay proyectos especiales activos.</p>
          </div>
        )}
      </div>

      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Nuevo Proyecto</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Nombre del Proyecto</label>
                <input
                  {...register('name')}
                  autoFocus
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none"
                  placeholder="Ej. Construcción del Templo"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Meta Financiera</label>
                <input
                  {...register('target_amount')}
                  type="number"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none"
                  placeholder="0.00"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Fecha Inicio</label>
                  <input
                    type="date"
                    {...register('start_date')}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Fecha Fin</label>
                  <input
                    type="date"
                    {...register('end_date')}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Descripción</label>
                <textarea
                  {...register('description')}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none"
                  rows={3}
                  placeholder="Detalles del proyecto..."
                />
              </div>

              <div className="pt-4">
                <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-black shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all">
                  Crear Proyecto
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
