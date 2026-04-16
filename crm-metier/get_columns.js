import { createClient } from '@supabase/supabase-js';
// Using node --env-file=.env instead of dotenv
// import dotenv from 'dotenv';
// dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function getSchema() {
  const { data, error } = await supabase
    .from('crm_leads')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching data:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Columns in crm_leads:');
    console.log(Object.keys(data[0]));
  } else {
    console.log('No data found in crm_leads');
  }
}

getSchema();
