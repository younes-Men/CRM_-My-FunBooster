import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import * as XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function importFile() {
  console.log("Starting import...");
  const filePath = path.join(__dirname, 'OPCOMMERCE_1_1_1770822017.xlsx');
  
  if (!fs.existsSync(filePath)) {
    console.error("File not found!");
    return;
  }

  const bstr = fs.readFileSync(filePath);
  const wb = XLSX.read(bstr, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  let data = XLSX.utils.sheet_to_json(ws);
  
  console.log(`Found ${data.length} rows in Excel.`);
  
  if (data.length === 0) return;

  const row = data[0];
  console.log("Sample row:", row);

  // Try inserting one row as a test
  const testRow = {
    nom_entreprise: row.nom_entreprise || 'Test Company',
    siret: row.siret || '12345678901234',
    // add any potential required fields
    funebooster: 'admin' // just a guess
  };

  const { data: inserted, error } = await supabase
    .from('crm_leads_bdd')
    .insert([testRow])
    .select();

  if (error) {
    console.error("Insert failed:", error);
  } else {
    console.log("Insert successful:", inserted);
    // Cleanup the test row
    await supabase.from('crm_leads_bdd').delete().eq('siret', testRow.siret);
  }
}

importFile();
