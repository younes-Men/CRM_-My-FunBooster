import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkTriggers() {
  console.log("Checking triggers on crm_leads...");
  const { data, error } = await supabase.rpc('get_triggers', { table_name: 'crm_leads' });
  
  if (error) {
    // If RPC doesn't exist, try a direct query to pg_trigger if possible (unlikely via anon key)
    console.log("Error calling get_triggers RPC:", error.message);
    
    // Alternative: Just check if we can see any triggers via a custom query if allowed
    const { data: data2, error: error2 } = await supabase
      .from('crm_leads')
      .select('status')
      .limit(1);
    
    console.log("Sample lead status:", data2?.[0]?.status);
  } else {
    console.log("Triggers found:", data);
  }
}

checkTriggers();
