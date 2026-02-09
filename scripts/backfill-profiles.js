import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: Variables de entorno faltantes.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function backfillProfiles() {
  console.log('🔄 Iniciando sincronización de perfiles...');
  
  // 1. Fetch all users
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
  
  if (usersError) {
    console.error('❌ Error obteniendo usuarios:', usersError.message);
    return;
  }

  console.log(`👥 Se encontraron ${users.length} usuarios.`);
  let updatedCount = 0;
  let errorCount = 0;

  for (const user of users) {
    try {
      // Check if profile exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!profile) {
        // Create profile
        const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Usuario';
        const avatarUrl = user.user_metadata?.avatar_url || null;

        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            full_name: fullName,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error(`❌ Error creando perfil para ${user.email}:`, insertError.message);
          errorCount++;
        } else {
          console.log(`✅ Perfil creado para: ${user.email}`);
          updatedCount++;
        }
      }
    } catch (err) {
      console.error(`❌ Excepción procesando ${user.email}:`, err);
      errorCount++;
    }
  }

  console.log('-----------------------------------');
  console.log(`🏁 Sincronización completada.`);
  console.log(`✨ Perfiles creados: ${updatedCount}`);
  console.log(`⚠️ Errores: ${errorCount}`);
}

backfillProfiles();
