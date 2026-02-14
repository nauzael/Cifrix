
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Testing connection to:', supabaseUrl);

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
    try {
        const { data, error } = await supabase.from('organizations').select('id').limit(1);
        if (error) {
            console.error('❌ Connection error (Supabase response):', error.message);
        } else {
            console.log('✅ Connection successful. Data found:', data);
        }
    } catch (err) {
        console.error('❌ Network error (Failed to fetch):', err.message);
    }
}

test();
