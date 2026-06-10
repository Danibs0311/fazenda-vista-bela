import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rrfcndeukpyjyzdwuhob.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyZmNuZGV1a3B5anl6ZHd1aG9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2ODg5NDEsImV4cCI6MjA5NjI2NDk0MX0.dtqAiiqXLXn61I3Z5_mmXVrO1VYifYoLg_6qchHF4FM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching collaborators to find a test candidate...');
  const { data: collabs, error: fetchErr } = await supabase.from('collaborators').select('*').limit(5);
  if (fetchErr) {
    console.error('Error fetching collaborators:', fetchErr);
    return;
  }
  console.log('Fetched collabs:', collabs.map(c => ({ id: c.id, nome: c.nome })));

  if (collabs.length === 0) {
    console.log('No collaborators found.');
    return;
  }

  const testCollab = collabs[0];
  console.log(`Attempting to delete collaborator "${testCollab.nome}" with ID: ${testCollab.id} using RPC delete_collaborator_by_id...`);
  const { data, error } = await supabase.rpc('delete_collaborator_by_id', { target_id: testCollab.id });
  if (error) {
    console.error('RPC Error:', error);
  } else {
    console.log('RPC Delete successful! Data returned:', data);
  }
}

run();
