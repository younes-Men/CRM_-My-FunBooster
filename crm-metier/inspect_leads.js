import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://shddjznwrfreskfwicbt.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZGRqem53cmZyZXNrZndpY2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTExMDMsImV4cCI6MjA5MDE4NzEwM30.OthjNkEPuVeTWz8sqJl6AtVWmA7eociqzvt8lerYhHI";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspect() {
    console.log('🔍 Inspection des 5 derniers leads ajoutés...');
    const { data, error } = await supabase
        .from('crm_leads')
        .select('id, funebooster, date_modification, nom_entreprise')
        .order('date_modification', { ascending: false })
        .limit(10);

    if (error) {
        console.error('❌ Erreur:', error.message);
    } else {
        console.table(data);
    }
}

inspect();
