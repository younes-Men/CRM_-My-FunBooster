import { createClient } from '@supabase/supabase-js';

const supabase = createClient("https://shddjznwrfreskfwicbt.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZGRqem53cmZyZXNrZndpY2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTExMDMsImV4cCI6MjA5MDE4NzEwM30.OthjNkEPuVeTWz8sqJl6AtVWmA7eociqzvt8lerYhHI");

async function listTables() {
  const tablesToTry = ['profiles', 'users', 'team_members', 'crm_leads'];
  
  for (const table of tablesToTry) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (!error) {
        console.log(`Table '${table}' exists and is accessible.`);
      } else {
        console.log(`Table '${table}' check failed: ${error.message}`);
      }
    } catch (e) {
      console.log(`Table '${table}' check error: ${e.message}`);
    }
  }
}

listTables();
