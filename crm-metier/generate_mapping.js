import XLSX from 'xlsx';
import fs from 'fs';

const filePath = 'c:/Users/dell/Desktop/CRM_Lykos/crm-metier/DATA_OPCO.xlsx';
const workbook = XLSX.readFile(filePath);
const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

const mapping = {
  idcc: {},
  naf: {}
};

data.forEach(row => {
  const secteur = row['ACTIVITÉ'];
  if (!secteur) return;

  // Process IDCC
  if (row['IDCC']) {
    const idcc = String(row['IDCC']).trim();
    if (idcc) mapping.idcc[idcc] = secteur;
  }

  // Process NAF
  if (row['CODE NAF/APE']) {
    const nafStr = String(row['CODE NAF/APE']);
    // Split by / or newline or space
    const nafs = nafStr.split(/[\/\r\n\s]+/).map(n => n.trim().toUpperCase()).filter(n => n.length >= 4);
    nafs.forEach(n => {
      mapping.naf[n] = secteur;
    });
  }
});

fs.writeFileSync('c:/Users/dell/Desktop/CRM_Lykos/crm-metier/src/data/secteur_mapping.json', JSON.stringify(mapping, null, 2));
console.log('Mapping généré avec succès !');
console.log(`- ${Object.keys(mapping.idcc).length} IDCC enregistrés`);
console.log(`- ${Object.keys(mapping.naf).length} codes NAF enregistrés`);
