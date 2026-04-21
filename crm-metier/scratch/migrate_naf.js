import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://shddjznwrfreskfwicbt.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZGRqem53cmZyZXNrZndpY2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTExMDMsImV4cCI6MjA5MDE4NzEwM30.OthjNkEPuVeTWz8sqJl6AtVWmA7eociqzvt8lerYhHI";

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log('🔄 Démarrage de la migration : secteur -> code_naf...');
  
  // 1. Fetch records where code_naf is null or empty and secteur is not null
  const { data: records, error: fetchError } = await supabase
    .from('crm_leads')
    .select('id, secteur')
    .or('code_naf.is.null,code_naf.eq.""');

  if (fetchError) {
    console.error('❌ Erreur lors de la récupération :', fetchError);
    return;
  }

  console.log(`📊 Nombre d'enregistrements à mettre à jour : ${records?.length || 0}`);

  if (!records || records.length === 0) {
    console.log('✅ Aucun enregistrement nécessitant une mise à jour.');
    return;
  }

  // 2. Perform updates in batches (Supabase best practice for large updates)
  let updatedCount = 0;
  for (const record of records) {
    if (record.secteur) {
      const { error: updateError } = await supabase
        .from('crm_leads')
        .update({ code_naf: record.secteur })
        .eq('id', record.id);
        
      if (updateError) {
        console.error(`❌ Erreur pour ID ${record.id} :`, updateError);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`✅ Migration terminée. ${updatedCount} enregistrements mis à jour.`);
}

migrate();
