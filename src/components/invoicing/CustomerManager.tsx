import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Customer } from '../../lib/db';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, User, Search, X, Mail, Phone, MapPin } from 'lucide-react';

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
      <div className="flex justify-between items-center">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
          <input 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white"
            placeholder="Buscar cliente..."
          />
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
        >
          <Plus size={20} /> Nuevo Cliente
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map(customer => (
          <div key={customer.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 group">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="size-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 font-black">
                  {customer.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white">{customer.name}</h4>
                  <p className="text-xs text-slate-500">{customer.tax_id || 'Sin ID fiscal'}</p>
                </div>
              </div>
              <button 
                onClick={() => db.customers.delete(customer.id)}
                className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-50 dark:border-slate-800">
              {customer.email && <div className="flex items-center gap-2 text-xs text-slate-500"><Mail size={12} /> {customer.email}</div>}
              {customer.phone && <div className="flex items-center gap-2 text-xs text-slate-500"><Phone size={12} /> {customer.phone}</div>}
              {customer.address && <div className="flex items-center gap-2 text-xs text-slate-500"><MapPin size={12} /> {customer.address}</div>}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Nuevo Cliente</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Nombre / Razón Social</label>
                <input 
                  {...register('name')}
                  autoFocus
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 dark:text-white border-none rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none"
                  placeholder="Ej. Juan Pérez o Empresa S.A.S"
                />
                {errors.name && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">NIT / ID Fiscal</label>
                <input 
                  {...register('tax_id')}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 dark:text-white border-none rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none"
                  placeholder="900.000.000-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Email</label>
                  <input 
                    {...register('email')}
                    type="email"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 dark:text-white border-none rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Teléfono</label>
                  <input 
                    {...register('phone')}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 dark:text-white border-none rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none"
                    placeholder="300 000 0000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Dirección</label>
                <input 
                  {...register('address')}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 dark:text-white border-none rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none"
                  placeholder="Calle 123 # 45-67"
                />
              </div>

              <div className="pt-4">
                <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-black shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all">
                  Guardar Cliente
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
