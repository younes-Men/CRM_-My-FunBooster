import { createClient } from '@supabase/supabase-js';

// Credentials from .env
const SUPABASE_URL = "https://cwqyxucygjbzqjrmymxv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cXl4dWN5Z2pienFqcm15bXh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MjYyNDUsImV4cCI6MjA4MDAwMjI0NX0.KPDLC6uZpl30SsACky81p08eqqNjbAIgiQUheIQo_dk";
const CRM_SUPABASE_URL = "https://shddjznwrfreskfwicbt.supabase.co";
const CRM_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZGRqem53cmZyZXNrZndpY2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTExMDMsImV4cCI6MjA5MDE4NzEwM30.OthjNkEPuVeTWz8sqJl6AtVWmA7eociqzvt8lerYhHI";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const supabaseCrm = createClient(CRM_SUPABASE_URL, CRM_SUPABASE_KEY);

async function repairDatesFast() {
  console.log('🚀 Démarrage de la réparation RAPIDE des dates de modification (V2)...');
  
  const FETCH_SIZE = 1000;
  let from = 0;
  let hasMore = true;
  let totalProcessed = 0;

  try {
    while (hasMore) {
      console.log(`📦 Traitement du lot ${from} à ${from + FETCH_SIZE - 1}...`);
      
      const { data: entreprises, error } = await supabase
        .from('entreprise')
        .select('*')
        .range(from, from + FETCH_SIZE - 1);

      if (error) throw error;
      
      if (!entreprises || entreprises.length === 0) {
        hasMore = false;
        break;
      }

      // Dédupliquer par SIRET dans le lot pour éviter l'erreur "ON CONFLICT DO UPDATE"
      const uniqueEntreprises = new Map();
      entreprises.forEach(ent => {
        if (!uniqueEntreprises.has(ent.siret)) {
          uniqueEntreprises.set(ent.siret, ent);
        }
      });

      const crmUpdates = Array.from(uniqueEntreprises.values()).map(ent => {
        let codePostal = '';
        if (ent.adresse) {
          const cpMatch = ent.adresse.match(/\b\d{5}\b/);
          if (cpMatch) codePostal = cpMatch[0];
        }

        return {
          siret: ent.siret,
          nom_entreprise: ent.nom_entreprise || '',
          adresse: ent.adresse || '',
          tel: ent.tel || '',
          status: ent.status || 'A traiter',
          funebooster: ent.funebooster || '',
          client_of: ent.client_of || '',
          observation: ent.observation || '',
          projet: ent.projet || 'OPCO',
          date_modification: ent.date_modification,
          nom_opco: ent.nom_opco || '',
          secteur: ent.secteur || '',
          code_naf: ent.secteur || '',
          code_postal: codePostal,
          code_departement: ent.département || ''
        };
      });

      const { error: crmError } = await supabaseCrm
        .from('crm_leads')
        .upsert(crmUpdates, { onConflict: 'siret' });

      if (crmError) {
        console.error(`❌ Erreur lot à ${from}:`, crmError.message);
      } else {
        totalProcessed += crmUpdates.length;
        console.log(`✅ ${totalProcessed} leads synchronisés.`);
      }

      if (entreprises.length < FETCH_SIZE) {
        hasMore = false;
      } else {
        from += FETCH_SIZE;
      }
      
      await new Promise(r => setTimeout(r, 100));
    }

    console.log(`\n🎉 TERMINÉ ! ${totalProcessed} leads mis à jour avec les dates du système.`);
  } catch (err) {
    console.error('💥 Erreur fatale:', err.message);
  }
}

repairDatesFast();
