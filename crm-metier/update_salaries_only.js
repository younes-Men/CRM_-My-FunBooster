import { createClient } from '@supabase/supabase-js';
import xlsx from 'xlsx';
import fs from 'fs';

async function run() {
  let envUrl = '';
  let envKey = '';
  try {
     const content = fs.readFileSync('.env', 'utf-8');
     const lines = content.split('\n');
     for (const line of lines) {
         if (line.startsWith('VITE_SUPABASE_URL=')) envUrl = line.split('=')[1].replace(/['"]/g, '').trim();
         if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) envKey = line.split('=')[1].replace(/['"]/g, '').trim();
     }
  } catch (e) {
     console.error('Could not read .env', e);
  }

  const supabase = createClient(envUrl, envKey);

  console.log("Reading Excel...");
  const workbook = xlsx.readFile('Leads2025.xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  const headers = data[0];
  
  const siretIdx = headers.findIndex(h => h === 'SIRET');
  const nomIdx = headers.findIndex(h => h === 'ÉTABLISSEMENT' || h === 'NOM ENTREPRISE');
  const salariesIdx = headers.findIndex(h => h === 'SALARIÉS');

  console.log(`Indices: SIRET=${siretIdx}, NOM=${nomIdx}, SALARIÉS=${salariesIdx}`);

  let updatedCount = 0;
  let notFoundCount = 0;
  let errorsCount = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    
    let siret = row[siretIdx];
    let nom = row[nomIdx];
    let salaries = row[salariesIdx];

    if (!siret && !nom) continue; // Skip empty
    if (salaries === undefined) continue; // Nothing to update

    // Clean siret
    if (siret) {
        siret = String(siret).replace(/\s+/g, '').trim();
    }

    const updates = {};
    if (salaries !== undefined && salaries !== null && salaries !== '') {
        updates.nb_salaries = parseInt(salaries, 10);
    }

    if (Object.keys(updates).length === 0) continue;

    let query = supabase.from('crm_leads_2025').update(updates);
    
    if (siret) {
        query = query.eq('siret', siret);
    } else if (nom) {
        query = query.eq('nom_entreprise', nom);
    }

    const { data: resData, error } = await query.select('id');
    if (error) {
        if (!error.message.includes('nb_apprentis')) {
            console.error("Error updating", siret || nom, error.message);
        }
        errorsCount++;
    } else {
        if (resData && resData.length > 0) {
            updatedCount += resData.length;
        } else {
            notFoundCount++;
        }
    }
  }

  console.log(`Done! Updated ${updatedCount} records. ${notFoundCount} not found in DB. Errors: ${errorsCount}`);
}

run();
