
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  console.log('--- Checking for Super Admin ---');
  
  const email = 'superadmin@cifrix.com';
  
  // List users to find superadmin
  const { data: { users }, error } = await supabase.auth.admin.listUsers();

  if (error) {
    console.error('Error listing users:', error);
    return;
  }

  const superAdmin = users.find(u => u.email === email);

  if (superAdmin) {
    console.log(`✅ Super Admin found: ${superAdmin.email} (ID: ${superAdmin.id})`);
    
    // Reset password to a known value
    const newPassword = 'SuperAdminPassword123!';
    
    const { data, error: updateError } = await supabase.auth.admin.updateUserById(
      superAdmin.id,
      { password: newPassword }
    );
    
    if (updateError) {
      console.error('Error resetting password:', updateError);
    } else {
      console.log(`\n🎉 Password reset successfully!`);
      console.log(`📧 Email: ${email}`);
      console.log(`🔑 Password: ${newPassword}`);
    }
    
  } else {
    console.log(`❌ Super Admin not found. Creating one...`);
    
    const newPassword = 'SuperAdminPassword123!';
    
    const { data, error: createError } = await supabase.auth.admin.createUser({
      email: email,
      password: newPassword,
      email_confirm: true,
      user_metadata: {
        name: 'Super Admin',
        role: 'SUPER_ADMIN'
      },
      app_metadata: {
        role: 'superadmin'
      }
    });

    if (createError) {
      console.error('Error creating super admin:', createError);
    } else {
      console.log(`\n🎉 Super Admin created successfully!`);
      console.log(`📧 Email: ${email}`);
      console.log(`🔑 Password: ${newPassword}`);
      
      // Also ensure profile exists
      // The trigger should handle it, but we can verify or insert if needed via RPC or direct insert if we had access
    }
  }
}

main();
