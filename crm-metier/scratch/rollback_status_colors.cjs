const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env
const envPath = path.join(__dirname, '..', '.env');
const envFile = fs.readFileSync(envPath, 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        env[key] = value.replace(/^["']|["']$/g, ''); // Remove quotes
    }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function rollback() {
    console.log('Rolling back status options to labels only...');
    const { data: cols } = await supabase.from('crm_column_configs').select('*').in('key', ['status', 'statut_gerant']);
    
    for (const col of cols) {
        const currentOptions = col.options || [];
        const cleanOptions = currentOptions.map(opt => opt.split('::')[0]);
        
        console.log(`Cleaning ${col.key}...`);
        await supabase.from('crm_column_configs').update({ options: cleanOptions }).eq('id', col.id);
    }
    console.log('Rollback successful.');
}

rollback();
