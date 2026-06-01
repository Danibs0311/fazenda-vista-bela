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

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('Testing duplicate CPF insertions...');
  
  // Cleanup test records
  await supabase.from('collaborators').delete().in('id', ['test_dup_1', 'test_dup_2']);

  // Insert 1st
  const { data: d1, error: e1 } = await supabase.from('collaborators').insert({
    id: 'test_dup_1',
    nome: 'TEST DUP 1',
    cpf: '000.000.000-00',
    banco: 'Banco do Brasil',
    agencia: '0001',
    conta: '12345-6',
    tipo_conta: 'corrente',
    status: 'active'
  }).select();

  if (e1) {
    console.error('Insert 1 failed:', e1.message);
    return;
  }
  console.log('Insert 1 succeeded!');

  // Insert 2nd with same CPF
  const { data: d2, error: e2 } = await supabase.from('collaborators').insert({
    id: 'test_dup_2',
    nome: 'TEST DUP 2',
    cpf: '000.000.000-00',
    banco: 'Banco do Brasil',
    agencia: '0001',
    conta: '12345-6',
    tipo_conta: 'corrente',
    status: 'active'
  }).select();

  if (e2) {
    console.error('Insert 2 failed with error:', e2.message, e2.code);
  } else {
    console.log('Insert 2 succeeded! Database does NOT have a unique constraint on CPF.');
  }

  // Cleanup
  await supabase.from('collaborators').delete().in('id', ['test_dup_1', 'test_dup_2']);
}

run();
