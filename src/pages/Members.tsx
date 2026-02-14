import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  UserPlus,
  Download,
  Printer,
  Mail,
  Phone,
  Edit,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  Trash2,
  Save,
  CheckCircle,
  XCircle,
  FileText
} from 'lucide-react';
import { formatDate } from '../lib/utils';
import { db, Member } from '../lib/db';
import { useAuthStore } from '../store/authStore';
import { useForm } from 'react-hook-form';
import { v4 as uuidv4 } from 'uuid';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { logActivity } from '../lib/audit';
import { generateDonationCertificate } from '../lib/certificates';
import { toast } from '../store/toastStore';
import { confirm } from '../store/confirmStore';

const memberSchema = z.object({
  full_name: z.string().min(3, 'El nombre es requerido'),
  document_id: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  address: z.string().optional(),
  birth_date: z.string().optional(),
  entry_date: z.string().optional(),
  baptism_date: z.string().optional(),
  ministry: z.array(z.string()).optional().default([]),
  status: z.enum(['activo', 'inactivo', 'visitante']).default('activo'),
  pledge_amount: z.coerce.number().optional().default(0),
  pledge_period: z.string().optional(),
});

type MemberForm = z.infer<typeof memberSchema>;

export function Members() {
  const { user } = useAuthStore();
  const [orgId, setOrgId] = useState<string>('');
  const [members, setMembers] = useState<Member[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'activo' | 'inactivo' | 'visitante'>('all');
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [activeTab, setActiveTab] = useState<'personal' | 'ministerial' | 'financial'>('personal');

  useEffect(() => {
    const fetchOrg = async () => {
      if (user) {
        let orgs = await db.organizations.toArray();
        if (orgs.length > 0) {
          setOrgId(orgs[0].id);
        }
      }
    };
    fetchOrg();
  }, [user]);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      status: 'activo',
      ministry: []
    }
  });

  const fetchMembers = async () => {
    if (!orgId) return;
    try {
      let query = db.members.where('organization_id').equals(orgId);
      let results = await query.toArray();

      if (searchTerm) {
        results = results.filter(m =>
          m.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.document_id?.includes(searchTerm) ||
          m.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      if (statusFilter !== 'all') {
        results = results.filter(m => m.status === statusFilter);
      }

      setMembers(results.sort((a, b) => a.full_name.localeCompare(b.full_name)));
    } catch (error) {
      console.error("Error fetching members:", error);
      toast.error('Error al cargar miembros.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [orgId, searchTerm, statusFilter]);

  const openModal = (member?: Member) => {
    setActiveTab('personal');
    if (member) {
      setEditingMember(member);
      setValue('full_name', member.full_name);
      setValue('document_id', member.document_id || '');
      setValue('phone', member.phone || '');
      setValue('email', member.email || '');
      setValue('address', member.address || '');
      setValue('birth_date', member.birth_date || '');
      setValue('entry_date', member.entry_date || '');
      setValue('baptism_date', member.baptism_date || '');
      setValue('status', member.status);
      setValue('ministry', member.ministry || []);
      setValue('pledge_amount', member.pledge_amount || 0);
      setValue('pledge_period', member.pledge_period || '');
    } else {
      setEditingMember(null);
      reset({
        status: 'activo',
        ministry: []
      });
    }
    setIsModalOpen(true);
  };

  const onSubmit = async (data: MemberForm) => {
    if (!orgId) return;
    try {
      if (editingMember) {
        await db.members.update(editingMember.id, {
          ...data,
          is_active: data.status === 'activo',
          sync_status: 'pendiente'
        });

        await logActivity({
          organization_id: orgId,
          user_id: user?.id || 'unknown',
          action: 'UPDATE',
          entity_type: 'MEMBER',
          entity_id: editingMember.id,
          old_data: editingMember,
          new_data: data
        });
        toast.success('Miembro actualizado correctamente');
      } else {
        const memberId = uuidv4();
        const newMember: Member = {
          id: memberId,
          organization_id: orgId,
          ...data,
          document_id: data.document_id || null,
          phone: data.phone || null,
          email: data.email || null,
          address: data.address || null,
          birth_date: data.birth_date || null,
          entry_date: data.entry_date || null,
          baptism_date: data.baptism_date || null,
          photo_url: null,
          is_active: data.status === 'activo',
          created_at: new Date().toISOString(),
          sync_status: 'pendiente'
        };
        await db.members.add(newMember);

        await logActivity({
          organization_id: orgId,
          user_id: user?.id || 'unknown',
          action: 'CREATE',
          entity_type: 'MEMBER',
          entity_id: memberId,
          new_data: data
        });
        toast.success('Miembro registrado correctamente');
      }

      await fetchMembers();
      setIsModalOpen(false);
      reset();
    } catch (error: any) {
      console.error("Error saving member:", error);
      toast.error('Error al guardar: ' + error.message);
    }
  };

  const toggleStatus = async (member: Member) => {
    const nextStatus = member.status === 'activo' ? 'inactivo' : 'activo';
    await db.members.update(member.id, {
      status: nextStatus,
      is_active: nextStatus === 'activo',
      sync_status: 'pendiente'
    });

    await logActivity({
      organization_id: orgId,
      user_id: user?.id || 'unknown',
      action: 'UPDATE',
      entity_type: 'MEMBER',
      entity_id: member.id,
      new_data: { status: nextStatus }
    });

    toast.info(`Estado de ${member.full_name} cambiado a ${nextStatus}`);
    fetchMembers();
  };

  const deleteMember = async (id: string) => {
    const member = members.find(m => m.id === id);
    if (!member) return;

    confirm({
      title: 'Eliminar Miembro',
      message: `¿Está seguro de eliminar a ${member.full_name}? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      type: 'danger',
      onConfirm: async () => {
        try {
          await db.members.delete(id);

          await logActivity({
            organization_id: orgId,
            user_id: user?.id || 'unknown',
            action: 'DELETE',
            entity_type: 'MEMBER',
            entity_id: id,
            old_data: member
          });

          toast.success('Miembro eliminado correctamente');
          fetchMembers();
        } catch (error: any) {
          toast.error('Error al eliminar: ' + error.message);
        }
      }
    });
  };

  const exportCSV = () => {
    const headers = ['Nombre', 'Documento', 'Teléfono', 'Estado'];
    const rows = members.map(m => [
      m.full_name,
      m.document_id || '',
      m.phone || '',
      m.is_active ? 'Activo' : 'Inactivo'
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "directorio_miembros.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Archivo exportado correctamente');
  };

  const printDirectory = () => {
    window.print();
  };

  const handleGenerateCertificate = async (member: Member) => {
    try {
      const org = await db.organizations.get(orgId);
      if (!org) return;

      const currentYear = new Date().getFullYear();
      const contributions = await db.contributions
        .where('member_id').equals(member.id)
        .filter(c => c.date.startsWith(currentYear.toString()))
        .toArray();

      if (contributions.length === 0) {
        toast.warning('No hay contribuciones registradas para este miembro en el año actual.');
        return;
      }

      generateDonationCertificate(org, member, contributions, currentYear);
      toast.success('Certificado generado correctamente');
    } catch (error: any) {
      toast.error('Error al generar certificado: ' + error.message);
    }
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-1 tracking-tight">Directorio</h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Gestión de membresía y contactos.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition-all w-full sm:w-auto uppercase tracking-tight text-sm"
        >
          <UserPlus className="size-4" />
          Nuevo Miembro
        </button>
      </div>

      {/* Main Content Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            <div className="relative flex-1 sm:max-w-md group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4 group-focus-within:text-blue-500 transition-colors" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none bg-white dark:bg-slate-900 dark:text-white transition-all"
                placeholder="Buscar por nombre, documento o email..."
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="flex-1 sm:flex-none text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 py-2 px-3 outline-none font-bold transition-all cursor-pointer"
              >
                <option value="all">Todos los estados</option>
                <option value="activo">Solo Activos</option>
                <option value="inactivo">Solo Inactivos</option>
                <option value="visitante">Solo Visitantes</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={exportCSV}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl border border-slate-200 dark:border-slate-700 transition-all font-bold text-sm"
              title="Exportar CSV"
            >
              <Download className="size-4" />
              <span className="font-bold">Exportar</span>
            </button>
            <button
              onClick={printDirectory}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl border border-slate-200 dark:border-slate-700 transition-all font-bold text-sm"
              title="Imprimir Directorio"
            >
              <Printer className="size-4" />
              <span className="font-bold">Imprimir</span>
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Miembro / Contacto</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Información Ministerial</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Estado</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="size-8 animate-spin text-blue-500" />
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cargando directorio...</p>
                    </div>
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 max-w-xs mx-auto">
                      <div className="size-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                        <Search size={32} className="text-slate-300" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-base font-black text-slate-900 dark:text-white tracking-tight">Sin resultados</p>
                        <p className="text-xs text-slate-500">No encontramos miembros que coincidan.</p>
                      </div>
                      <button
                        onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
                        className="text-blue-600 font-bold text-xs hover:underline"
                      >
                        Limpiar filtros
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-black uppercase shrink-0 shadow-sm text-sm">
                          {member.full_name.substring(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-900 dark:text-white truncate group-hover:text-blue-600 transition-colors uppercase tracking-tight">{member.full_name}</p>
                          <div className="flex flex-col gap-0.5 mt-0.5">
                            {member.email && (
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                                <Mail className="size-3 text-slate-400" /> {member.email}
                              </p>
                            )}
                            {member.phone && (
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                                <Phone className="size-3 text-slate-400" /> {member.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1 flex-wrap">
                          {member.ministry && member.ministry.length > 0 ? (
                            member.ministry.map((m, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-tighter">
                                {m}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic opacity-50">Sin ministerio</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="size-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Ingreso: {formatDate(member.entry_date)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleStatus(member)}
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${member.status === 'activo'
                          ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-100 dark:border-green-500/20 hover:bg-green-100'
                          : member.status === 'visitante'
                            ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-500/20 hover:bg-amber-100'
                            : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-100 dark:border-red-500/20 hover:bg-red-100'
                          }`}
                      >
                        <div className={`size-1.5 rounded-full mr-1.5 ${member.status === 'activo' ? 'bg-green-500' : member.status === 'visitante' ? 'bg-amber-500' : 'bg-red-500'
                          }`} />
                        {member.status === 'activo' ? 'Activo' : member.status === 'visitante' ? 'Visitante' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleGenerateCertificate(member)}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-all"
                          title="Generar Certificado"
                        >
                          <FileText className="size-4" />
                        </button>
                        <button
                          onClick={() => openModal(member)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all"
                          title="Editar"
                        >
                          <Edit className="size-4" />
                        </button>
                        <button
                          onClick={() => deleteMember(member.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                          title="Eliminar"
                        >
                          <Trash2 className="size-4" />
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

      {/* Add/Edit Member Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md transition-opacity" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-200 dark:border-slate-800">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
              <div>
                <h3 className="font-black text-2xl text-slate-900 dark:text-white tracking-tight uppercase">
                  {editingMember ? 'Editar Registro' : 'Nuevo Registro'}
                </h3>
                <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest opacity-70">Directorio de Membresía</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-3 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <X className="size-6" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex px-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30 overflow-x-auto scrollbar-hide gap-2">
              {[
                { id: 'personal', label: 'Personales' },
                { id: 'ministerial', label: 'Ministerial' },
                { id: 'financial', label: 'Financiero' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
              <div className="p-5 h-[350px] overflow-y-auto custom-scrollbar">
                {activeTab === 'personal' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nombre Completo</label>
                        <input
                          {...register('full_name')}
                          autoFocus
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none dark:text-white transition-all"
                          placeholder="Ej. Juan Pérez"
                        />
                        {errors.full_name && <p className="text-red-500 text-[11px] font-bold mt-1">{errors.full_name.message}</p>}
                      </div>

                      <div>
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Documento / ID</label>
                        <input
                          {...register('document_id')}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none dark:text-white transition-all"
                          placeholder="ID"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Teléfono</label>
                        <input
                          {...register('phone')}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none dark:text-white transition-all"
                          placeholder="Móvil"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Email</label>
                        <input
                          {...register('email')}
                          type="email"
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none dark:text-white transition-all"
                          placeholder="correo@ejemplo.com"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Fecha Nacimiento</label>
                        <input
                          {...register('birth_date')}
                          type="date"
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none dark:text-white transition-all"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Dirección</label>
                        <input
                          {...register('address')}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none dark:text-white transition-all"
                          placeholder="Dirección residencial"
                        />
                      </div>
                    </div>
                  </div>
                ) : activeTab === 'ministerial' ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Estado</label>
                        <select
                          {...register('status')}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none dark:text-white transition-all appearance-none"
                        >
                          <option value="activo">Activo</option>
                          <option value="inactivo">Inactivo</option>
                          <option value="visitante">Visitante</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Fecha de Ingreso</label>
                        <input
                          {...register('entry_date')}
                          type="date"
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none dark:text-white transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Fecha de Bautismo</label>
                        <input
                          {...register('baptism_date')}
                          type="date"
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none dark:text-white transition-all"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Ministerios (separados por coma)</label>
                        <input
                          onChange={(e) => {
                            const val = e.target.value.split(',').map(s => s.trim()).filter(s => s !== '');
                            setValue('ministry', val);
                          }}
                          defaultValue={editingMember?.ministry?.join(', ')}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none dark:text-white transition-all"
                          placeholder="Ej. Alabanza, Escuela Dominical, Jóvenes"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-800 mb-6">
                      <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                        <strong>Compromisos de Fe:</strong> Registre los montos que el miembro se ha comprometido a aportar periódicamente para el sostenimiento de la iglesia o proyectos especiales.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Monto del Compromiso (Mensual)</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                          <input
                            {...register('pledge_amount')}
                            type="number"
                            className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none dark:text-white transition-all"
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Período del Compromiso</label>
                        <input
                          {...register('pledge_period')}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none dark:text-white transition-all"
                          placeholder="Ej. Enero - Diciembre 2026"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 bg-slate-50/30">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3.5 sm:py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all order-2 sm:order-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-8 py-3.5 sm:py-3 text-sm font-black text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 order-1 sm:order-2 active:scale-95"
                >
                  <Save size={18} />
                  {editingMember ? 'Actualizar' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.getElementById('modal-root') || document.body
      )}
    </div>
  );
}
