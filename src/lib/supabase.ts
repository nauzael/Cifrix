import { createClient } from '@supabase/supabase-js'
import { Database } from '../../types/database.types'

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Limpiar URL y Key de posibles espacios en blanco accidentalmente añadidos en .env
const supabaseUrl = rawUrl?.trim();
const supabaseAnonKey = rawKey?.trim();

// Lógica de limpieza de caché si cambia la URL de Supabase
const STORAGE_KEY = 'cifrix_supabase_url';
const storedUrl = localStorage.getItem(STORAGE_KEY);

if (supabaseUrl && storedUrl && storedUrl !== supabaseUrl) {
  console.warn('⚠️ CAMBIO DE SUPABASE URL DETECTADO: Limpiando datos de conexión antigua...');

  try {
    // Guardar los tokens de autenticación ANTES de limpiar si es posible
    const projectRef = supabaseUrl.split('//')[1]?.split('.')[0];
    const authStorageKey = projectRef ? `sb-${projectRef}-auth-token` : null;
    const authToken = authStorageKey ? localStorage.getItem(authStorageKey) : null;

    // Limpiar solo datos de la aplicación, NO la autenticación
    const keysToPreserve = ['sb-', 'supabase.auth'];
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !keysToPreserve.some(prefix => key.includes(prefix))) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
    localStorage.setItem(STORAGE_KEY, supabaseUrl);
  } catch (err) {
    console.error('Error during cleanup logic:', err);
  }
} else if (supabaseUrl) {
  localStorage.setItem(STORAGE_KEY, supabaseUrl);
}

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
  console.warn('⚠️ Cifrix: Corriendo en modo OFFLINE/DEMO. (Variables de Supabase faltantes o inválidas)');
  console.log('DEBUG - Env Check:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    urlValue: supabaseUrl?.substring(0, 10) + '...',
    envKeys: Object.keys(import.meta.env).filter(k => k.startsWith('VITE_'))
  });
} else {
  try {
    const urlCheck = new URL(supabaseUrl);
    console.log('✅ Cifrix: Conexión configurada con Supabase:', urlCheck.hostname);
  } catch (e) {
    console.error('❌ Cifrix: URL de Supabase inválida:', supabaseUrl);
  }
}

export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
)

// Simple health check function
export async function testConnection() {
  try {
    const { data, error } = await supabase.from('organizations').select('count', { count: 'exact', head: true });
    if (error) throw error;
    return { success: true, message: 'Conexión exitosa con la base de datos.' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
