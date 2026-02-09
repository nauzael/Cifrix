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
  MoreVertical
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

  return (
    <div className="p-8">
      <CreateTicketModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchTickets}
      />
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white">Soporte y Tickets</h1>
          <p className="text-slate-500 text-sm">Gestiona las solicitudes de ayuda de todas las organizaciones.</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"
        >
          Nuevo Ticket
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="size-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
            <span className="text-2xl font-black text-slate-800 dark:text-white">12</span>
          </div>
          <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Tickets Abiertos</p>
          <p className="text-xs text-slate-500 mt-1">4 Críticos</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="size-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Clock size={20} />
            </div>
            <span className="text-2xl font-black text-slate-800 dark:text-white">45m</span>
          </div>
          <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Tiempo de Respuesta</p>
          <p className="text-xs text-slate-500 mt-1">Promedio global</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="size-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
              <CheckCircle size={20} />
            </div>
            <span className="text-2xl font-black text-slate-800 dark:text-white">94%</span>
          </div>
          <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Satisfacción</p>
          <p className="text-xs text-slate-500 mt-1">Basado en 150 reviews</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="size-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
              <MessageSquare size={20} />
            </div>
            <span className="text-2xl font-black text-slate-800 dark:text-white">856</span>
          </div>
          <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Tickets Totales</p>
          <p className="text-xs text-slate-500 mt-1">Este mes</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Buscar tickets por ID, asunto o cliente..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 text-sm font-bold flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <Filter size={18} />
            Filtros
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase font-bold text-xs">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Asunto</th>
                <th className="px-6 py-4">Organización</th>
                <th className="px-6 py-4">Prioridad</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Agente</th>
                <th className="px-6 py-4">Creado</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    Cargando tickets...
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    {tickets.length === 0 ? 'No hay tickets registrados.' : 'No se encontraron tickets con esa búsqueda.'}
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{ticket.id}</td>
                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-white">{ticket.subject}</td>
                    <td className="px-6 py-4 text-slate-500">{ticket.org || 'N/A'}</td>
                    <td className="px-6 py-4">
                      {ticket.priority === 'critical' && <span className="text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-bold uppercase">Crítica</span>}
                      {ticket.priority === 'high' && <span className="text-orange-600 bg-orange-50 px-2 py-1 rounded text-xs font-bold uppercase">Alta</span>}
                      {ticket.priority === 'medium' && <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs font-bold uppercase">Media</span>}
                      {ticket.priority === 'low' && <span className="text-slate-600 bg-slate-100 px-2 py-1 rounded text-xs font-bold uppercase">Baja</span>}
                    </td>
                    <td className="px-6 py-4">
                      {ticket.status === 'open' && <span className="flex items-center gap-1 text-green-600 font-bold text-xs"><div className="size-2 rounded-full bg-green-500"></div> Abierto</span>}
                      {ticket.status === 'in_progress' && <span className="flex items-center gap-1 text-blue-600 font-bold text-xs"><div className="size-2 rounded-full bg-blue-500"></div> En Proceso</span>}
                      {ticket.status === 'closed' && <span className="flex items-center gap-1 text-slate-400 font-bold text-xs"><div className="size-2 rounded-full bg-slate-300"></div> Cerrado</span>}
                    </td>
                    <td className="px-6 py-4 text-slate-500">{ticket.agent || 'Sin asignar'}</td>
                    <td className="px-6 py-4 text-slate-400 text-xs">{new Date(ticket.created_at || Date.now()).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                        <MoreVertical size={16} />
                      </button>
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
