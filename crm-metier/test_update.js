import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testUpdate() {
  const testId = 'f9d979ea-1a46-4820-9da2-810c26797db2';
  console.log(`Trying to update lead ${testId} from 'Pi' to 'A TRAITER'...`);
  
  const { data, error } = await supabase
    .from('crm_leads')
    .update({ status: 'A TRAITER', date_modification: new Date().toISOString() })
    .eq('id', testId)
    .select();
  
  if (error) {
    console.error("UPDATE ERROR:", error);
  } else {
    console.log("UPDATE SUCCESS:", data);
  }
}

testUpdate();
