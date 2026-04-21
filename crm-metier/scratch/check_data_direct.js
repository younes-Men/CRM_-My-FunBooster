import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://shddjznwrfreskfwicbt.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZGRqem53cmZyZXNrZndpY2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTExMDMsImV4cCI6MjA5MDE4NzEwM30.OthjNkEPuVeTWz8sqJl6AtVWmA7eociqzvt8lerYhHI";

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('crm_leads').select('*').limit(1);
  if (error) {
    console.error('Error fetching leads:', error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('Columns in crm_leads:', Object.keys(data[0]));
    console.log('Sample data - secteur:', data[0].secteur);
    console.log('Sample data - code_naf:', data[0].code_naf);
  } else {
    console.log('No data found in crm_leads');
  }
}

check();
