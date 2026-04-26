import { createClient } from '@supabase/supabase-js';

const supabase = createClient("https://shddjznwrfreskfwicbt.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZGRqem53cmZyZXNrZndpY2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTExMDMsImV4cCI6MjA5MDE4NzEwM30.OthjNkEPuVeTWz8sqJl6AtVWmA7eociqzvt8lerYhHI");

async function checkTeam() {
  const { data, error } = await supabase.from('team_members').select('*');
  if (error) {
    console.error("Error fetching team members:", error);
  } else {
    console.log("Team members in DB:", data.length);
    data.forEach(m => console.log(`- ${m.name} (${m.role}) [${m.is_active ? 'ACTIVE' : 'INACTIVE'}]`));
  }
}

checkTeam();
