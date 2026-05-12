import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://shddjznwrfreskfwicbt.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZGRqem53cmZyZXNrZndpY2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTExMDMsImV4cCI6MjA5MDE4NzEwM30.OthjNkEPuVeTWz8sqJl6AtVWmA7eociqzvt8lerYhHI";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function rollbackData() {
    console.log('🧹 Suppression des leads ajoutés par l\'API (funebooster = "API")...');
    
    const { data, error, count } = await supabase
        .from('crm_leads')
        .delete({ count: 'exact' })
        .eq('funebooster', 'API');

    if (error) {
        console.error('❌ Erreur lors de la suppression:', error.message);
    } else {
        console.log(`✅ Succès ! ${count} leads ont été supprimés.`);
    }
}

rollbackData();
