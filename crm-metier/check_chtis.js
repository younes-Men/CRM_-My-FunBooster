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

async function checkChtis() {
  // Let's run a query similar to fetchPage with filters: code_departement = '14' and code_naf = '47.78C'
  console.log("Simulating fetchPage with filters: code_departement=['14'], code_naf=['47.78C']");
  
  let query = supabase.from('crm_leads').select('*');
  
  // Apply conditions
  query = query.or('code_departement.ilike.14');
  query = query.or('code_naf.ilike.47.78C,secteur.ilike.47.78C');
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching:', error);
  } else {
    console.log(`Found ${data.length} results:`);
    data.forEach(l => {
      console.log({
        nom_entreprise: l.nom_entreprise,
        code_departement: l.code_departement,
        code_naf: l.code_naf,
        status: l.status,
        funebooster: l.funebooster
      });
    });
  }
}

checkChtis();
