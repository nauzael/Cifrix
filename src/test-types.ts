
import { Database } from '../types/database.types';
import { createClient } from '@supabase/supabase-js';

const db: Database = {} as any;
const campaigns = db.public.Tables.campaigns;
const insert: Database['public']['Tables']['campaigns']['Insert'] = {
  channel: 'email',
  recipients: 'all',
  subject: 'test',
  content: 'content',
  status: 'sent'
};

const supabase = createClient<Database>('', '');
(supabase.from('campaigns') as any).insert(insert);
