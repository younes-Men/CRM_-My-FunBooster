const fs = require('fs');
const path = require('path');

const rawData = fs.readFileSync(path.join(__dirname, 'naf_data.txt'), 'utf8');

const mapping = {};

const lines = rawData.split('\n');
lines.forEach(line => {
    line = line.trim();
    if (!line || line === '?' || line === '-') return;
    
    line = line.replace(/^"+|"+$/g, '');
    
    // Support both : and - as separators
    const match = line.match(/^([A-Z0-9\/ ]+)\s*[:-]\s*(.*)$/i);
    if (match) {
        let codesStr = match[1];
        const description = match[2].trim();
        
        codesStr = codesStr.replace(/^NAF\s+/i, '');
        
        const codes = codesStr.split(/[\/\s]+/).map(c => c.trim()).filter(c => c.length >= 4);
        
        codes.forEach(code => {
            const cleanCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (cleanCode.length >= 4) {
                mapping[cleanCode] = description;
            }
        });
    }
});

fs.writeFileSync(path.join(__dirname, '../src/data/naf_mapping.json'), JSON.stringify(mapping, null, 2));
console.log(`Generated mapping with ${Object.keys(mapping).length} entries.`);
