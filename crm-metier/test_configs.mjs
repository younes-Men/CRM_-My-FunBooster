import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://shddjznwrfreskfwicbt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZGRqem53cmZyZXNrZndpY2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTExMDMsImV4cCI6MjA5MDE4NzEwM30.OthjNkEPuVeTWz8sqJl6AtVWmA7eociqzvt8lerYhHI'
);

async function testConfigs() {
  const { data, error } = await supabase
    .from('crm_column_configs')
    .select('*')
    .in('key', ['statut_2025', 'statut_2026', 'funebooster']);

  if (error) {
    console.error('❌ Erreur:', error.message);
    return;
  }

  console.log(`\n✅ crm_column_configs data:\n`);
  console.log(JSON.stringify(data, null, 2));
}

testConfigs();
