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
  await supabase.auth.signUp({ email, password });
  console.log('Signing in...');
  await supabase.auth.signInWithPassword({ email, password });
  console.log('Signed in successfully!');

  // Fetch a harvest log to find a collaborator who has a harvest
  console.log('Fetching a harvest log to find a collaborator with harvests...');
  const { data: logs, error: logErr } = await supabase.from('harvest_logs').select('colaborador_id').limit(1);
  if (logErr) {
    console.error('Error fetching harvest log:', logErr);
    return;
  }

  if (logs.length === 0) {
    console.log('No harvest logs found to test foreign key constraint.');
    return;
  }

  const collabId = logs[0].colaborador_id;
  console.log(`Attempting to delete collaborator with ID ${collabId} who has harvests...`);
  const { error: deleteErr } = await supabase.from('collaborators').delete().eq('id', collabId);
  if (deleteErr) {
    console.log('Delete failed as expected. Error object:');
    console.log(JSON.stringify(deleteErr, null, 2));
  } else {
    console.log('Unexpected success! Collaborator was deleted.');
  }
}

run();
