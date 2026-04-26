import { createClient } from '@supabase/supabase-js';

const supabase = createClient("https://shddjznwrfreskfwicbt.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZGRqem53cmZyZXNrZndpY2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTExMDMsImV4cCI6MjA5MDE4NzEwM30.OthjNkEPuVeTWz8sqJl6AtVWmA7eociqzvt8lerYhHI");

async function checkFinalCount() {
  const { count, error } = await supabase
    .from('crm_leads')
    .select('*', { count: 'exact', head: true })
    .eq('nom_opco', 'OPCOMMERCE');
  
  if (error) {
    console.error("Erreur:", error.message);
  } else {
    console.log(`📊 Nouveau total OPCOMMERCE: ${count}`);
  }
}

checkFinalCount();
