import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://shddjznwrfreskfwicbt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZGRqem53cmZyZXNrZndpY2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTExMDMsImV4cCI6MjA5MDE4NzEwM30.OthjNkEPuVeTWz8sqJl6AtVWmA7eociqzvt8lerYhHI'
);

async function testQuery() {
  const { data, error } = await supabase
    .from('crm_leads_2025')
    .select('custom_fields')
    .limit(1);

  if (error) {
    console.error('❌ Query Error:', error.message);
  } else {
    console.log('✅ Query Success:', data);
  }
}

testQuery();
