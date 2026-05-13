import { createClient } from '@supabase/supabase-js';

// Credentials from .env
const SUPABASE_URL = "https://cwqyxucygjbzqjrmymxv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cXl4dWN5Z2pienFqcm15bXh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MjYyNDUsImV4cCI6MjA4MDAwMjI0NX0.KPDLC6uZpl30SsACky81p08eqqNjbAIgiQUheIQo_dk";
const CRM_SUPABASE_URL = "https://shddjznwrfreskfwicbt.supabase.co";
const CRM_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZGRqem53cmZyZXNrZndpY2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTExMDMsImV4cCI6MjA5MDE4NzEwM30.OthjNkEPuVeTWz8sqJl6AtVWmA7eociqzvt8lerYhHI";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const supabaseCrm = createClient(CRM_SUPABASE_URL, CRM_SUPABASE_KEY);

async function repairDates() {
  console.log('🚀 Démarrage de la réparation des dates de modification...');
  
  const FETCH_SIZE = 1000;
  let from = 0;
  let hasMore = true;
  let totalUpdated = 0;

  try {
    while (hasMore) {
      console.log(`📦 Traitement du lot ${from} à ${from + FETCH_SIZE - 1}...`);
      
      const { data: entreprises, error } = await supabase
        .from('entreprise')
        .select('siret, date_modification')
        .range(from, from + FETCH_SIZE - 1);

      if (error) throw error;
      
      if (!entreprises || entreprises.length === 0) {
        hasMore = false;
        break;
      }

      // Préparer les updates pour le CRM
      // On ne met à jour QUE la date_modification pour ce SIRET
      for (const ent of entreprises) {
        if (ent.date_modification) {
            const { error: upError } = await supabaseCrm
                .from('crm_leads')
                .update({ date_modification: ent.date_modification })
                .eq('siret', ent.siret);
            
            if (!upError) totalUpdated++;
        }
      }

      console.log(`✅ ${totalUpdated} dates synchronisées jusqu'ici.`);

      if (entreprises.length < FETCH_SIZE) {
        hasMore = false;
      } else {
        from += FETCH_SIZE;
      }
    }

    console.log(`\n🎉 RÉPARATION TERMINÉE ! Total : ${totalUpdated} lignes mises à jour.`);
  } catch (err) {
    console.error('💥 Erreur :', err.message);
  }
}

repairDates();
