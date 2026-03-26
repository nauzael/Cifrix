import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function trialAndErrorStatus() {
  const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
  const realUserId = profiles[0].id;
  
  const statuses = ["active", "ACTIVE", "Active", "pending", "PENDING", undefined];

  for (const s of statuses) {
    const org = {
      id: crypto.randomUUID(),
      name: `Test Org Status ${s}`,
      tax_id: `901648841-${Math.floor(Math.random() * 1000)}`, 
      type: 'EMPRESA',
      created_by: realUserId
    };
    if (s !== undefined) {
      org.status = s;
    }
    
    const { error } = await supabase.from('organizations').insert(org);

    if (error) {
      if (error.code === '23514') {
        // failed check constraint
        console.log(`[Rechazado] Status: ${s}`);
      } else {
        console.log(`[Otro Error ${error.code}] con status: ${s} - Mensaje: ${error.message}`);
      }
    } else {
      console.log(`[✓ ACEPTADO] El status correcto es: ${s}`);
      return; // Stop on first success
    }
  }
}

trialAndErrorStatus().catch(console.error);
