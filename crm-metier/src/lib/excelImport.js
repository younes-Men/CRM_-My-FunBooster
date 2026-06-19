import { supabase } from './supabase';
import * as XLSX from 'xlsx';

export const importFromExcel = async ({
  file,
  tableName,
  customRowFormatter = null
}) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        let data = XLSX.utils.sheet_to_json(ws);
        
        if (data.length === 0) {
          alert("Le fichier Excel est vide.");
          resolve({ imported: 0, duplicates: 0 });
          return;
        }

        // 1. Format row if needed
        if (customRowFormatter) {
          data = data.map(customRowFormatter);
        }

        // 2. Identify all SIRETs from the imported data
        const importedSirets = data.map(d => d.siret ? String(d.siret).trim() : null).filter(Boolean);
        
        let existingSirets = new Set();
        
        if (importedSirets.length > 0) {
          // 3. Fetch existing sirets in chunks
          const CHUNK_SIZE = 500;
          for (let i = 0; i < importedSirets.length; i += CHUNK_SIZE) {
            const chunk = importedSirets.slice(i, i + CHUNK_SIZE);
            const { data: existing } = await supabase
              .from(tableName)
              .select('siret')
              .in('siret', chunk);
              
            if (existing) {
              existing.forEach(e => existingSirets.add(String(e.siret).trim()));
            }
          }
        }

        // 4. Filter out duplicates
        const toInsert = data.filter(d => {
          if (!d.siret) return true; // if no siret, we can't deduplicate by siret
          return !existingSirets.has(String(d.siret).trim());
        });

        const duplicatesCount = data.length - toInsert.length;

        // 5. Insert in chunks
        const INSERT_CHUNK = 500;
        let importedCount = 0;
        
        // Remove `id` if it's in the data to allow DB to auto-generate it
        const cleanDataToInsert = toInsert.map(row => {
          const { id, ...rest } = row;
          return rest;
        });

        for (let i = 0; i < cleanDataToInsert.length; i += INSERT_CHUNK) {
          const chunk = cleanDataToInsert.slice(i, i + INSERT_CHUNK);
          const { error } = await supabase.from(tableName).insert(chunk);
          if (error) {
            console.error("Insert error:", error);
            throw error;
          }
          importedCount += chunk.length;
        }

        alert(`Import terminé !\n✅ ${importedCount} leads ajoutés.\n❌ ${duplicatesCount} doublons (SIRET) ignorés.`);
        resolve({ imported: importedCount, duplicates: duplicatesCount });
      } catch (err) {
        console.error("Import process error:", err);
        alert("Une erreur s'est produite lors de l'importation.");
        reject(err);
      }
    };
    reader.onerror = (err) => {
      console.error("File read error:", err);
      reject(err);
    };
    reader.readAsBinaryString(file);
  });
};
