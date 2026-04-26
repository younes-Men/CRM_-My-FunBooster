import { createClient } from '@supabase/supabase-js';

const supabase = createClient("https://shddjznwrfreskfwicbt.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZGRqem53cmZyZXNrZndpY2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTExMDMsImV4cCI6MjA5MDE4NzEwM30.OthjNkEPuVeTWz8sqJl6AtVWmA7eociqzvt8lerYhHI");

async function checkSchema() {
  const { data, error } = await supabase.from('crm_leads').select('*').limit(1);
  if (!error && data[0]) {
    console.log("Columns:", Object.keys(data[0]));
  }
  
  // Also count total leads
  const { count, error: err2 } = await supabase.from('crm_leads').select('*', { count: 'exact', head: true });
  console.log("Total leads in DB:", count);
}

checkSchema();
