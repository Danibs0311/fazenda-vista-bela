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
  const email = `test_index_${Math.random().toString(36).substring(7)}@test.com`;
  const password = 'TestPassword123!';
  
  console.log(`Signing up test user: ${email}...`);
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nome: 'Test Index User',
        role: 'admin'
      }
    }
  });

  if (authError) {
    console.error('Sign up failed:', authError.message);
    return;
  }

  const session = authData.session;
  if (!session) {
    console.log('Sign up succeeded but email confirmation might be enabled. Trying to sign in...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (signInError) {
      console.error('Sign in failed:', signInError.message);
      return;
    }
    console.log('Signed in successfully!');
  } else {
    console.log('Signed in successfully during sign up!');
  }

  console.log('Cleaning up existing test collaborators...');
  await supabase.from('collaborators').delete().in('id', ['test_idx_1', 'test_idx_2']);

  console.log('Inserting 1st collaborator with valid CPF 111.222.333-44...');
  const { error: err1 } = await supabase.from('collaborators').insert({
    id: 'test_idx_1',
    nome: 'TEST COLLAB 1',
    cpf: '111.222.333-44',
    banco: 'Banco do Brasil',
    agencia: '0001',
    conta: '12345-6',
    tipo_conta: 'corrente',
    status: 'active'
  });

  if (err1) {
    console.error('First insertion failed:', err1.message);
    return;
  }
  console.log('First insertion succeeded!');

  console.log('Inserting 2nd collaborator with valid CPF 111.222.333-44...');
  const { error: err2 } = await supabase.from('collaborators').insert({
    id: 'test_idx_2',
    nome: 'TEST COLLAB 2',
    cpf: '111.222.333-44',
    banco: 'Bradesco',
    agencia: '0002',
    conta: '78901-2',
    tipo_conta: 'corrente',
    status: 'active'
  });

  if (err2) {
    console.log('Second insertion failed (Expected if index exists) with error:', err2.message);
  } else {
    console.log('Second insertion succeeded! WARNING: The unique index on CPF does NOT exist in the database.');
  }

  // Cleanup
  console.log('Cleaning up test records...');
  await supabase.from('collaborators').delete().in('id', ['test_idx_1', 'test_idx_2']);
}

run();
