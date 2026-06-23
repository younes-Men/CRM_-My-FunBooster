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

async function countExactMatches() {
  console.log("1. Récupération de tous les SIRETs de crm_leads...");
  let allSirets = [];
  let hasMore = true;
  let lastId = 0;
  let leadsProcessed = 0;

  while (hasMore) {
    let query = supabase
      .from('crm_leads')
      .select('id, siret')
      .order('id', { ascending: true })
      .limit(5000);

    if (lastId !== 0) {
      query = query.gt('id', lastId);
    }

    const { data, error } = await query;

    if (error) {
      console.error(error);
      break;
    }
    
    if (!data || data.length === 0) break;

    for (const row of data) {
      if (row.siret) {
        const clean = String(row.siret).replace(/[^0-9]/g, '');
        if (clean.length === 14) {
          allSirets.push(clean);
        }
      }
    }
    
    leadsProcessed += data.length;
    process.stdout.write(`\r-> ${leadsProcessed} leads scannés`);
    lastId = data[data.length - 1].id;
  }
  
  console.log("\n2. Déduplication des SIRETs...");
  const uniqueSirets = [...new Set(allSirets)];
  console.log(`-> ${uniqueSirets.length} SIRETs uniques valides trouvés dans le CRM.`);

  console.log("3. Vérification de la correspondance avec siret_opco (par batchs de 250)...");
  let totalMatched = 0;
  const chunkSize = 250;
  
  for (let i = 0; i < uniqueSirets.length; i += chunkSize) {
    const chunk = uniqueSirets.slice(i, i + chunkSize);
    
    const { data, error } = await supabase
      .from('siret_opco')
      .select('siret')
      .in('siret', chunk);
      
    if (error) {
       console.error("Erreur avec Supabase", error);
    } else if (data) {
       totalMatched += data.length;
    }
    
    if ((i + chunkSize) % 10000 === 0 || i + chunkSize >= uniqueSirets.length) {
       process.stdout.write(`\r-> ${Math.min(i + chunkSize, uniqueSirets.length)} / ${uniqueSirets.length} SIRETs vérifiés. Correspondances trouvées: ${totalMatched}`);
    }
  }

  console.log(`\n\n✅ RÉSULTAT FINAL:`);
  console.log(`Il y a exactement ${totalMatched} entreprises dans votre CRM dont le SIRET existe dans le fichier SIRO (siret_opco).`);
  console.log(`(Note: Les doublons de SIRET dans le CRM ne sont comptés qu'une seule fois dans ce chiffre).`);
}

countExactMatches();
