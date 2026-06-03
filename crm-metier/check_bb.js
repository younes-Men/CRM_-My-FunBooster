import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('c:/Users/dell/Desktop/CRM_Lykos/crm-metier/.env', 'utf-8');
const envVars = {};
env.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    let valStr = value.join('=').trim();
    if (valStr.startsWith('"') && valStr.endsWith('"')) {
      valStr = valStr.substring(1, valStr.length - 1);
    }
    envVars[key.trim()] = valStr;
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBB() {
  const { data, error } = await supabase
    .from('crm_leads')
    .select('*')
    .eq('siret', '37804750001242');

  if (error) {
    console.error(error);
  } else {
    console.log(data);
  }
}

checkBB();
