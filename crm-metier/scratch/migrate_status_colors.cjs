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

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL or Key missing in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_COLORS = {
    'A TRAITER':            '#1e293b', 
    'ABSENT':               '#64748b',
    'DEJA PEC':             '#8b5cf6',
    'FAUX NUM':             '#dc2626',
    'HORS CIBLE OPCO':      '#374151',
    'HORS CIBLE SIÈGE':     '#374151',
    'HORS CIBLE SALARIÉS':  '#374151',
    'NRP':                  '#1d4ed8',
    'OCCUPÉ':               '#0891b2',
    'PAS DE NUM':           '#7c3aed',
    'PI':                   '#0f172a',
    'RAPPEL':               '#d97706',
    'RDV':                  '#16a34a',
    'EN ATTENTE RDV':       '#f97316',
    'REPONDEUR':            '#475569',
    'SIGNE':                '#ff007f',
    'À RENSEIGNER':         '#1a1a1a',
    'TNS':                  '#c084fc',
    '2 TNS':                '#e9d5ff',
    'GÉRANT SALARIÉ':       '#facc15',
    '2 GÉRANTS SALARIÉS':   '#a3e635'
};

async function migrate() {
    console.log('Starting migration...');
    const { data: cols, error: fetchError } = await supabase.from('crm_column_configs').select('*').in('key', ['status', 'statut_gerant']);
    
    if (fetchError) {
        console.error('Error fetching columns:', fetchError);
        return;
    }

    for (const col of cols) {
        const currentOptions = col.options || [];
        const newOptions = currentOptions.map(opt => {
            if (opt.includes('::')) return opt; // Already migrated
            const label = opt.toUpperCase().trim();
            const color = DEFAULT_COLORS[label] || '#64748b';
            return `${label}::${color}::v`;
        });
        
        console.log(`Migrating ${col.key} options...`);
        const { error: updateError } = await supabase.from('crm_column_configs').update({ options: newOptions }).eq('id', col.id);
        if (updateError) console.error(`Error updating ${col.key}:`, updateError);
        else console.log(`${col.key} migration successful`);
    }
}

migrate();
