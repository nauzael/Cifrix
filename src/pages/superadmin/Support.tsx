import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { CreateTicketModal } from '../../components/superadmin/CreateTicketModal';
import {
  MessageSquare,
  Clock,
  CheckCircle,
  AlertTriangle,
  Search,
  Filter,
  MoreVertical,
  Headphones,
  Plus
} from 'lucide-react';

export function Support() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error fetching tickets (table might not exist yet):', error);
        setTickets([]);
      } else {
        setTickets(data || []);
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredTickets = tickets.filter(ticket =>
    ticket.id?.toString().includes(searchTerm) ||
    ticket.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.org?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    open: 12,
    responseTime: '45m',
    satisfaction: 94,
    total: 856
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 animate-in fade-in duration-700">
      <CreateTicketModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchTickets}
      />

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-600 rounded-2xl shadow-lg shadow-amber-600/20">
              <Headphones className="text-white" size={24} />
            </div>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Soporte y Tickets
            </h3>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            Gestiona las solicitudes de ayuda de todas las organizaciones.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="group relative bg-amber-600 text-white px-6 py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-3 shadow-xl shadow-amber-600/20 hover:bg-amber-700 hover:shadow-amber-600/40 transition-all duration-300 active:scale-95 w-full sm:w-auto overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          <Plus size={18} className="group-hover:rotate-90 transition-transform" />
          <span>Nuevo Ticket</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none group hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="size-12 rounded-2xl bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:rotate-12 transition-transform">
              <AlertTriangle size={24} />
            </div>
            <span className="px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-wider">
              4 Críticos
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Tickets Abiertos</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {stats.open}
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none group hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="size-12 rounded-2xl bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:rotate-12 transition-transform">
              <Clock size={24} />
            </div>
            <span className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-wider">
              Promedio
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Tiempo Respuesta</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {stats.responseTime}
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none group hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="size-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:rotate-12 transition-transform">
              <CheckCircle size={24} />
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider">
              150 reviews
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Satisfacción</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {stats.satisfaction}%
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none group hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="size-12 rounded-2xl bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:rotate-12 transition-transform">
              <MessageSquare size={24} />
            </div>
            <span className="px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-black uppercase tracking-wider">
              Este Mes
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Tickets Totales</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {stats.total}
            </h3>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Historial de Tickets
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              Gestiona y da seguimiento a las solicitudes de soporte.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-600 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Buscar tickets..."
                className="w-full sm:w-[280px] pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-amber-600/20 rounded-2xl text-sm font-medium outline-none text-slate-900 dark:text-white transition-all placeholder:text-slate-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="flex items-center justify-center gap-2.5 px-5 py-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-sm font-black hover:bg-slate-100 dark:hover:bg-slate-700 transition-all active:scale-95 border border-slate-200 dark:border-slate-700">
              <Filter size={18} />
              <span>Filtros</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Asunto</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Organización</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Prioridad</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Agente</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Creado</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative">
                        <div className="size-12 border-4 border-amber-600/20 rounded-full"></div>
                        <div className="absolute inset-0 size-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                      <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Cargando tickets...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-50">
                      <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                        <MessageSquare size={32} className="text-slate-400" />
                      </div>
                      <span className="text-sm font-black text-slate-400 uppercase tracking-widest">
                        {tickets.length === 0 ? 'No hay tickets registrados' : 'No se encontraron tickets'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all duration-300 group">
                    <td className="px-8 py-5">
                      <span className="text-xs font-black text-slate-500 dark:text-slate-400 tracking-wider">
                        #{ticket.id}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-black text-slate-900 dark:text-white tracking-tight group-hover:text-amber-600 transition-colors">
                        {ticket.subject}
                      </p>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        {ticket.org || 'N/A'}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      {ticket.priority === 'critical' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-wider">
                          <span className="size-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                          Crítica
                        </span>
                      )}
                      {ticket.priority === 'high' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-[10px] font-black uppercase tracking-wider">
                          <span className="size-1.5 rounded-full bg-orange-500"></span>
                          Alta
                        </span>
                      )}
                      {ticket.priority === 'medium' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-wider">
                          <span className="size-1.5 rounded-full bg-blue-500"></span>
                          Media
                        </span>
                      )}
                      {ticket.priority === 'low' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-wider">
                          <span className="size-1.5 rounded-full bg-slate-400"></span>
                          Baja
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-5">
                      {ticket.status === 'open' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Abierto
                        </span>
                      )}
                      {ticket.status === 'in_progress' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-wider">
                          <span className="size-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                          En Proceso
                        </span>
                      )}
                      {ticket.status === 'closed' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-wider">
                          <span className="size-1.5 rounded-full bg-slate-400"></span>
                          Cerrado
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        {ticket.agent || 'Sin asignar'}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-xs font-medium text-slate-400">
                        {new Date(ticket.created_at || Date.now()).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button className="p-3 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-2xl transition-all duration-300">
                          <MoreVertical size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
