import xlsx from 'xlsx';

const workbook = xlsx.readFile('Leads2025.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

console.log("Headers:");
console.log(data[0]);
console.log("First row:");
console.log(data[1]);
