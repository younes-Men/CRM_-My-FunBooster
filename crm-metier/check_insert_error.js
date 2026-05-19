import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read supabase details from src/lib/supabase.js or .env
// To be safe, I'll extract it directly if I can, or use the one from .env

const env = fs.readFileSync('.env', 'utf-8');
const envVars = {};
env.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.join('=').trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const siret = '43218746600037';
  console.log(`Testing lead with SIRET: ${siret}`);
  
  const { data: lead, error: fetchError } = await supabase
    .from('crm_leads_2025')
    .select('*')
    .eq('siret', siret)
    .single();

  if (fetchError) {
    console.error('Error fetching lead:', fetchError);
    return;
  }
  
  console.log('Lead found:', lead.nom_entreprise);

  const { data: existingLead } = await supabase
    .from('crm_leads')
    .select('id')
    .eq('siret', lead.siret)
    .maybeSingle();

  if (existingLead) {
    console.log('Existing lead found in crm_leads, attempting update...');
    const { error: errUpd } = await supabase
      .from('crm_leads')
      .update({
        status: 'EN ATTENTE RDV',
        date_modification: new Date().toISOString()
      })
      .eq('id', existingLead.id);
    if (errUpd) console.error("Update failed:", errUpd);
    else console.log("Update success!");
  } else {
    console.log('Lead not found in crm_leads, attempting insert...');
    const payload = {
      nom_entreprise: lead.nom_entreprise,
      siret: lead.siret,
      tel: lead.tel,
      mobile: lead.mobile,
      nom_opco: lead.nom_opco,
      client_of: lead.client_of,
      gerant: lead.gerant,
      code_naf: lead.code_naf,
      libelle_activite: lead.libelle_activite,
      adresse: lead.adresse,
      code_postal: lead.code_postal,
      code_departement: lead.code_departement,
      statut_gerant: lead.statut_gerant,
      nb_salaries: lead.nb_salaries,
      nb_apprentis: lead.nb_apprentis,
      annee_budget: lead.annee_act,
      status: 'EN ATTENTE RDV',
      funebooster: lead.funebooster || 'Système',
      date_modification: new Date().toISOString()
    };
    console.log("Payload:", payload);
    const { error: errIns } = await supabase
      .from('crm_leads')
      .insert([payload]);
      
    if (errIns) console.error("Insert failed:", errIns);
    else console.log("Insert success!");
  }
}

testInsert();
