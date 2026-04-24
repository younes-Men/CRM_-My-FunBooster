const nafMapping = require('../src/data/naf_mapping.json');

const testCodes = ['47.64Z', '47.11B', '47.76Z', '47.62Z'];

testCodes.forEach(code => {
    const cleanNaf = String(code).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const description = nafMapping[cleanNaf];
    console.log(`Code: ${code} -> Clean: ${cleanNaf} -> Desc: ${description || 'NOT FOUND'}`);
});
