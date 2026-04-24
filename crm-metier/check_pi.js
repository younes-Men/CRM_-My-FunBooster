import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkPiLeads() {
  console.log("Checking leads with status PI or similar...");
  const { data, error } = await supabase
    .from('crm_leads')
    .select('id, status, nom_entreprise')
    .ilike('status', 'pi%')
    .limit(5);
  
  if (error) {
    console.error("Error fetching leads:", error);
  } else {
    console.log("Found leads:", data);
  }
}

checkPiLeads();
