import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const envLines = envContent.split('\n');
let supabaseUrl = '';
let supabaseKey = '';

for (const line of envLines) {
  if (line.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = line.split('=')[1].replace(/"/g, '').trim();
  }
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
    supabaseKey = line.split('=')[1].replace(/"/g, '').trim();
  }
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log('Fetching schema info...');
  const { data: sample2025, error: sampleErr } = await supabase
    .from('crm_leads_2025')
    .select('*')
    .limit(1);
    
  if (sampleErr) {
    console.error('Error fetching sample from 2025:', sampleErr);
    return;
  }
  
  if (!sample2025 || sample2025.length === 0) {
    console.log("No existing rows in crm_leads_2025 to determine schema. Cannot proceed safely.");
    return;
  }
  
  const validKeys2025 = Object.keys(sample2025[0]);
  
  console.log('Fetching RDVs from crm_leads...');
  const { data: rdvs, error } = await supabase
    .from('crm_leads')
    .select('*')
    .eq('status', 'RDV');
    
  if (error) {
    console.error('Error fetching RDVs:', error);
    return;
  }
  
  console.log(`Found ${rdvs.length} RDVs to process.`);
  let added = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const rdv of rdvs) {
    if (rdv.siret) {
      const { data: existing } = await supabase
        .from('crm_leads_2025')
        .select('id')
        .eq('siret', rdv.siret)
        .limit(1);
        
      if (existing && existing.length > 0) {
        skipped++;
        continue;
      }
    } else if (rdv.nom_entreprise) {
      const { data: existingByName } = await supabase
        .from('crm_leads_2025')
        .select('id')
        .eq('nom_entreprise', rdv.nom_entreprise)
        .limit(1);
      if (existingByName && existingByName.length > 0) {
        skipped++;
        continue;
      }
    }
    
    // Copy only valid keys
    const copy = {};
    for (const key of Object.keys(rdv)) {
      if (validKeys2025.includes(key)) {
        copy[key] = rdv[key];
      }
    }
    
    copy.statut_2026 = 'RDV VALIDE';
    copy.statut_2025 = 'RDV';
    
    delete copy.id;
    delete copy.created_at;
    
    let insertCopy = { ...copy };
    let { error: insertError } = await supabase
      .from('crm_leads_2025')
      .insert(insertCopy);
      
    if (insertError && insertError.message.includes('varying(50)')) {
      for (const key of Object.keys(insertCopy)) {
        if (typeof insertCopy[key] === 'string' && !['adresse', 'observation', 'libelle_activite', 'secteur_activite'].includes(key)) {
          if (insertCopy[key].length > 50) {
            insertCopy[key] = insertCopy[key].substring(0, 50);
          }
        }
      }
      const retry = await supabase.from('crm_leads_2025').insert(insertCopy);
      insertError = retry.error;
    }
      
    if (insertError) {
      console.error(`Error inserting ${rdv.nom_entreprise}:`, insertError.message);
      errors++;
    } else {
      console.log(`Inserted: ${rdv.nom_entreprise}`);
      added++;
    }
  }
  
  console.log(`Migration finished. Added: ${added}, Skipped: ${skipped}, Errors: ${errors}`);
}

migrate();
