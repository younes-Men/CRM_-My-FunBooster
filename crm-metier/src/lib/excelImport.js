import { supabaseAdmin } from './supabase';
import * as XLSX from 'xlsx';

// ─── Toast progress UI ──────────────────────────────────────────────────────
function showToast(msg, id = 'import-toast') {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    Object.assign(el.style, {
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 99999,
      background: '#1e293b', color: '#f1f5f9', padding: '14px 20px',
      borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      fontSize: '14px', maxWidth: '360px', lineHeight: '1.5',
      border: '1px solid #334155', transition: 'opacity 0.3s'
    });
    document.body.appendChild(el);
  }
  el.innerHTML = msg;
}
function hideToast(id = 'import-toast') {
  const el = document.getElementById(id);
  if (el) { el.style.opacity = '0'; setTimeout(() => el.remove(), 400); }
}

// ─── Main import function ────────────────────────────────────────────────────
export const importFromExcel = async ({
  file,
  tableName,
  customRowFormatter = null
}) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        showToast('📂 Lecture du fichier Excel...');

        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        let rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });

        // Find header row
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(20, rawData.length); i++) {
          const row = rawData[i] || [];
          if (row.some(cell => typeof cell === 'string' &&
            (cell.toUpperCase().includes('SIRET') || cell.toUpperCase().includes('ENTREPRISE')))) {
            headerRowIndex = i;
            break;
          }
        }

        const headers = rawData[headerRowIndex] || [];
        const rows = rawData.slice(headerRowIndex + 1);

        const COLUMN_MAPPING = {
          'ENTREPRISE': 'nom_entreprise',
          'SIRET': 'siret',
          'CODE NAF': 'code_naf',
          'SECTEUR ACT.': 'secteur_activite',
          'LIBELLÉ ACT.': 'libelle_activite',
          'ADRESSE': 'adresse',
          'CODE POSTAL': 'code_postal',
          'CODE DÉP': 'code_departement',
          'TÉLÉPHONE': 'tel',
          'MOBILE': 'mobile',
          'E-MAIL': 'email',
          'SITE WEB': 'site_web',
          'STATUT GÉRANT': 'statut_gerant',
          'GÉRANT': 'gerant',
          'NB SALARIÉS': 'nb_salaries',
          'NB APPRENTIS': 'nb_apprentis',
          'TRANCHE EFFECTIF': 'tranche_effectif',
          'OPCO': 'nom_opco',
          'OPCO ': 'nom_opco',
          'CLIENT OF': 'client_of',
          'STATUT': 'status',
          'ID CRM': 'lead_id',
          '#OPCOSIGN': 'opcosign',
          'BUDGET OPCO': 'budget_opco',
          'DATE RDV': 'date_rdv',
          'TYPE DE RDV': 'type_rdv',
          'HONORÉ ?': 'rdv_honore',
          'PROPAL': 'proposition',
          'DATE SIGN': 'date_signe',
          'CA SIGNÉ HT': 'ca_signe_ht',
          'NB HEURES': 'nb_heures_formation',
          'TX HORAIRE CA': 'tx_horaire_ca',
          'CAMPAGNE ACT': 'campagne_act',
          'PEC': 'pec',
          'COMMENTAIRES': 'observation',
          'IDCC': 'idcc',
          'FUNBOOSTER': 'funebooster'
        };

        // Parse rows
        let data = rows.map(row => {
          let obj = {};
          headers.forEach((header, index) => {
            if (!header) return;
            const cleanHeader = String(header).trim().toUpperCase();
            const dbKey = COLUMN_MAPPING[cleanHeader] || cleanHeader.toLowerCase();
            let value = row[index];
            if (value !== undefined && value !== null && value !== '') {
              obj[dbKey] = value;
            }
          });
          return obj;
        }).filter(obj => Object.keys(obj).length > 0);

        if (data.length === 0) {
          hideToast();
          alert("Le fichier Excel est vide ou le format n'est pas reconnu.");
          resolve({ imported: 0, duplicates: 0 });
          return;
        }

        showToast(`📊 ${data.length.toLocaleString()} lignes lues — formatage...`);

        // Custom formatter
        if (customRowFormatter) {
          data = data.map(customRowFormatter);
        }

        // ── Step 1: Collect all SIRETs from file ──────────────────────────
        const importedSirets = data
          .map(d => d.siret ? String(d.siret).trim() : null)
          .filter(Boolean);

        // ── Step 2: Deduplicate within the file itself ────────────────────
        const seenInFile = new Set();
        const withSiret = [];
        const withoutSiret = [];

        data.forEach(d => {
          if (!d.siret) { withoutSiret.push(d); return; }
          const key = String(d.siret).trim();
          if (!seenInFile.has(key)) {
            seenInFile.add(key);
            withSiret.push(d);
          }
        });

        const internalDups = data.length - withSiret.length - withoutSiret.length;

        // ── Step 3: Check existing SIRETs in BOTH tables ──────
        const CHUNK_SIZE = 200; // Keep chunks small to avoid "URI Too Long" errors
        const existingSirets = new Set();

        if (importedSirets.length > 0) {
          showToast(`🔍 Vérification des doublons dans la base... (0%)`);

          const chunks = [];
          for (let i = 0; i < importedSirets.length; i += CHUNK_SIZE) {
            chunks.push(importedSirets.slice(i, i + CHUNK_SIZE));
          }

          let done = 0;
          const totalRequests = chunks.length * 2;
          const PARALLEL_READS = 5; // process 5 requests at a time

          const queries = chunks.flatMap(chunk => [
            async () => {
              const { data: res, error } = await supabaseAdmin.from(tableName).select('siret').in('siret', chunk);
              if (error) throw error;
              if (res) res.forEach(e => existingSirets.add(String(e.siret).trim()));
              done++;
              showToast(`🔍 Vérification des doublons dans la base... (${Math.round((done / totalRequests) * 100)}%)`);
            },
            async () => {
              const { data: res, error } = await supabaseAdmin.from('crm_leads').select('siret').in('siret', chunk);
              if (error) throw error;
              if (res) res.forEach(e => existingSirets.add(String(e.siret).trim()));
              done++;
              showToast(`🔍 Vérification des doublons dans la base... (${Math.round((done / totalRequests) * 100)}%)`);
            }
          ]);

          // Process in batches
          for (let i = 0; i < queries.length; i += PARALLEL_READS) {
            const batch = queries.slice(i, i + PARALLEL_READS);
            await Promise.all(batch.map(q => q()));
          }
        }

        // ── Step 4: Filter out existing SIRETs ────────────────────────────
        const toInsert = withSiret.filter(d => !existingSirets.has(String(d.siret).trim()));
        const duplicatesCount = (data.length - withoutSiret.length - toInsert.length);

        if (toInsert.length === 0) {
          hideToast();
          const skippedMsg = withoutSiret.length > 0 ? `\n⚠️ ${withoutSiret.length} lignes sans SIRET ignorées.` : '';
          alert(`Import terminé !\n✅ 0 nouveaux leads (tout est déjà en base).\n❌ ${duplicatesCount} doublons ignorés.${skippedMsg}`);
          resolve({ imported: 0, duplicates: duplicatesCount });
          return;
        }

        // ── Step 5: Clean columns ──────────────────────────────────────────
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

        const cleanDataToInsert = toInsert.map(row => {
          const newRow = {};
          for (const key in row) {
            if (key !== 'id' && VALID_COLUMNS.has(key)) {
              if ((key === 'date_rdv' || key === 'date_signe') && typeof row[key] === 'number') {
                const date = new Date((row[key] - (25567 + 2)) * 86400 * 1000);
                newRow[key] = !isNaN(date.getTime()) ? date.toISOString().split('T')[0] : row[key];
              } else {
                newRow[key] = row[key];
              }
            }
          }
          return newRow;
        });

        // ── Step 6: Insert in parallel chunks ─────────────────────────────
        const INSERT_CHUNK = 500;
        let importedCount = 0;
        const insertChunks = [];
        for (let i = 0; i < cleanDataToInsert.length; i += INSERT_CHUNK) {
          insertChunks.push(cleanDataToInsert.slice(i, i + INSERT_CHUNK));
        }

        showToast(`⬆️ Insertion de ${toInsert.length.toLocaleString()} leads... (0%)`);

        let insertedChunks = 0;
        // Insert 4 chunks in parallel at a time to avoid overwhelming the DB
        const PARALLEL_INSERTS = 4;
        for (let i = 0; i < insertChunks.length; i += PARALLEL_INSERTS) {
          const batch = insertChunks.slice(i, i + PARALLEL_INSERTS);
          await Promise.all(
            batch.map(async chunk => {
              const { error } = await supabaseAdmin.from(tableName).insert(chunk);
              if (error) throw error;
              importedCount += chunk.length;
              insertedChunks++;
              const pct = Math.round((insertedChunks / insertChunks.length) * 100);
              showToast(`⬆️ Insertion en cours... ${importedCount.toLocaleString()} / ${toInsert.length.toLocaleString()} leads (${pct}%)`);
            })
          );
        }

        hideToast();
        const skippedMsg = withoutSiret.length > 0 ? `\n⚠️ ${withoutSiret.length} lignes sans SIRET ignorées.` : '';
        alert(`Import terminé !\n✅ ${importedCount.toLocaleString()} leads ajoutés.\n❌ ${duplicatesCount} doublons ignorés.${skippedMsg}`);
        resolve({ imported: importedCount, duplicates: duplicatesCount });

      } catch (err) {
        hideToast();
        console.error('Import process error:', err);
        const errorMsg = err.message || err.details || JSON.stringify(err);
        alert(`Une erreur s'est produite lors de l'importation.\n\nDétails de l'erreur :\n${errorMsg}`);
        reject(err);
      }
    };
    reader.onerror = (err) => { hideToast(); reject(err); };
    reader.readAsBinaryString(file);
  });
};
