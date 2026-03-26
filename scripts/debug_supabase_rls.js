import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectUserOrgs() {
  const { data: profiles } = await supabase.from('profiles').select('*');
  console.log('Profiles:', profiles);
  const myUserId = profiles[0].id;
  
  const { data: userOrgs } = await supabase.from('user_organizations').select('*').eq('user_id', myUserId);
  console.log('User orgs for myUserId:', myUserId);
  console.log(userOrgs);
}

inspectUserOrgs().catch(console.error);
