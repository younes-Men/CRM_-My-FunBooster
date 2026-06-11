import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://shddjznwrfreskfwicbt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZGRqem53cmZyZXNrZndpY2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTExMDMsImV4cCI6MjA5MDE4NzEwM30.OthjNkEPuVeTWz8sqJl6AtVWmA7eociqzvt8lerYhHI'
);

async function testInsert() {
  const { data, error } = await supabase
    .from('crm_column_configs')
    .insert({
      key: 'test_key',
      label: 'Test Key',
      type: 'select',
      options: ['test'],
      is_visible: true,
      display_order: 999
    })
    .select();

  if (error) {
    console.error('❌ Insert Error:', error.message);
  } else {
    console.log('✅ Insert Success:', data);
    
    // Clean up
    await supabase.from('crm_column_configs').delete().eq('key', 'test_key');
  }
}

testInsert();
