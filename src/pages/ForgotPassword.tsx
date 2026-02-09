import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { Loader2, ArrowLeft, Mail, CheckCircle } from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export const ForgotPassword: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setIsLoading(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (authError) throw authError;
      setIsSent(true);
    } catch (err: any) {
      setError(err.message || 'Error al enviar el correo de recuperación.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800">
        <div>
          <Link to="/login" className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors mb-6 font-bold">
            <ArrowLeft size={16} /> Volver al inicio
          </Link>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Recuperar Contraseña
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {isSent 
              ? 'Hemos enviado un enlace a tu correo electrónico.' 
              : 'Ingresa tu correo para recibir un enlace de recuperación.'}
          </p>
        </div>

        {isSent ? (
          <div className="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800 p-6 rounded-2xl text-center space-y-4">
            <div className="mx-auto size-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
              <CheckCircle size={24} />
            </div>
            <p className="text-sm text-green-800 dark:text-green-200">
              Si existe una cuenta asociada a este correo, recibirás instrucciones en unos minutos.
            </p>
            <Link 
              to="/login" 
              className="block w-full py-4 px-4 bg-green-600 text-white font-black rounded-xl hover:bg-green-700 transition-all shadow-lg shadow-green-600/20"
            >
              Ir al Login
            </Link>
          </div>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  {...register('email')}
                  type="email"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all dark:text-white"
                  placeholder="ejemplo@correo.com"
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-800">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-4 px-4 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : (
                'Enviar Enlace'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
