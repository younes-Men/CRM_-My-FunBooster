import { createClient } from '@supabase/supabase-js';

const supabase = createClient("https://shddjznwrfreskfwicbt.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZGRqem53cmZyZXNrZndpY2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTExMDMsImV4cCI6MjA5MDE4NzEwM30.OthjNkEPuVeTWz8sqJl6AtVWmA7eociqzvt8lerYhHI");

async function analyzeNaf() {
  console.log("Analyzing NAF distribution...");
  
  // Get a sample of 1000 leads and count NAFs
  const { data, error } = await supabase.from('crm_leads').select('code_naf, nom_opco').limit(1000);
  if (error) {
    console.error(error);
    return;
  }
  
  const nafCounts = {};
  data.forEach(item => {
    const naf = item.code_naf || 'MISSING';
    nafCounts[naf] = (nafCounts[naf] || 0) + 1;
  });
  
  console.log("Sample NAF distribution:", Object.entries(nafCounts).sort((a,b) => b[1] - a[1]).slice(0, 20));
  
  // Check if some leads use 'secteur' column for NAF
  const { data: data2 } = await supabase.from('crm_leads').select('secteur').limit(10);
  console.log("Sample secteurs:", data2);
}

analyzeNaf();
