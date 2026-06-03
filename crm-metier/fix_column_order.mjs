import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://shddjznwrfreskfwicbt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZGRqem53cmZyZXNrZndpY2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTExMDMsImV4cCI6MjA5MDE4NzEwM30.OthjNkEPuVeTWz8sqJl6AtVWmA7eociqzvt8lerYhHI'
);

// Ordre original AVANT notre modification (mobile était à la position 15, après pappers)
const ORIGINAL_ORDER = [
  'funebooster',      // 0
  'nom_entreprise',   // 1
  'siret',            // 2
  'tel',              // 3
  'status',           // 4
  'nom_opco',         // 5
  'client_of',        // 6
  'opcosign',         // 7
  'lead_id',          // 8
  'gerant',           // 9
  'secteur_activite', // 10
  'libelle_activite', // 11
  'idcc',             // 12
  'code_naf',         // 13
  'pappers',          // 14
  'mobile',           // 15
  'adresse',          // 16
  'code_postal',      // 17
  'code_departement', // 18
  'status_rdv',       // 19
  'email',            // 20
  'site_web',         // 21
  'statut_gerant',    // 22
  'nb_salaries',      // 23
  'nb_apprentis',     // 24
  'date_modification',// 25
  'budget_opco',      // 26
  'annee_budget',     // 27
  'date_rdv',         // 28
  'heure_rdv',        // 29
  'type_rdv',         // 30
  'rdv_honore',       // 31
  'proposition',      // 32
  'signe',            // 33
  'date_signe',       // 34
  'ca_signe_ht',      // 35
  'nb_heures_formation', // 36
  'tx_horaire_ca',    // 37
  'campagne_act',     // 38
  'pec',              // 39
  'echeances_pec',    // 40
  'suivi_formation',  // 41
  'observation',      // 42
];

async function revertColumnOrder() {
  const { data: cols, error } = await supabase
    .from('crm_column_configs')
    .select('id, key');

  if (error) { console.error('Erreur fetch:', error); process.exit(1); }

  const updates = ORIGINAL_ORDER.map((key, i) => {
    const col = cols.find(c => c.key === key);
    if (!col) { console.warn(`Colonne "${key}" introuvable, ignorée.`); return null; }
    return supabase.from('crm_column_configs').update({ display_order: i }).eq('id', col.id);
  }).filter(Boolean);

  const results = await Promise.all(updates);
  const errors = results.filter(r => r.error);
  
  if (errors.length > 0) {
    console.error('Erreurs:', errors);
  } else {
    console.log('✅ Base de données remise comme avant ! Mobile est de nouveau à sa position originale (après Pappers).');
    console.log('\nNouvel ordre:');
    ORIGINAL_ORDER.forEach((key, i) => console.log(`  [${i}] ${key}`));
  }
}

revertColumnOrder();
