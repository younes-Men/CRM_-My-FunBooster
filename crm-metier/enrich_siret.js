import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const env = Object.fromEntries(
  envContent.split('\n')
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      const splitIndex = line.indexOf('=');
      if (splitIndex === -1) return [null, null];
      const key = line.substring(0, splitIndex).trim();
      let value = line.substring(splitIndex + 1).trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      return [key, value];
    })
    .filter(([key]) => key !== null)
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

// Helper function to process promises in chunks
async function processInChunks(items, chunkFn, chunkSize = 50) {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    await Promise.all(chunk.map(chunkFn));
  }
}

async function updateTable(tableName) {
  console.log(`\n=== Démarrage de l'enrichissement pour la table: ${tableName} ===`);
  let hasMore = true;
  let lastId = 0; // Utilisation du keyset pagination pour éviter le timeout
  const limit = 250; 
  let totalUpdated = 0;
  let leadsProcessed = 0;

  while (hasMore) {
    // 1. Fetch a batch of leads
    let query = supabase
      .from(tableName)
      .select('id, siret, nom_opco, idcc_2')
      .order('id', { ascending: true })
      .limit(limit);

    if (lastId !== 0) {
      query = query.gt('id', lastId);
    }

    const { data: leads, error } = await query;

    if (error) {
      console.error(`Error fetching leads from ${tableName}:`, error);
      break;
    }

    if (!leads || leads.length === 0) {
      hasMore = false;
      break;
    }

    console.log(`Processing leads ${leadsProcessed} to ${leadsProcessed + leads.length - 1}...`);
    leadsProcessed += leads.length;

    // 2. Extract valid SIRETs
    const validSirets = new Set();
    const leadMap = [];
    
    for (const lead of leads) {
      const cleanSiret = String(lead.siret).replace(/[^0-9]/g, '');
      if (cleanSiret.length === 14) {
        validSirets.add(cleanSiret);
        leadMap.push({ ...lead, cleanSiret });
      }
    }

    if (validSirets.size > 0) {
      // 3. Fetch SIRO data for all these SIRETs in one single query!
      const siretsArray = Array.from(validSirets);
      let siroMap = {};
      
      // Supabase .in() has a limit (usually URL length limit or 1000 items), 
      // since our max validSirets is 1000, it's safe to use .in()
      const { data: siroData, error: siroError } = await supabase
        .from('siret_opco')
        .select('siret, opco, idcc')
        .in('siret', siretsArray);

      if (siroError) {
        console.error('Error fetching from siret_opco:', siroError);
      } else if (siroData) {
        // Create a quick lookup dictionary
        for (const row of siroData) {
          siroMap[row.siret] = row;
        }

        // 4. Prepare updates
        const updatesNeeded = [];
        for (const lead of leadMap) {
          const siroInfo = siroMap[lead.cleanSiret];
          if (siroInfo) {
            if (lead.nom_opco !== siroInfo.opco || lead.idcc_2 !== siroInfo.idcc) {
              updatesNeeded.push({
                id: lead.id,
                nom_opco: siroInfo.opco || null,
                idcc_2: siroInfo.idcc || null
              });
            }
          }
        }

        // 5. Execute updates in parallel chunks
        if (updatesNeeded.length > 0) {
          let batchUpdatesCount = 0;
          await processInChunks(updatesNeeded, async (updateData) => {
            const { error: updError } = await supabase
              .from(tableName)
              .update({ nom_opco: updateData.nom_opco, idcc_2: updateData.idcc_2 })
              .eq('id', updateData.id);
            
            if (!updError) {
              batchUpdatesCount++;
            } else {
               console.error("Update error for ID", updateData.id, updError.message);
            }
          }, 15); // Réduit à 15 pour ne pas surcharger Supabase

          totalUpdated += batchUpdatesCount;
          console.log(` -> Mis à jour ${batchUpdatesCount} leads dans ce batch. (Total cumulé: ${totalUpdated})`);
        }
      }
    }

    lastId = leads[leads.length - 1].id;
  }

  console.log(`\n✅ Terminé pour ${tableName}. Total mis à jour: ${totalUpdated}\n`);
}

async function run() {
  const startTime = Date.now();
  
  await updateTable('crm_leads');
  
  const minutes = ((Date.now() - startTime) / 60000).toFixed(2);
  console.log(`🚀 Script complètement terminé en ${minutes} minutes!`);
}

run().catch(console.error);
