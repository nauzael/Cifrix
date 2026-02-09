import { createClient } from '@supabase/supabase-js'
import { Database } from '../../types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Lógica de limpieza de caché si cambia la URL
const STORAGE_KEY = 'cifrix_supabase_url';
const storedUrl = localStorage.getItem(STORAGE_KEY);

if (storedUrl && storedUrl !== supabaseUrl) {
  console.warn('⚠️ CAMBIO DE SUPABASE URL DETECTADO: Limpiando sesión antigua...');
  // Limpiar tokens de sesión antiguos para evitar errores de conexión
  localStorage.clear(); // Limpieza agresiva pero necesaria
  sessionStorage.clear();
  localStorage.setItem(STORAGE_KEY, supabaseUrl);
  window.location.reload(); // Recargar para aplicar cambios limpios
} else {
  localStorage.setItem(STORAGE_KEY, supabaseUrl);
}

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
  console.warn('⚠️ Cifrix: Corriendo en modo OFFLINE/DEMO. (Variables de Supabase faltantes o inválidas)');
} else {
  console.log('✅ Cifrix: Conexión configurada con Supabase:', supabaseUrl);
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
