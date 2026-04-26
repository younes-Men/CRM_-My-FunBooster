import { createClient } from '@supabase/supabase-js';

const supabase = createClient("https://shddjznwrfreskfwicbt.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZGRqem53cmZyZXNrZndpY2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTExMDMsImV4cCI6MjA5MDE4NzEwM30.OthjNkEPuVeTWz8sqJl6AtVWmA7eociqzvt8lerYhHI");

const EXISTING_COLUMNS = [
  { label: 'ID',           key: 'lead_id',           width: 100, type: 'text', is_system: true },
  { label: 'Funbooster',   key: 'funebooster',       width: 160, type: 'select', options: ['BENZAYDOUNE', 'LABIBA', 'MERYEM', 'SOUKAINA', 'WISSAL', 'AMRI', 'KHADIJA', 'WIJDAN'] },
  { label: 'Entreprise',   key: 'nom_entreprise',    width: 240, type: 'text', is_system: true },
  { label: 'Gérant',       key: 'gerant',            width: 150, type: 'editable' },
  { label: 'Nº Siret',     key: 'siret',             width: 200, type: 'text', is_system: true },
  { label: 'Secteur Act.',  key: 'secteur_activite',  width: 180, type: 'editable' },
  { label: 'Libellé Act.',  key: 'libelle_activite',  width: 200, type: 'editable' },
  { label: 'Opco',         key: 'nom_opco',          width: 150, type: 'select', options: ['OPCOMMERCE', 'OPCO EP', 'OPCO AKTO', 'OPCO ATLAS', 'AFDAS', 'CONSTRUCTYS', 'MOBILITÉ', 'OPCO 2i', 'UNIFORMATION', 'OPCO SANTÉ', 'OCAPIAT'] },
  { label: 'IDCC',         key: 'idcc',              width: 100, type: 'editable' },
  { label: 'Code NAF',     key: 'code_naf',          width: 130, type: 'editable' },
  { label: 'Pappers',      key: 'pappers',           width: 130, type: 'pappers' },
  { label: 'Téléphone',    key: 'tel',               width: 140, type: 'text' },
  { label: 'Mobile',       key: 'mobile',            width: 140, type: 'editable' },
  { label: 'Adresse',      key: 'adresse',           width: 260, type: 'editable' },
  { label: 'Code Postal',  key: 'code_postal',       width: 100, type: 'auto' },
  { label: 'Code Dépt.',   key: 'code_departement',  width: 100, type: 'auto' },
  { label: 'Statut',       key: 'status',            width: 180, type: 'select', options: ['A TRAITER', 'PAS DE NUM', 'REPONDEUR', 'OCCUPÉ', 'EN ATTENTE RDV', 'RDV', 'SIGNE', 'RAPPEL', 'NRP', 'HORS CIBLE OPCO', 'HORS CIBLE SALARIÉS', 'HORS CIBLE SIÈGE', 'DEJA PEC', 'ABSENT', 'PI', 'FAUX NUM'], is_system: true },
  { label: 'E-mail',       key: 'email',             width: 200, type: 'editable' },
  { label: 'Site Web',     key: 'site_web',          width: 180, type: 'editable' },
  { label: 'Statut Gérant', key: 'statut_gerant',     width: 150, type: 'select', options: ['TNS', '2 TNS', 'GÉRANT SALARIÉ', '2 GÉRANTS SALARIÉS'] },
  { label: 'Nb Salariés',  key: 'nb_salaries',       width: 100, type: 'number' },
  { label: 'Nb Apprentis', key: 'nb_apprentis',      width: 110, type: 'number' },
  { label: 'Date Modif',   key: 'date_modification', width: 150, type: 'date', is_system: true },
  { label: 'Client OF',    key: 'client_of',         width: 180, type: 'select', options: ['CA CONSEILS', 'HORS ZONE', 'TB FORMATIONS', 'IT PERFORMANCE', 'GO CONSEILS'] },
  { label: 'Opcosign',     key: 'opcosign',          width: 130, type: 'editable' },
  { label: 'Budget Opco',  key: 'budget_opco',       width: 120, type: 'currency' },
  { label: 'Année Budget', key: 'annee_budget',      width: 110, type: 'number' },
  { label: 'Date RDV',     key: 'date_rdv',          width: 130, type: 'date_picker' },
  { label: 'Heure RDV',    key: 'heure_rdv',         width: 100, type: 'time' },
  { label: 'Type RDV',     key: 'type_rdv',          width: 130, type: 'select', options: ['TÉLÉPHONIQUE', 'PHYSIQUE'] },
  { label: 'RDV Honoré ?', key: 'rdv_honore',        width: 120, type: 'select', options: ['OUI', 'NON'] },
  { label: 'Proposition',  key: 'proposition',       width: 120, type: 'select', options: ['OUI', 'NON', 'EN COURS'] },
  { label: 'Signé',        key: 'signe',             width: 120, type: 'select', options: ['OUI', 'NON', 'EN COURS'] },
  { label: 'Date Sign',    key: 'date_signe',        width: 130, type: 'date_picker' },
  { label: 'CA Signé HT',  key: 'ca_signe_ht',       width: 120, type: 'currency' },
  { label: 'Nb Heures',    key: 'nb_heures_formation', width: 100, type: 'number' },
  { label: 'TX Horaire',   key: 'tx_horaire_ca',     width: 120, type: 'auto_currency' },
  { label: 'Campagne',     key: 'campagne_act',      width: 150, type: 'select', options: ['CONQUÊTE', 'FIDÉLISATION', 'RE-CONQUÊTE'] },
  { label: 'PEC',          key: 'pec',               width: 120, type: 'select', options: ['OUI', 'NON'] },
  { label: 'Échéances PEC', key: 'echeances_pec',     width: 200, type: 'pec_dates' },
  { label: 'Suivi Form.',  key: 'suivi_formation',   width: 150, type: 'select', options: ['PLANIFIÉE', 'ORGANISÉE', 'EN COURS', 'TERMINÉE'] },
  { label: 'Commentaires', key: 'observation',       width: 260, type: 'editable' },
];

async function initColumns() {
  console.log("Initialisation des colonnes...");
  
  for (let i = 0; i < EXISTING_COLUMNS.length; i++) {
    const col = EXISTING_COLUMNS[i];
    const { error } = await supabase
      .from('crm_column_settings')
      .upsert({
        key: col.key,
        label: col.label,
        width: col.width,
        type: col.type,
        options: col.options || [],
        position: i,
        is_system: col.is_system || false
      }, { onConflict: 'key' });

    if (error) {
      console.error(`Erreur pour ${col.key}:`, error.message);
    } else {
      console.log(`✅ ${col.label} configurée.`);
    }
  }
  
  console.log("Initialisation terminée !");
}

initColumns();
