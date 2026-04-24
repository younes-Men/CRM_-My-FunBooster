import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function findRouvroy() {
  console.log("Finding lead in ROUVROY with status PI...");
  const { data, error } = await supabase
    .from('crm_leads')
    .select('id, status, nom_entreprise, adresse')
    .ilike('adresse', '%ROUVROY%')
    .ilike('status', 'pi%')
    .limit(1);
  
  if (error) {
    console.error("Error:", error);
  } else if (data && data.length > 0) {
    const lead = data[0];
    console.log("Found lead:", lead);
    
    console.log("Testing update...");
    const { data: updateData, error: updateError } = await supabase
      .from('crm_leads')
      .update({ status: 'A TRAITER', date_modification: new Date().toISOString() })
      .eq('id', lead.id)
      .select();
    
    if (updateError) {
      console.error("Update failed:", updateError);
    } else {
      console.log("Update succeeded:", updateData[0].status);
      
      // Wait a bit and check again if it was reverted
      console.log("Waiting 5 seconds to see if a trigger reverts it...");
      await new Promise(r => setTimeout(r, 5000));
      
      const { data: checkData } = await supabase
        .from('crm_leads')
        .select('status')
        .eq('id', lead.id);
      
      console.log("Status after 5s:", checkData[0].status);
    }
  } else {
    console.log("No matching lead found.");
  }
}

findRouvroy();
