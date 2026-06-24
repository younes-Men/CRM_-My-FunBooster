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
        
        // Allowed columns in the database schema
        const VALID_COLUMNS = new Set([
          'funebooster', 'nom_entreprise', 'forme_juridique', 'siret', 'tranche_effectif', 
          'tel', 'status', 'nom_opco', 'client_of', 'opcosign', 'lead_id', 'gerant', 
          'secteur_activite', 'libelle_activite', 'idcc', 'idcc_2', 'code_naf', 'pappers', 
          'mobile', 'adresse', 'code_postal', 'code_departement', 'status_rdv', 'email', 
          'site_web', 'statut_gerant', 'nb_salaries', 'nb_apprentis', 'date_modification', 
          'budget_opco', 'annee_budget', 'date_rdv', 'heure_rdv', 'type_rdv', 'rdv_honore', 
          'proposition', 'signe', 'date_signe', 'ca_signe_ht', 'nb_heures_formation', 
          'tx_horaire_ca', 'campagne_act', 'pec', 'echeances_pec', 'suivi_formation', 
          'observation', 'projet', 'created_at', 'statut_commercial'
        ]);

        // Remove `id` and any invalid columns to allow DB to auto-generate and prevent schema errors
        const cleanDataToInsert = toInsert.map(row => {
          const newRow = {};
          for (const key in row) {
            if (key !== 'id' && VALID_COLUMNS.has(key)) {
              newRow[key] = row[key];
            }
          }
          return newRow;
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
        const errorMsg = err.message || err.details || JSON.stringify(err);
        alert(`Une erreur s'est produite lors de l'importation.\n\nDétails de l'erreur :\n${errorMsg}`);
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
