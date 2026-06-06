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

async function check() {
  const email = `temp_q_5_${Math.random().toString(36).substring(7)}@test.com`;
  const password = 'QueryPassword123!';
  
  const { data: authData } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nome: 'Temp Query User', role: 'admin' } }
  });
  if (!authData.session) {
    await supabase.auth.signInWithPassword({ email, password });
  }

  const { data, error } = await supabase
    .from('collaborators')
    .select('*')
    .eq('id', '5');
    
  if (error) {
    console.error(error);
    return;
  }
  
  console.log('Results for ID 5:');
  console.log(JSON.stringify(data, null, 2));
}

check();
