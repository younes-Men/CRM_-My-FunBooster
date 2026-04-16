import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://shddjznwrfreskfwicbt.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZGRqem53cmZyZXNrZndpY2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTExMDMsImV4cCI6MjA5MDE4NzEwM30.OthjNkEPuVeTWz8sqJl6AtVWmA7eociqzvt8lerYhHI"
);

const { data } = await supabase
  .from('crm_leads')
  .select('status')
  .not('status', 'is', null)
  .limit(5000);

const unique = [...new Set(data.map(r => r.status))].sort();
console.log('Statuts distincts:', unique);
