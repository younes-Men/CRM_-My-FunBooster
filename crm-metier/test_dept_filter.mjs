import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://shddjznwrfreskfwicbt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZGRqem53cmZyZXNrZndpY2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTExMDMsImV4cCI6MjA5MDE4NzEwM30.OthjNkEPuVeTWz8sqJl6AtVWmA7eociqzvt8lerYhHI'
);

async function test() {
  const dept = '60';
  const d = String(dept).padStart(2, '0');

  // Test: " 60%" → matches " 60100 CREIL"
  const { data, error, count } = await supabase
    .from('crm_leads_2025')
    .select('nom_entreprise, adresse', { count: 'exact' })
    .ilike('adresse', `% ${d}%`)
    .limit(10);

  if (error) {
    console.error('❌ Erreur:', error.message);
    return;
  }

  console.log(`\n✅ Pattern "% ${d}%" → ${count} résultats\n`);
  data.forEach(r => {
    const cpMatch = String(r.adresse || '').match(/\b(\d{5})\b/);
    console.log(`  - "${r.adresse}" | CP extrait: ${cpMatch ? cpMatch[1] : '?'}`);
  });
}

test();
