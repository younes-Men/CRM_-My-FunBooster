import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://shddjznwrfreskfwicbt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZGRqem53cmZyZXNrZndpY2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTExMDMsImV4cCI6MjA5MDE4NzEwM30.OthjNkEPuVeTWz8sqJl6AtVWmA7eociqzvt8lerYhHI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SIRETS = [
  '39081030700053',
  '94809369500013',
  '84538380100014',
  '82132291400010',
  '95390077600014',
  '91094029500017',
  '89858640900010',
  '87859954700014',
  '49341825500011',
  '47835038200048',
];

async function main() {
  console.log(`\n🔄 Mise à jour statut_2026 = "PROPOSITION" pour ${SIRETS.length} SIRETs...\n`);

  let updated = 0;
  let notFound = [];

  for (const siret of SIRETS) {
    // Chercher avec et sans espaces
    const { data, error } = await supabase
      .from('crm_leads_2025')
      .update({ statut_2026: 'PROPOSITION', date_modification: new Date().toISOString() })
      .or(`siret.eq.${siret},siret.ilike.%${siret}%`)
      .select('nom_entreprise, siret, statut_2026');

    if (error) {
      console.error(`❌ Erreur SIRET ${siret}:`, error.message);
    } else if (!data || data.length === 0) {
      notFound.push(siret);
      console.warn(`⚠️  SIRET non trouvé: ${siret}`);
    } else {
      updated += data.length;
      data.forEach(r => console.log(`✅ ${r.nom_entreprise} (${r.siret}) → ${r.statut_2026}`));
    }
  }

  console.log(`\n📊 Résumé:`);
  console.log(`   ✅ ${updated} enregistrement(s) mis à jour`);
  if (notFound.length > 0) {
    console.log(`   ⚠️  ${notFound.length} SIRET(s) non trouvés: ${notFound.join(', ')}`);
  }
}

main();
