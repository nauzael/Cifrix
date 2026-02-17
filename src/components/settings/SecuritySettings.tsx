import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Organization } from '../../lib/db';
import {
  ShieldCheck,
  History,
  Key,
  Eye,
  EyeOff,
  AlertCircle,
  Clock,
  User,
  Activity,
  Download,
  Search
} from 'lucide-react';
import { formatDate } from '../../lib/utils';

import { Modal } from '../ui/Modal';
import { AuditLog } from '../../lib/db';

interface SecuritySettingsProps {
  organization: Organization;
}

export function SecuritySettings({ organization }: SecuritySettingsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const auditLogs = useLiveQuery(
    async () => {
      let logs = await db.audit_logs
        .where('organization_id')
        .equals(organization.id)
        .reverse()
        .sortBy('created_at');

      if (filterAction !== 'all') {
        logs = logs.filter(log => log.action === filterAction);
      }

      if (searchTerm) {
        logs = logs.filter(log =>
          log.entity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.action.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      return logs.slice(0, 50); // Limit to last 50 for performance
    },
    [organization.id, filterAction, searchTerm]
  );

  const translateAction = (action: string) => {
    const map: Record<string, string> = {
      'CREATE': 'Creación',
      'UPDATE': 'Actualización',
      'DELETE': 'Eliminación',
      'LOGIN': 'Inicio de Sesión',
      'UPDATE_USER_ASSIGNMENT': 'Asignación de Usuario'
    };
    return map[action] || action;
  };

  const translateEntity = (entity: string) => {
    const map: Record<string, string> = {
      'TRANSACTION': 'Transacción',
      'USER': 'Usuario',
      'ACCOUNT': 'Cuenta',
      'MEMBER': 'Miembro',
      'INVOICE': 'Factura',
      'PAYMENT': 'Pago',
      'PROJECT': 'Proyecto',
      'CATEGORY': 'Categoría',
      'JOURNAL_ENTRY': 'Asiento Contable',
      'CONTRIBUTION': 'Contribución',
      'CUSTOMER': 'Cliente',
      'INVOICE_ITEM': 'Detalle de Factura',
      'DECLARACION_RENTA': 'Declaración de Renta',
      'FISCAL_YEAR': 'Año Fiscal',
      'EXOGENO': 'Reporte Exógeno'
    };
    return map[entity] || entity;
  };

  const FIELD_LABELS: Record<string, string> = {
    full_name: 'Nombre Completo',
    document_id: 'Documento / ID',
    phone: 'Teléfono',
    email: 'Correo Electrónico',
    address: 'Dirección',
    status: 'Estado',
    birth_date: 'Fecha Nacimiento',
    entry_date: 'Fecha Ingreso',
    baptism_date: 'Fecha Bautismo',
    ministry: 'Ministerios',
    pledge_amount: 'Monto Compromiso',
    pledge_period: 'Periodo Compromiso',
    description: 'Descripción',
    amount: 'Monto / Valor',
    date: 'Fecha',
    reference: 'Referencia',
    notes: 'Notas',
    category: 'Categoría',
    method: 'Método',
    name: 'Nombre',
    code: 'Código',
    tax_id: 'NIT / RUT',
    type: 'Tipo',
    role: 'Rol',
    active: 'Activo',
    is_active: 'Está Activo'
  };

  const renderDataValue = (key: string, value: any) => {
    if (value === null || value === undefined || value === '') return <span className="text-slate-300 italic">No registrado</span>;
    if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : <span className="text-slate-300 italic">Ninguno</span>;
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (key.includes('amount') || key === 'total' || key === 'subtotal' || key === 'tax') {
      return `$ ${new Intl.NumberFormat('es-CO').format(value)}`;
    }
    return String(value);
  };

  const FriendlyDataViewer = ({ data }: { data: any }) => {
    if (!data || typeof data !== 'object') return null;

    return (
      <div className="space-y-3">
        {Object.entries(data).map(([key, value]) => {
          // Skip internal IDs and sync status to avoid noise
          if (['id', 'organization_id', 'sync_status', 'created_at', 'updated_at', 'created_by'].includes(key)) return null;

          return (
            <div key={key} className="border-b border-slate-100 dark:border-slate-800 pb-2 last:border-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight mb-1">
                {FIELD_LABELS[key] || key}
              </p>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-snug">
                {renderDataValue(key, value)}
              </p>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Autenticación y Sesión */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6 text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-4">
          <Key className="size-5 text-blue-600" />
          <h3 className="font-black text-lg">Control de Acceso</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-black text-slate-700 dark:text-slate-300">Doble Factor (2FA)</span>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">PRÓXIMAMENTE</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">Añade una capa extra de seguridad solicitando un código desde tu móvil al iniciar sesión.</p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-black text-slate-700 dark:text-slate-300">Cierre de Sesión Automático</span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">ACTIVO</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">La sesión se cerrará automáticamente tras 2 horas de inactividad para proteger tus datos.</p>
          </div>
        </div>
      </section>

      {/* Auditoría de Actividad */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white">
            <Activity className="size-5 text-blue-600" />
            <h3 className="font-black text-lg">Registro de Auditoría</h3>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar entidad..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-48 pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
            >
              <option value="all">Todas las acciones</option>
              <option value="CREATE">Creación</option>
              <option value="UPDATE">Edición</option>
              <option value="DELETE">Eliminación</option>
              <option value="LOGIN">Ingreso</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-4 sm:px-6 py-4">Usuario</th>
                <th className="px-4 sm:px-6 py-4">Acción</th>
                <th className="px-4 sm:px-6 py-4">Entidad</th>
                <th className="px-4 sm:px-6 py-4">Fecha y Hora</th>
                <th className="px-4 sm:px-6 py-4 text-right">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {auditLogs?.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 sm:px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="size-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                        <User size={12} />
                      </div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[80px] sm:max-w-none">Admin</span>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-[9px] font-black tracking-wider uppercase whitespace-nowrap ${log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                      log.action === 'CREATE' ? 'bg-green-100 text-green-700' :
                        log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-700'
                      }`}>
                      {translateAction(log.action)}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-xs font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {translateEntity(log.entity_type)}
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-xs font-medium text-slate-500 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} className="text-slate-300" />
                      {formatDate(log.created_at)}
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-right">
                    <button
                      className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                      title="Ver datos técnicos"
                      onClick={() => setSelectedLog(log)}
                    >
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {auditLogs?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <History size={32} className="opacity-20" />
                      <p className="text-sm font-bold">No se encontraron registros de actividad.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Dispositivos y Sesiones */}
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="size-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <ShieldCheck className="size-6" />
          </div>
          <div>
            <h4 className="font-black text-blue-900 dark:text-blue-100 mb-1">Protección de Datos Activa</h4>
            <p className="text-xs sm:text-sm text-blue-700/70 dark:text-blue-300/60 leading-relaxed">
              Toda la información está cifrada localmente y sincronizada mediante protocolos de seguridad SSL de grado bancario. El acceso a la base de datos está restringido solo a usuarios autenticados.
            </p>
          </div>
        </div>
      </div>

      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Detalles de Movimiento"
        subtitle={selectedLog ? formatDate(selectedLog.created_at) : ''}
        icon={Activity}
        maxWidth="lg"
      >
        {selectedLog && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tipo de Acción</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{translateAction(selectedLog.action)}</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Entidad Afectada</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{translateEntity(selectedLog.entity_type)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h4 className="flex items-center gap-2 text-xs font-black text-red-500 uppercase tracking-widest">
                  <div className="size-2 rounded-full bg-red-500" />
                  Valor Anterior
                </h4>
                <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 h-[320px] overflow-y-auto custom-scrollbar">
                  {selectedLog.old_data ? (
                    <FriendlyDataViewer data={selectedLog.old_data} />
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-300 text-xs italic">
                      Sin datos anteriores
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="flex items-center gap-2 text-xs font-black text-green-500 uppercase tracking-widest">
                  <div className="size-2 rounded-full bg-green-500" />
                  Valor Nuevo
                </h4>
                <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 h-[320px] overflow-y-auto custom-scrollbar">
                  {selectedLog.new_data ? (
                    <FriendlyDataViewer data={selectedLog.new_data} />
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-300 text-xs italic">
                      Sin datos nuevos
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
              >
                Cerrar Detalles
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
