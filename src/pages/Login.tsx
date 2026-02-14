import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { db } from '../lib/db';
import { v4 as uuidv4 } from 'uuid';
import { logActivity } from '../lib/audit';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { setUser, initialize } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Verificación preventiva de configuración
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
      if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
        throw new Error('Configuración de Supabase no detectada. Verifique que su archivo .env contenga VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.');
      }

      // 2. Intentar login
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      // 3. Si no hay error y hay usuario, éxito directo
      if (!authError && authData.user) {
        await handleLoginSuccess(authData.user);
        return;
      }

      // 4. Si hay error, lanzarlo para manejo, EXCEPTO si es el de schema
      throw authError; // El catch manejará la verificación de "sesión fantasma"

    } catch (err: any) {
      console.error("Detailed Login Error:", err);

      // 5. SOLUCIÓN FINAL: Verificación agnóstica de sesión
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.user) {
          console.log("Valid session found despite error. Logging in...");
          await handleLoginSuccess(sessionData.session.user);
          return;
        }
      } catch (sessionCheckErr) {
        console.error("Session check failed:", sessionCheckErr);
      }

      // 6. Si llegamos aquí, realmente falló
      const rawError = err?.message || err?.toString() || 'Error desconocido';
      let errorMessage = rawError;

      // Normalizar error de red (Failed to fetch es común en Chrome/Firefox/Safari)
      if (
        errorMessage.toLowerCase().includes('failed to fetch') ||
        errorMessage.toLowerCase().includes('network error') ||
        errorMessage.toLowerCase().includes('load failed') ||
        err?.name === 'TypeError'
      ) {
        errorMessage = 'No se pudo conectar con el servidor de Supabase. Verifique su conexión a internet o si un bloqueador de anuncios (AdBlock) está impidiendo la conexión.';
      }

      if (errorMessage.includes('Invalid login credentials')) {
        setError('Credenciales incorrectas. Verifique correo y contraseña.');
      } else if (errorMessage.includes('querying schema') || errorMessage.includes('schema cache')) {
        setError('Error crítico de base de datos (Schema Cache). Por favor ejecute el script SUPER_ADMIN_FIX_SCHEMA.sql en Supabase.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = async (user: any) => {
    setUser(user);

    // Initialize store to fetch profile
    try {
      await initialize();
    } catch (initErr) {
      console.error("Error initializing profile:", initErr);
    }

    const profile = useAuthStore.getState().profile;

    // Check if user is superadmin
    if (
      user.email === 'superadmin@cifrix.com' ||
      user.app_metadata?.role === 'superadmin' ||
      profile?.role === 'SUPER_ADMIN'
    ) {
      navigate('/super-admin');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800">
        <div className="text-center">
          <div className="mx-auto size-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-blue-600/20">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Cifrix
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Inicia sesión en tu cuenta
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Correo Electrónico</label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                required
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all dark:text-white"
                placeholder="ejemplo@correo.com"
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Contraseña</label>
              <input
                {...register('password')}
                type="password"
                autoComplete="current-password"
                required
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all dark:text-white"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
            </div>
            <div className="text-sm">
              <Link to="/forgot-password" className="font-bold text-blue-600 hover:text-blue-700 transition-colors">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-800">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-4 px-4 bg-blue-600 text-white text-sm font-black rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : (
                'Ingresar al Sistema'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
