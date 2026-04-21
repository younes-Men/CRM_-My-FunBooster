import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase.from('crm_leads').select('*').limit(1);
  if (error) {
    console.error(error);
  } else {
    console.log('Columns found:', Object.keys(data[0] || {}));
  }
}

check();
