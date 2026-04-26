import { createClient } from '@supabase/supabase-js';

const supabase = createClient("https://shddjznwrfreskfwicbt.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZGRqem53cmZyZXNrZndpY2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTExMDMsImV4cCI6MjA5MDE4NzEwM30.OthjNkEPuVeTWz8sqJl6AtVWmA7eociqzvt8lerYhHI");

async function testFetch() {
  console.log("Testing fetch with secteur=47.71Z...");
  const start = Date.now();
  const { data, error } = await supabase
    .from('crm_leads')
    .select('id')
    .eq('secteur', '47.71Z')
    .limit(100);
  
  const duration = Date.now() - start;
  if (error) {
    console.error("Fetch failed:", error.message);
  } else {
    console.log(`Fetch success: ${data.length} IDs found in ${duration}ms`);
  }
}

testFetch();
