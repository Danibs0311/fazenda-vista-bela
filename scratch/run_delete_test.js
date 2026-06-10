import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rrfcndeukpyjyzdwuhob.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyZmNuZGV1a3B5anl6ZHd1aG9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2ODg5NDEsImV4cCI6MjA5NjI2NDk0MX0.dtqAiiqXLXn61I3Z5_mmXVrO1VYifYoLg_6qchHF4FM';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function run() {
  const email = `testuser_${Date.now()}@test.com`;
  const password = 'TestPassword123!';

  console.log(`Signing up with temporary user ${email}...`);
  const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
    email,
    password
  });

  if (signUpErr) {
    console.error('Sign up error:', signUpErr);
    return;
  }

  console.log('User signed up successfully. ID:', signUpData.user?.id);

  console.log('Signing in...');
  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (signInErr) {
    console.error('Sign in error:', signInErr);
    return;
  }

  console.log('Signed in successfully!');

  // Now try to select collaborators
  console.log('Fetching collaborators...');
  const { data: collabs, error: fetchErr } = await supabase.from('collaborators').select('*');
  if (fetchErr) {
    console.error('Fetch error:', fetchErr);
    return;
  }
  console.log(`Found ${collabs.length} collaborators.`);

  // Let's create a temporary collaborator to test deleting
  const tempId = `temp_${Date.now()}`;
  console.log(`Creating temporary collaborator with ID ${tempId}...`);
  const { error: insertErr } = await supabase.from('collaborators').insert({
    id: tempId,
    nome: 'TEST TEMPORARY COLLAB',
    status: 'active'
  });

  if (insertErr) {
    console.error('Insert error:', insertErr);
    return;
  }
  console.log('Temporary collaborator created.');

  // Test direct delete
  console.log('Attempting direct delete of temporary collaborator...');
  const { error: deleteErr } = await supabase.from('collaborators').delete().eq('id', tempId);
  if (deleteErr) {
    console.error('Direct delete failed:', deleteErr);
  } else {
    console.log('Direct delete succeeded!');
  }

  // Let's test RPC delete on the same ID (just to see if the RPC exists)
  console.log('Testing RPC delete...');
  const { error: rpcErr } = await supabase.rpc('delete_collaborator_by_id', { target_id: tempId });
  if (rpcErr) {
    console.error('RPC delete failed:', rpcErr);
  } else {
    console.log('RPC delete succeeded!');
  }
}

run();
