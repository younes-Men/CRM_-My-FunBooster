import XLSX from 'xlsx';
import path from 'path';

const filePath = 'c:/Users/dell/Desktop/CRM_Lykos/crm-metier/DATA_OPCO.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('--- STRUCTURE DU FICHIER ---');
console.log('Colonnes trouvées :', Object.keys(data[0] || {}));
console.log('--- 5 PREMIÈRES LIGNES ---');
console.log(JSON.stringify(data.slice(0, 5), null, 2));
