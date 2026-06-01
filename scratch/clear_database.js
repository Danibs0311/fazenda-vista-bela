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

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function clearDatabase() {
  console.log('=== INICIANDO LIMPEZA DO BANCO DE DADOS ===');
  console.log('Conectando a:', env.VITE_SUPABASE_URL);

  // 1. Limpar harvest_logs
  console.log('\n1. Limpando lançamentos de colheita (harvest_logs)...');
  const { count: logCount, error: errLogs } = await supabase
    .from('harvest_logs')
    .delete()
    .neq('id', '');
  
  if (errLogs) {
    console.error('Erro ao limpar harvest_logs:', errLogs.message);
  } else {
    console.log('Lançamentos de colheita limpos com sucesso!');
  }

  // 2. Limpar harvest_weeks
  console.log('\n2. Limpando semanas de colheita (harvest_weeks)...');
  const { error: errWeeks } = await supabase
    .from('harvest_weeks')
    .delete()
    .neq('id', '');

  if (errWeeks) {
    console.error('Erro ao limpar harvest_weeks:', errWeeks.message);
  } else {
    console.log('Semanas de colheita limpas com sucesso!');
  }

  // 3. Limpar collaborators
  console.log('\n3. Limpando colaboradores (collaborators)...');
  const { error: errCollabs } = await supabase
    .from('collaborators')
    .delete()
    .neq('id', '');

  if (errCollabs) {
    console.error('Erro ao limpar colaboradores:', errCollabs.message);
  } else {
    console.log('Colaboradores limpos com sucesso!');
  }

  console.log('\n=== VALIDAÇÃO DOS DADOS ATUAIS ===');
  
  const { data: profs } = await supabase.from('profiles').select('id, nome, role');
  console.log('Usuários da equipe cadastrados (Profiles mantidos):', profs);

  const { data: collabs } = await supabase.from('collaborators').select('count');
  const { data: logs } = await supabase.from('harvest_logs').select('count');
  const { data: weeks } = await supabase.from('harvest_weeks').select('count');

  console.log('\nResumo do banco de dados pós-limpeza:');
  console.log('- Colaboradores:', collabs?.length || 0);
  console.log('- Lançamentos de Colheita:', logs?.length || 0);
  console.log('- Semanas de Colheita:', weeks?.length || 0);
  console.log('============================================');
}

clearDatabase();
