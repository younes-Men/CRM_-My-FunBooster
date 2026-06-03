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

async function checkData() {
  const sirets = [
    '47792405400026', // HOTEL CENTRAL LA DE...
    '44508118500115', // PLUS VALUE
    '43263407900011', // C.R. HOTELLERIE
    '81882259500018'  // LES CHTIS NORMANDS
  ];

  const { data, error } = await supabase
    .from('crm_leads')
    .select('*')
    .in('siret', sirets);

  if (error) {
    console.error(error);
  } else {
    data.forEach(l => {
      console.log({
        nom_entreprise: l.nom_entreprise,
        siret: l.siret,
        code_departement: l.code_departement,
        code_naf: l.code_naf,
        status: l.status,
        funebooster: l.funebooster,
        client_of: l.client_of
      });
    });
  }
}

checkData();
