import { createClient } from '@supabase/supabase-js';

const supabase = createClient("https://shddjznwrfreskfwicbt.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZGRqem53cmZyZXNrZndpY2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTExMDMsImV4cCI6MjA5MDE4NzEwM30.OthjNkEPuVeTWz8sqJl6AtVWmA7eociqzvt8lerYhHI");

async function checkSample() {
  // Get first 10 leads with OPCOMMERCE to see if they are there
  const { data, error } = await supabase
    .from('crm_leads')
    .select('id, nom_entreprise, code_naf, secteur')
    .eq('nom_opco', 'OPCOMMERCE')
    .limit(10);
  
  if (error) {
    console.error("Erreur sample:", error.message);
  } else {
    console.log(`Found ${data.length} OPCOMMERCE leads.`);
    data.forEach(l => console.log(`- ${l.nom_entreprise} (NAF: ${l.code_naf}, Secteur: ${l.secteur})`));
  }
}

checkSample();
