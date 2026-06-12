const fs = require('fs');
const envStr = fs.readFileSync('.env', 'utf-8');
const urlMatch = envStr.match(/VITE_SUPABASE_URL=([^\r\n]+)/);
const keyMatch = envStr.match(/VITE_SUPABASE_ANON_KEY=([^\r\n]+)/);
const url = urlMatch[1].replace(/[\"\'\s]/g, '') + '/rest/v1/crm_column_configs?select=key,options';
const key = keyMatch[1].replace(/[\"\'\s]/g, '');

fetch(url, { headers: { apikey: key, Authorization: 'Bearer ' + key } })
  .then(r => r.json())
  .then(data => console.log(JSON.stringify(data, null, 2)));
