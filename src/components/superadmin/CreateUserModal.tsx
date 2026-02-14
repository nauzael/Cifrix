import { UserPlus, ExternalLink } from 'lucide-react';
import { Modal } from '../ui/Modal';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateUserModal({ isOpen, onClose }: CreateUserModalProps) {
  const projectId = 'zpiqnrvycuibrcehrlhs';
  const dashboardUrl = `https://supabase.com/dashboard/project/${projectId}/auth/users`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nuevo usuario global"
      subtitle="Creación de credenciales en Supabase"
      icon={UserPlus}
      maxWidth="md"
    >
      <div className="space-y-6">
        <div className="bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-[2rem] border border-blue-100 dark:border-blue-800/50 text-center space-y-4">
          <div className="size-16 bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-blue-500/10 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400 border border-slate-100 dark:border-slate-800">
            <ExternalLink size={28} />
          </div>

          <div className="space-y-1">
            <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Creación segura externa
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-bold">
              Por seguridad, la creación de nuevos usuarios debe realizarse desde el panel de control de Supabase.
            </p>
          </div>

          <div className="text-left text-[11px] space-y-3 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 text-slate-600 dark:text-slate-400 font-bold">
            <p className="uppercase text-[9px] tracking-widest text-slate-400 mb-2">Instrucciones</p>
            <li className="flex gap-3 list-none">
              <span className="flex items-center justify-center size-5 rounded-full bg-blue-600 text-[10px] text-white shrink-0">1</span>
              Clic en el botón para abrir el Dashboard.
            </li>
            <li className="flex gap-3 list-none">
              <span className="flex items-center justify-center size-5 rounded-full bg-blue-600 text-[10px] text-white shrink-0">2</span>
              Usa "Add user" → "Create new user".
            </li>
            <li className="flex gap-3 list-none">
              <span className="flex items-center justify-center size-5 rounded-full bg-blue-600 text-[10px] text-white shrink-0">3</span>
              Activa la opción "Auto Confirm User".
            </li>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => window.open(dashboardUrl, '_blank')}
            className="group relative w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl text-sm font-bold shadow-xl shadow-blue-600/20 hover:from-blue-700 hover:to-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-3 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <span>Abrir Dashboard</span>
            <ExternalLink size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={onClose}
            className="w-full px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
          >
            Cerrar guía
          </button>
        </div>
      </div>
    </Modal>
  );
}

