import { createClient } from '@supabase/supabase-js';

// Credentials from .env
const SUPABASE_URL = "https://cwqyxucygjbzqjrmymxv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cXl4dWN5Z2pienFqcm15bXh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MjYyNDUsImV4cCI6MjA4MDAwMjI0NX0.KPDLC6uZpl30SsACky81p08eqqNjbAIgiQUheIQo_dk";
const CRM_SUPABASE_URL = "https://shddjznwrfreskfwicbt.supabase.co";
const CRM_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZGRqem53cmZyZXNrZndpY2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTExMDMsImV4cCI6MjA5MDE4NzEwM30.OthjNkEPuVeTWz8sqJl6AtVWmA7eociqzvt8lerYhHI";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const supabaseCrm = createClient(CRM_SUPABASE_URL, CRM_SUPABASE_KEY);

async function verifySync() {
  console.log('--- SYNC VERIFICATION ---');
  
  // 1. Get a random lead from Entreprise
  const { data: ent, error: entError } = await supabase
    .from('entreprise')
    .select('siret, status, date_modification')
    .limit(1)
    .single();

  if (entError) {
    console.error('❌ Error fetching from entreprise:', entError.message);
    return;
  }

  console.log(`📍 Testing with SIRET: ${ent.siret}`);
  console.log(`   Entreprise Status: ${ent.status}`);
  console.log(`   Entreprise Modif: ${ent.date_modification}`);

  // 2. Check if it exists in CRM
  const { data: crm, error: crmError } = await supabaseCrm
    .from('crm_leads')
    .select('siret, status, date_modification')
    .eq('siret', ent.siret)
    .single();

  if (crmError) {
    console.warn(`⚠️  Lead not found in CRM: ${crmError.message}`);
  } else {
    console.log(`   CRM Status: ${crm.status}`);
    console.log(`   CRM Modif: ${crm.date_modification}`);
    
    if (ent.date_modification === crm.date_modification) {
      console.log('✅ Dates are identical.');
    } else {
      console.log('❌ Dates are DIFFERENT.');
    }
  }

  // 3. Test a manual sync via code logic (simulating the API)
  console.log('\n--- Simulating Sync Update ---');
  const testStatus = ent.status === 'A traiter' ? 'Rappel' : 'A traiter';
  const newDate = new Date().toISOString();
  
  console.log(`   Updating to Status: ${testStatus} with Date: ${newDate}`);

  // Update entreprise
  const { error: upEntError } = await supabase
    .from('entreprise')
    .update({ status: testStatus, date_modification: newDate })
    .eq('siret', ent.siret);

  if (upEntError) {
    console.error('❌ Update Entreprise failed:', upEntError.message);
    return;
  }

  // Update CRM
  const { error: upCrmError } = await supabaseCrm
    .from('crm_leads')
    .upsert({ 
      siret: ent.siret, 
      status: testStatus, 
      date_modification: newDate 
    }, { onConflict: 'siret' });

  if (upCrmError) {
    console.error('❌ Update CRM failed:', upCrmError.message);
  } else {
    console.log('✅ Sync successful via upsert.');
  }

  // Re-verify
  const { data: finalCrm } = await supabaseCrm
    .from('crm_leads')
    .select('date_modification')
    .eq('siret', ent.siret)
    .single();
    
  console.log(`   Final CRM Modif: ${finalCrm.date_modification}`);
  if (finalCrm.date_modification === newDate) {
    console.log('✅ Final verification: SUCCESS (CRM reflects system date)');
  } else {
    console.log('❌ Final verification: FAILURE (CRM date was overwritten or not updated)');
  }
}

verifySync();
