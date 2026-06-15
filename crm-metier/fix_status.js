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

async function fix() {
  console.log('Fixing statut_2025 for recently migrated RDVs...');
  
  // Find leads inserted after 09:20 UTC
  const { data, error } = await supabase
    .from('crm_leads_2025')
    .select('id, nom_entreprise, created_at')
    .gte('created_at', '2026-06-15T09:25:00.000Z');
    
  if (error) {
    console.error('Error fetching recent leads:', error);
    return;
  }
  
  console.log(`Found ${data.length} leads inserted during migration.`);
  
  const ids = data.map(d => d.id);
  if (ids.length > 0) {
    const { error: updateErr } = await supabase
      .from('crm_leads_2025')
      .update({ statut_2025: 'A TRAITER' })
      .in('id', ids);
      
    if (updateErr) {
      console.error('Error updating:', updateErr);
    } else {
      console.log('Successfully updated statut_2025 to A TRAITER for', ids.length, 'leads.');
    }
  } else {
    console.log('No recent leads found to update.');
  }
}

fix();
