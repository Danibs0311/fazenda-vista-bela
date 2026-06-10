import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    env[match[1]] = (match[2] || '').replace(/['"]/g, '').trim();
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const email = `delete_test_user_${Math.random().toString(36).substring(7)}@test.com`;
  const password = 'TestPassword123!';

  console.log('1. Registering user...');
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: 'admin',
        nome: 'DELETE TEST USER'
      }
    }
  });

  if (authErr) {
    console.error('Sign up error:', authErr.message);
    return;
  }
  const userId = authData.user.id;
  console.log('User registered with ID:', userId);

  console.log('2. Signing in...');
  await supabase.auth.signInWithPassword({ email, password });

  // Create temporary collaborator and week
  const collabId = 'DEL_TEST_COLLAB';
  await supabase.from('collaborators').upsert({ id: collabId, nome: 'DEL TEST COLLAB' });
  const weekId = '2026-06-05';
  await supabase.from('harvest_weeks').upsert({ id: weekId, data_inicio: '2026-06-05', data_fim: '2026-06-11', status: 'aberta' });

  // Insert test log
  const logId = 'DEL_TEST_LOG_' + Math.random().toString(36).substring(7).toUpperCase();
  console.log('3. Inserting test log:', logId);
  const { error: insErr } = await supabase.from('harvest_logs').upsert({
    id: logId,
    colaborador_id: collabId,
    semana_id: weekId,
    data_colheita: '2026-06-09',
    quantidade_latas: 5,
    valor_por_lata: 5.50,
    valor_total_dia: 27.50,
    criado_por_id: userId,
    criado_por_nome: 'DELETE TEST USER'
  });
  if (insErr) {
    console.error('Insert error:', insErr.message);
    return;
  }
  console.log('Insert success!');

  // Try to delete the log
  console.log('4. Attempting to delete test log:', logId);
  const { data: delData, error: delErr } = await supabase
    .from('harvest_logs')
    .delete()
    .eq('id', logId);

  console.log('Delete Response:', delData);
  console.log('Delete Error:', delErr ? delErr.message : 'None');

  // Verify if it is still in the database
  console.log('5. Verifying if record exists...');
  const { data: checkData, error: checkErr } = await supabase
    .from('harvest_logs')
    .select('*')
    .eq('id', logId);
  console.log('Check Count:', checkData ? checkData.length : 0);
  console.log('Check Error:', checkErr ? checkErr.message : 'None');

  // Cleanup
  console.log('6. Cleaning up...');
  await supabase.from('collaborators').delete().eq('id', collabId);
  console.log('Cleanup complete!');
}

run();
