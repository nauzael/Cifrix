import { X, UserPlus, ExternalLink } from 'lucide-react';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateUserModal({ isOpen, onClose }: CreateUserModalProps) {
  if (!isOpen) return null;

  const projectId = 'zpiqnrvycuibrcehrlhs';
  const dashboardUrl = `https://supabase.com/dashboard/project/${projectId}/auth/users`;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20">
              <UserPlus className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Nuevo Usuario Global
              </h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Creación en Supabase
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all active:scale-90"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-100 dark:border-blue-800 text-center space-y-4">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center mx-auto mb-2 text-blue-600 dark:text-blue-200">
              <ExternalLink size={32} />
            </div>

            <h4 className="text-lg font-bold text-slate-900 dark:text-white">
              Creación Segura Externa
            </h4>

            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              Por razones de seguridad y permisos de base de datos, la creación de nuevos usuarios debe realizarse directamente en el panel de Supabase.
            </p>

            <ul className="text-left text-xs space-y-2 bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 font-medium">
              <li className="flex gap-2">
                <span className="text-blue-500 font-bold">1.</span>
                Clic en el botón de abajo para abrir Supabase.
              </li>
              <li className="flex gap-2">
                <span className="text-blue-500 font-bold">2.</span>
                Usa <span className="font-bold text-slate-700 dark:text-slate-300">"Add user"</span> → <span className="font-bold text-slate-700 dark:text-slate-300">"Create new user"</span>.
              </li>
              <li className="flex gap-2">
                <span className="text-blue-500 font-bold">3.</span>
                Ingresa Email, Password y <span className="text-amber-500 font-bold">ACTIVA "Auto Confirm User"</span>.
              </li>
              <li className="flex gap-2">
                <span className="text-blue-500 font-bold">4.</span>
                Vuelve aquí y recarga la página para asignar roles.
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => window.open(dashboardUrl, '_blank')}
              className="group relative w-full px-6 py-4 bg-blue-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 active:scale-95"
            >
              <span>Abrir Supabase Dashboard</span>
              <ExternalLink size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={onClose}
              className="w-full px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
