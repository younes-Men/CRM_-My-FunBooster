const xlsx = require('xlsx');
const fs = require('fs');

try {
  const workbook = xlsx.readFile('DATA_OPCO.xlsx');
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet);

  // Take a look at the first few rows to understand the structure
  console.log("First 3 rows:", JSON.stringify(data.slice(0, 3), null, 2));

  // Let's create a mapping 
  // We need to map IDCC to { secteur: ACTIVITÉ, libelle: SOUS ACTIVITÉ }
  const mapping = {};
  
  data.forEach(row => {
    // We need to find the right keys. Excel headers might have spaces.
    const keys = Object.keys(row);
    let idcc, naf, activite, sousActivite;
    
    keys.forEach(k => {
      const kUpper = k.toUpperCase().trim();
      if (kUpper.includes('IDCC')) idcc = row[k];
      if (kUpper.includes('CODE NAF') || kUpper.includes('CODE APE') || kUpper.includes('NAF/APE') || kUpper === 'NAF') naf = row[k];
      if (kUpper === 'ACTIVITÉ' || kUpper === 'ACTIVITE' || kUpper.includes('SECTEUR')) activite = row[k];
      if (kUpper === 'SOUS ACTIVITÉ' || kUpper === 'SOUS ACTIVITE' || kUpper.includes('LIBELL')) sousActivite = row[k];
    });

    if (idcc) {
      // IDCC can be a number or string. Let's make it a clean string.
      const cleanIdcc = String(idcc).trim();
      if (!mapping[cleanIdcc]) {
        mapping[cleanIdcc] = { 
          activite: activite ? String(activite).trim() : '', 
          sous_activite: sousActivite ? String(sousActivite).trim() : ''
        };
      }
    }
  });

  console.log(`\nSuccessfully mapped ${Object.keys(mapping).length} IDCC codes.`);
  
  fs.writeFileSync('src/data/opco_mapping.json', JSON.stringify(mapping, null, 2));
  console.log("Written mapping to src/data/opco_mapping.json");

} catch (e) {
  console.error("Error reading file:", e.message);
}
