import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://shddjznwrfreskfwicbt.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZGRqem53cmZyZXNrZndpY2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTExMDMsImV4cCI6MjA5MDE4NzEwM30.OthjNkEPuVeTWz8sqJl6AtVWmA7eociqzvt8lerYhHI";

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('crm_leads')
    .select('id, status')
    .ilike('status', '%nuit%');

  if (error) {
    console.error('Error fetching leads:', error);
  } else {
    console.log(`Found ${data.length} leads with "nuit" in status:`, data.slice(0, 5));
  }
}

check();
