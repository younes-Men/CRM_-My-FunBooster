import XLSX from 'xlsx';

const filePath = 'c:/Users/dell/Desktop/CRM_Lykos/crm-metier/DATA_OPCO.xlsx';
const workbook = XLSX.readFile(filePath);
const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

console.log('--- RÉSULTATS DE LA RECHERCHE ---');

const matchIdcc = data.filter(row => String(row['IDCC']) === '2494');
const matchNaf = data.filter(row => String(row['CODE NAF/APE']).includes('4778C') || String(row['CODE NAF/APE']).includes('47.78C'));

if (matchIdcc.length > 0) {
  console.log('Trouvé par IDCC (2494) :');
  console.log(JSON.stringify(matchIdcc, null, 2));
} else {
  console.log('IDCC 2494 non trouvé dans le fichier.');
}

if (matchNaf.length > 0) {
  console.log('\nTrouvé par Code NAF (47.78C) :');
  console.log(JSON.stringify(matchNaf, null, 2));
} else {
  console.log('Code NAF 47.78C non trouvé dans le fichier.');
}
