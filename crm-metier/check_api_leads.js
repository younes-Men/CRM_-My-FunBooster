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

async function checkApiLeads() {
  const sirets = [
    '45244038100989', // SOCIETE D'EXPLOITAT...
    '40206971000075', // SOCIETE D'INVESTISS...
    '90811974600026', // TANDEM SAS
    '53282047600018', // MARIE-PIERRE SOUR...
    '31136231300562'  // SOCIETE D'EXPLOITAT...
  ];

  console.log("Checking if virtual leads from the screenshot exist in crm_leads...");
  const { data, error } = await supabase
    .from('crm_leads')
    .select('*')
    .in('siret', sirets);

  if (error) {
    console.error(error);
  } else {
    console.log(`Found ${data.length} records:`);
    data.forEach(l => {
      console.log({
        nom_entreprise: l.nom_entreprise,
        siret: l.siret,
        code_departement: l.code_departement,
        code_naf: l.code_naf,
        status: l.status,
        funebooster: l.funebooster,
        client_of: l.client_of,
        date_modification: l.date_modification
      });
    });
  }
}

checkApiLeads();
