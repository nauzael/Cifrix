import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, User, Search, Mail, Phone, MapPin } from 'lucide-react';
import { Modal } from '../ui/Modal';

const customerSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  tax_id: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface CustomerManagerProps {
  organizationId: string;
}

export function CustomerManager({ organizationId }: CustomerManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const customers = useLiveQuery(
    () => db.customers.where('organization_id').equals(organizationId).toArray(),
    [organizationId]
  );

  const filteredCustomers = customers?.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.tax_id?.includes(searchTerm)
  ) || [];

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema)
  });

  const onSubmit = async (data: CustomerFormData) => {
    try {
      await db.customers.add({
        id: uuidv4(),
        organization_id: organizationId,
        ...data,
        tax_id: data.tax_id || null,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        created_at: new Date().toISOString(),
        sync_status: 'pendiente'
      });
      setIsModalOpen(false);
      reset();
    } catch (error) {
      console.error('Error adding customer:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all dark:text-white"
            placeholder="Buscar por nombre o identificación..."
          />
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="group bg-blue-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-3 shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform" />
          Nuevo cliente
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map(customer => (
          <div key={customer.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 group hover:shadow-xl hover:border-blue-500/20 transition-all duration-300">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="size-12 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-lg shadow-inner">
                  {customer.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white tracking-tight">{customer.name}</h4>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{customer.tax_id || 'Sin identificación'}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (confirm('¿Seguro que desea eliminar este cliente?')) {
                    db.customers.delete(customer.id);
                  }
                }}
                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all"
              >
                <Trash2 size={18} />
              </button>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-50 dark:border-slate-800/50">
              {customer.email && (
                <div className="flex items-center gap-3 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <Mail size={14} className="text-blue-500/60" />
                  {customer.email}
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-3 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <Phone size={14} className="text-blue-500/60" />
                  {customer.phone}
                </div>
              )}
              {customer.address && (
                <div className="flex items-center gap-3 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <MapPin size={14} className="text-blue-500/60" />
                  {customer.address}
                </div>
              )}
            </div>
          </div>
        ))}
        {filteredCustomers.length === 0 && (
          <div className="col-span-full py-20 text-center space-y-4">
            <div className="size-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400 dark:text-slate-600">
              <User size={40} />
            </div>
            <p className="text-slate-400 font-bold">No se encontraron clientes</p>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nuevo cliente"
        subtitle="Registro de tercero para facturación"
        icon={User}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2 group">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">Nombre o razón social</label>
            <input
              {...register('name')}
              autoFocus
              className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all"
              placeholder="Ej. Juan Pérez o Empresa S.A.S"
            />
            {errors.name && <p className="text-red-500 text-[10px] font-bold mt-1.5 ml-1">{errors.name.message}</p>}
          </div>

          <div className="space-y-2 group">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">Identificación fiscal (NIT/CC)</label>
            <input
              {...register('tax_id')}
              className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all"
              placeholder="Ej. 1.000.222.333-1"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 group">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">Correo electrónico</label>
              <input
                {...register('email')}
                type="email"
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all"
                placeholder="ejemplo@correo.com"
              />
            </div>
            <div className="space-y-2 group">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">Número telefónico</label>
              <input
                {...register('phone')}
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all"
                placeholder="300 000 0000"
              />
            </div>
          </div>

          <div className="space-y-2 group">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">Dirección física</label>
            <input
              {...register('address')}
              className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all"
              placeholder="Calle 123 # 45-67, Ciudad"
            />
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
              <span>Guardar cliente</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

