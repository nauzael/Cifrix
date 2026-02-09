import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';

export const Register: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Optional: Auto redirect after 3 seconds
    const timer = setTimeout(() => {
      navigate('/login');
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800">
        <div className="mx-auto bg-slate-100 dark:bg-slate-800 p-6 rounded-2xl w-20 h-20 flex items-center justify-center mb-6">
            <Lock className="text-slate-400" size={32} />
        </div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Registro Deshabilitado
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          La creación de nuevas cuentas solo puede ser realizada por el administrador del sistema.
        </p>
        <div className="mt-8">
            <button
                onClick={() => navigate('/login')}
                className="w-full flex justify-center py-4 px-4 bg-blue-600 text-white text-sm font-black rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all shadow-lg shadow-blue-600/25"
            >
                Volver al Inicio de Sesión
            </button>
        </div>
      </div>
    </div>
  );
};
