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

async function checkDatabase() {
  console.log('Connecting to online Supabase project:', env.VITE_SUPABASE_URL);

  const email = `temp_check_${Math.random().toString(36).substring(7)}@test.com`;
  const password = 'CheckPassword123!';
  
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nome: 'Temp Check User',
        role: 'admin'
      }
    }
  });

  if (authError) {
    console.error('Auth failed:', authError.message);
    return;
  }

  if (!authData.session) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (signInError) {
      console.error('Sign in failed:', signInError.message);
      return;
    }
  }

  const tables = ['collaborators', 'banks', 'pricing_config', 'harvest_weeks', 'harvest_logs'];
  
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
      
    if (error) {
      console.error(`Error checking table ${table}:`, error.message);
    } else {
      console.log(`- Table "${table}": ${count} records online.`);
    }
  }
}

checkDatabase();
