import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://shddjznwrfreskfwicbt.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZGRqem53cmZyZXNrZndpY2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTExMDMsImV4cCI6MjA5MDE4NzEwM30.OthjNkEPuVeTWz8sqJl6AtVWmA7eociqzvt8lerYhHI";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkStatuses() {
    console.log('Fetching status distribution...');
    const { data, error } = await supabase
        .from('crm_leads')
        .select('status');

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    const dist = {};
    data.forEach(l => {
        const s = l.status || 'NULL';
        dist[s] = (dist[s] || 0) + 1;
    });

    console.log('Status Distribution:');
    console.table(dist);
}

checkStatuses();
