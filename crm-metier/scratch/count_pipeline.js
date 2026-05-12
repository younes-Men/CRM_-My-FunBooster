import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://shddjznwrfreskfwicbt.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZGRqem53cmZyZXNrZndpY2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTExMDMsImV4cCI6MjA5MDE4NzEwM30.OthjNkEPuVeTWz8sqJl6AtVWmA7eociqzvt8lerYhHI";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkPipelineLeads() {
    console.log('Counting pipeline leads...');
    const { count, error } = await supabase
        .from('crm_leads')
        .select('*', { count: 'exact', head: true })
        .or('status_rdv.not.is.null,status.in.(RDV,RAPPEL,SIGNE)');

    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Pipeline leads count:', count);
    }
}

checkPipelineLeads();
