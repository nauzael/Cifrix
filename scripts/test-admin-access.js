import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testAdminAccess() {
  console.log('Testing Admin Access...');
  try {
    // Try to list users (admin only operation)
    const { data: { users }, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    
    if (error) {
      console.error('Error listing users:', error.message);
      return;
    }

    console.log('✅ Admin Access Verified!');
    console.log(`Found ${users.length} users (showing first page).`);
    
    // Try to check if profiles table exists by selecting 1 record
    const { error: tableError } = await supabase.from('profiles').select('id').limit(1);
    
    if (tableError) {
      if (tableError.code === '42P01') { // undefined_table
        console.warn('⚠️  Table "profiles" does not exist yet.');
        console.warn('   Please run the "supabase_setup_profiles.sql" script in your Supabase Dashboard SQL Editor.');
      } else {
        console.error('Error accessing profiles table:', tableError.message);
      }
    } else {
      console.log('✅ Table "profiles" exists and is accessible.');
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testAdminAccess();
