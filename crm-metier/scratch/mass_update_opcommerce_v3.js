import { createClient } from '@supabase/supabase-js';

const supabase = createClient("https://shddjznwrfreskfwicbt.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZGRqem53cmZyZXNrZndpY2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTExMDMsImV4cCI6MjA5MDE4NzEwM30.OthjNkEPuVeTWz8sqJl6AtVWmA7eociqzvt8lerYhHI");

const OPCOMMERCE_NAF_CODES = [
  "74.20Z", "47.52B", "47.91A", "47.91B", "46.17A", "46.17B", "46.38B", "47.11B",
  "47.11C", "47.11D", "47.11E", "47.25Z", "47.21Z", "47.24Z", "47.29Z", "47.81Z",
  "26.52Z", "47.77Z", "47.78C", "47.72A", "47.51Z", "47.53Z", "47.59B", "47.71Z",
  "47.19B", "47.41Z", "47.42Z", "47.43Z", "47.52A", "47.54Z", "47.59A", "47.63Z",
  "47.65Z", "47.72B", "47.76Z", "47.79Z", "47.89Z", "43.21A", "77.22Z", "77.29Z",
  "95.11Z", "95.12Z", "95.21Z", "95.22Z", "46.41Z", "46.42Z", "45.11Z", "45.19Z",
  "47.64Z", "46.51Z", "46.65Z", "46.66Z", "47.62Z", "46.12A", "46.19A", "46.11Z",
  "46.12B", "46.13Z", "46.14Z", "46.15Z", "46.16Z", "46.18Z", "46.19B", "46.43Z",
  "46.47Z", "46.49Z", "46.52Z", "46.61Z", "46.62Z", "46.63Z", "46.64Z", "46.69A",
  "46.69B", "46.69C", "46.72Z", "46.75Z", "52.10B", "47.78A"
];

async function updateOpco() {
  console.log("🚀 Mise à jour BY ID OPCOMMERCE...");

  let grandTotalUpdated = 0;
  
  for (const code of OPCOMMERCE_NAF_CODES) {
    const cleanCode = code.replace('.', '').toUpperCase();
    console.log(`\n⏳ Traitement de ${code}...`);
    
    const conditions = [
      { field: 'code_naf', value: code },
      { field: 'code_naf', value: cleanCode },
      { field: 'secteur', value: code },
      { field: 'secteur', value: cleanCode }
    ];

    for (const cond of conditions) {
      let updatedForCond = 0;
      while (true) {
        // 1. Fetch IDs
        const { data: leads, error: fetchError } = await supabase
          .from('crm_leads')
          .select('id')
          .eq(cond.field, cond.value)
          .not('nom_opco', 'eq', 'OPCOMMERCE')
          .limit(500);
        
        if (fetchError) {
          console.error(`❌ Erreur Fetch ${cond.field}=${cond.value}:`, fetchError.message);
          break;
        }
        
        if (!leads || leads.length === 0) break;
        
        const ids = leads.map(l => l.id);
        
        // 2. Update by ID
        const { error: updateError } = await supabase
          .from('crm_leads')
          .update({ nom_opco: 'OPCOMMERCE' })
          .in('id', ids);
        
        if (updateError) {
          console.error(`❌ Erreur Update ${cond.field}=${cond.value}:`, updateError.message);
          break;
        }
        
        updatedForCond += ids.length;
        grandTotalUpdated += ids.length;
        process.stdout.write(`✅ ${updatedForCond}... `);
      }
    }
  }

  console.log(`\n🎉 TOUT EST FINI ! TOTAL GÉNÉRAL: ${grandTotalUpdated}`);
}

updateOpco();
