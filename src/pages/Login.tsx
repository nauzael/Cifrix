import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, ShieldCheck, WifiOff, Wifi } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { saveUserToVault, authenticateFromVault, userExistsInVault } from '../lib/userVault';
import { resetReconnectionAttempts } from '../lib/reconnection';

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
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineMode, setOfflineMode] = useState(false);

  const { register, handleSubmit, formState: { errors }, watch } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const emailValue = watch('email');

  // Listener para detectar cambios en la conexión
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setOfflineMode(false);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setOfflineMode(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Verificar si el usuario existe en la bóveda cuando cambia el email
  useEffect(() => {
    if (emailValue && !isOnline) {
      userExistsInVault(emailValue).then(exists => {
        if (!exists) {
          setError('Este usuario no está registrado en este dispositivo. Necesita conexión a internet para el primer inicio de sesión.');
        } else {
          setError(null);
        }
      });
    }
  }, [emailValue, isOnline]);

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setError(null);

    try {
      // DECISIÓN: ¿Intentamos online u offline?
      if (isOnline) {
        await attemptOnlineLogin(data);
      } else {
        await attemptOfflineLogin(data);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Intento de login online (con Supabase)
   */
  const attemptOnlineLogin = async (data: LoginForm) => {
    try {
      // 1. Verificación preventiva de configuración
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
      if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
        throw new Error('Variables de entorno no detectadas. Por favor: 1. Asegúrese de que el archivo .env existe. 2. REINICIE el servidor de desarrollo.');
      }

      // 2. Intentar login con Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      // 3. Si hay éxito
      if (!authError && authData.user) {
        await handleOnlineLoginSuccess(authData.user, data.password);
        return;
      }

      // 4. Si hay error, verificar si es de red
      if (authError) {
        const errorMsg = authError.message?.toLowerCase() || '';

        // Si es error de red, intentar modo offline como fallback
        if (
          errorMsg.includes('failed to fetch') ||
          errorMsg.includes('network error') ||
          errorMsg.includes('load failed')
        ) {
          console.log('⚠️ Error de red detectado, intentando modo offline...');
          await attemptOfflineLogin(data);
          return;
        }

        // Si es error de credenciales, mostrar mensaje claro
        if (errorMsg.includes('invalid login credentials')) {
          throw new Error('Credenciales incorrectas. Verifique correo y contraseña.');
        }

        // Otros errores
        throw new Error(authError.message);
      }

      // 5. Verificación de sesión fantasma (fallback)
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) {
        console.log('✅ Sesión válida encontrada');
        await handleOnlineLoginSuccess(sessionData.session.user, data.password);
        return;
      }

      throw new Error('No se pudo iniciar sesión');
    } catch (err: any) {
      throw err;
    }
  };

  /**
   * Intento de login offline (usando la bóveda local)
   */
  const attemptOfflineLogin = async (data: LoginForm) => {
    try {
      console.log('🔒 Intentando autenticación offline...');

      // 1. Autenticar desde la bóveda
      const profile = await authenticateFromVault(data.email, data.password);

      // 2. Crear "Usuario Virtual"
      const virtualUser = {
        id: profile.userId,
        email: data.email,
        isOffline: true,
        app_metadata: {
          role: profile.role
        },
        user_metadata: {},
        created_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString()
      };

      // 3. Inyectar en el store
      setUser(virtualUser as any);

      // 4. Establecer el perfil manualmente (sin llamar a Supabase)
      useAuthStore.setState({
        user: virtualUser as any,
        profile: {
          role: profile.role,
          organizationId: profile.organizationId,
          organizationName: profile.organizationName,
          organizationType: profile.organizationType,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          phone: profile.phone,
          address: profile.address,
          job_title: profile.job_title,
          allowedModules: profile.allowedModules
        },
        loading: false,
        initialized: true
      });

      console.log('✅ Login offline exitoso');

      // 5. Navegar según el rol
      if (profile.role === 'SUPER_ADMIN') {
        navigate('/super-admin');
      } else {
        navigate('/app');
      }
    } catch (err: any) {
      throw err;
    }
  };

  /**
   * Manejo de login online exitoso
   */
  const handleOnlineLoginSuccess = async (user: any, password: string) => {
    setUser(user);

    // 1. Inicializar perfil desde Supabase
    try {
      await initialize();
    } catch (initErr) {
      console.error('Error inicializando perfil:', initErr);
    }

    const profile = useAuthStore.getState().profile;

    // 2. Guardar en la bóveda local para futuros logins offline
    if (profile) {
      try {
        await saveUserToVault(user.email, password, {
          userId: user.id,
          role: profile.role,
          organizationId: profile.organizationId,
          organizationName: profile.organizationName,
          organizationType: profile.organizationType,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          phone: profile.phone,
          address: profile.address,
          job_title: profile.job_title,
          allowedModules: profile.allowedModules
        });
        console.log('✅ Usuario guardado en la bóveda local');
      } catch (vaultErr) {
        console.error('⚠️ Error guardando en bóveda (no crítico):', vaultErr);
      }
    }

    // 3. Resetear contador de intentos de reconexión
    resetReconnectionAttempts();

    // 4. Navegar según el rol
    if (
      user.email === 'superadmin@cifrix.com' ||
      user.app_metadata?.role === 'superadmin' ||
      profile?.role === 'SUPER_ADMIN'
    ) {
      navigate('/super-admin');
    } else {
      navigate('/app');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-card p-8 rounded-3xl shadow-xl shadow-primary/5 border border-border">

        {/* Indicador de conexión */}
        {!isOnline && (
          <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl flex items-center gap-3">
            <WifiOff className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
            <div className="text-sm text-orange-800 dark:text-orange-200">
              <span className="font-bold">Modo Offline</span> - Los cambios se sincronizarán cuando vuelva la conexión
            </div>
          </div>
        )}

        {isOnline && offlineMode && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3">
            <Wifi className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <div className="text-sm text-green-800 dark:text-green-200">
              <span className="font-bold">Conexión restablecida</span>
            </div>
          </div>
        )}

        <div className="text-center">
          <div className="mx-auto size-16 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground mb-6 shadow-lg shadow-primary/20">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-3xl font-black text-foreground tracking-tight">
            Cifrix
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Inicia sesión en tu cuenta
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest mb-1.5">
                Correo Electrónico
              </label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                required
                className="w-full px-4 py-3 bg-muted/50 border-none rounded-xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-foreground"
                placeholder="ejemplo@correo.com"
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest mb-1.5">
                Contraseña
              </label>
              <input
                {...register('password')}
                type="password"
                autoComplete="current-password"
                required
                className="w-full px-4 py-3 bg-muted/50 border-none rounded-xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-foreground"
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
              <Link
                to="/forgot-password"
                className={`font-bold transition-colors ${isOnline
                  ? 'text-primary hover:text-primary/80'
                  : 'text-muted-foreground cursor-not-allowed'
                  }`}
                onClick={(e) => !isOnline && e.preventDefault()}
              >
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
              className={`group relative w-full flex justify-center py-4 px-4 text-primary-foreground text-sm font-black rounded-xl focus:outline-none focus:ring-4 transition-all shadow-lg disabled:opacity-50 ${isOnline
                ? 'bg-primary hover:bg-primary/90 focus:ring-primary/20 shadow-primary/25'
                : 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500/20 shadow-orange-600/25'
                }`}
            >
              {isLoading ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : (
                <span className="flex items-center gap-2">
                  {!isOnline && <WifiOff className="h-4 w-4" />}
                  {isOnline ? 'Ingresar al Sistema' : 'Ingresar Offline'}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
