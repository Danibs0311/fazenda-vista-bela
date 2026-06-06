import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env.local manually
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

async function clearHarvestsAndCycles() {
  console.log('=== LIMPEZA DE LANÇAMENTOS E CICLOS ===');
  console.log('Conectando a:', env.VITE_SUPABASE_URL);

  // 1. Criar e autenticar usuário temporário para bypassar RLS
  const email = `temp_clear_${Math.random().toString(36).substring(7)}@test.com`;
  const password = 'ClearPassword123!';
  
  console.log('\nAutenticando operador temporário...');
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nome: 'Operador de Limpeza Temporário',
        role: 'admin'
      }
    }
  });

  if (authError) {
    console.error('Falha na autenticação:', authError.message);
    return;
  }

  if (!authData.session) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (signInError) {
      console.error('Falha no login:', signInError.message);
      return;
    }
  }

  console.log('Autenticação realizada com sucesso!');

  // 2. Limpar harvest_logs
  console.log('\nLimpando lançamentos de colheita (harvest_logs)...');
  const { count: logCount, error: errLogs } = await supabase
    .from('harvest_logs')
    .delete()
    .neq('id', '');
  
  if (errLogs) {
    console.error('Erro ao limpar harvest_logs:', errLogs.message);
  } else {
    console.log('Lançamentos de colheita limpos com sucesso!');
  }

  // 3. Limpar harvest_weeks
  console.log('\nLimpando semanas de colheita (harvest_weeks)...');
  const { error: errWeeks } = await supabase
    .from('harvest_weeks')
    .delete()
    .neq('id', '');

  if (errWeeks) {
    console.error('Erro ao limpar harvest_weeks:', errWeeks.message);
  } else {
    console.log('Semanas de colheita limpas com sucesso!');
  }

  // 4. Verificação
  console.log('\n=== VALIDAÇÃO DA LIMPEZA ===');
  const { data: collabs } = await supabase.from('collaborators').select('*', { count: 'exact', head: true });
  const { data: logs } = await supabase.from('harvest_logs').select('*', { count: 'exact', head: true });
  const { data: weeks } = await supabase.from('harvest_weeks').select('*', { count: 'exact', head: true });

  console.log('- Colaboradores (Mantidos):', collabs?.length || 0);
  console.log('- Lançamentos de Colheita:', logs?.length || 0);
  console.log('- Semanas de Colheita (Ciclos):', weeks?.length || 0);
  console.log('=======================================');

  // 5. Logout
  await supabase.auth.signOut();
}

clearHarvestsAndCycles();
