import { createClient } from '@supabase/supabase-js'
import { Database } from '../../types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Lógica de limpieza de caché si cambia la URL de Supabase
// IMPORTANTE: Solo limpiar datos de conexión, NO la sesión de autenticación
const STORAGE_KEY = 'cifrix_supabase_url';
const storedUrl = localStorage.getItem(STORAGE_KEY);

if (storedUrl && storedUrl !== supabaseUrl) {
  console.warn('⚠️ CAMBIO DE SUPABASE URL DETECTADO: Limpiando datos de conexión antigua...');

  // Guardar los tokens de autenticación ANTES de limpiar
  const authStorageKey = `sb-${supabaseUrl?.split('//')[1]?.split('.')[0]}-auth-token`;
  const authToken = localStorage.getItem(authStorageKey);

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
  // No recargar la página automáticamente, dejar que la app maneje el cambio
} else if (supabaseUrl) {
  localStorage.setItem(STORAGE_KEY, supabaseUrl);
}

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
  console.warn('⚠️ Cifrix: Corriendo en modo OFFLINE/DEMO. (Variables de Supabase faltantes o inválidas)');
  console.log('URL actual:', supabaseUrl);
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
