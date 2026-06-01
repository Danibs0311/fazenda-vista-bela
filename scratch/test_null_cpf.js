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

async function testCpf() {
  const testId = 'test_null_cpf_99999';
  console.log('Testing inserting collaborator with null CPF...');
  
  // 1. Delete if exists
  await supabase.from('collaborators').delete().eq('id', testId);

  // 2. Insert with null CPF
  const { data, error } = await supabase.from('collaborators').insert({
    id: testId,
    nome: 'TEST NULL CPF',
    cpf: null,
    banco: 'Banco do Brasil',
    agencia: '0001',
    conta: '12345-6',
    tipo_conta: 'corrente',
    status: 'active'
  }).select();

  if (error) {
    console.error('Insert failed:', error.message, error.code);
  } else {
    console.log('Insert succeeded! Collaborator details:', data);
    // Cleanup
    await supabase.from('collaborators').delete().eq('id', testId);
  }
}

testCpf();
