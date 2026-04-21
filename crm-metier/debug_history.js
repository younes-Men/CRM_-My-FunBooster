import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkHistory() {
  console.log('Checking history table...');
  const { data, error } = await supabase.from('crm_observations_history').select('*');
  if (error) console.error('Error:', error);
  else console.log('Data:', data);
}

checkHistory();
