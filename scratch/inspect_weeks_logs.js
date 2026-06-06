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
  const email = `temp_chk_${Math.random().toString(36).substring(7)}@test.com`;
  const password = 'CheckPassword123!';
  
  await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nome: 'Temp Checker',
        role: 'admin'
      }
    }
  });

  await supabase.auth.signInWithPassword({
    email,
    password
  });

  const { data: weeks } = await supabase.from('harvest_weeks').select('*');
  console.log('=== HARVEST WEEKS ===');
  console.log(weeks);

  const { data: logs } = await supabase.from('harvest_logs').select('*').limit(10);
  console.log('=== HARVEST LOGS (first 10) ===');
  console.log(logs);
}

run();
