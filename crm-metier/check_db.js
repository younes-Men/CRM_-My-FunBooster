import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkTables() {
  console.log("Checking Supabase connection...");
  
  const tables = ['crm_leads', 'leads_crm', 'entreprise', 'leads'];
  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
        
      if (error) {
        console.log(`Table '${table}' error: ${error.message}`);
      } else {
        console.log(`Table '${table}' exists. Rows: ${count}`);
      }
    } catch (e) {
      console.log(`Error checking table '${table}': ${e.message}`);
    }
  }
}

checkTables();
