import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://shddjznwrfreskfwicbt.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZGRqem53cmZyZXNrZndpY2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTExMDMsImV4cCI6MjA5MDE4NzEwM30.OthjNkEPuVeTWz8sqJl6AtVWmA7eociqzvt8lerYhHI";

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
  console.log('--- Cleaning up "Nuit - A traiter" leads ---');
  
  // First fetch the IDs to be safe
  const { data: toDelete, error: fetchError } = await supabase
    .from('crm_leads')
    .select('id')
    .ilike('status', 'Nuit - A traiter');

  if (fetchError) {
    console.error('Error fetching leads:', fetchError);
    return;
  }

  if (toDelete.length === 0) {
    console.log('No leads found to delete.');
    return;
  }

  const ids = toDelete.map(l => l.id);
  console.log(`Deleting ${ids.length} leads...`);

  const { error: deleteError } = await supabase
    .from('crm_leads')
    .delete()
    .in('id', ids);

  if (deleteError) {
    console.error('Error deleting leads:', deleteError);
  } else {
    console.log(`Successfully deleted ${ids.length} leads.`);
  }
}

cleanup();
