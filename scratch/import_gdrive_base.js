import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
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

function validateCPF(cpf) {
  if (!cpf) return false;
  const cleanCPF = cpf.replace(/\D/g, '');
  if (cleanCPF === '00000000000') return true; // Permitir CPF zerado
  if (cleanCPF.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  let sum = 0;
  let rest;
  for (let i = 1; i <= 9; i++) sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
  rest = (sum * 10) % 11;
  if ((rest === 10) || (rest === 11)) rest = 0;
  if (rest !== parseInt(cleanCPF.substring(9, 10))) return false;
  
  sum = 0;
  for (let i = 1; i <= 10; i++) sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
  rest = (sum * 10) % 11;
  if ((rest === 10) || (rest === 11)) rest = 0;
  if (rest !== parseInt(cleanCPF.substring(10, 11))) return false;
  
  return true;
}

const normalizeOperation = (op) => {
  let cleanOp = (op || '').replace(/\s+/g, ' ').trim().toUpperCase();
  if (/^\d+(\.0+)?$/.test(cleanOp)) {
    cleanOp = String(Math.floor(parseFloat(cleanOp)));
  }
  if (!cleanOp || cleanOp === '0') return 'XXXX';
  if (cleanOp === '13') return '013';
  if (cleanOp === '23') return '023';
  if (
    cleanOp === 'C/ CORR' || 
    cleanOp === 'C/CORR' || 
    cleanOp === 'CORR' || 
    cleanOp === 'CC' || 
    cleanOp === 'C.CORR' || 
    cleanOp === 'C. CORR' || 
    cleanOp === 'C.CORRENTE' || 
    cleanOp === 'C. CORRENTE'
  ) return 'CORRENTE';
  if (
    cleanOp === 'C/POUP' || 
    cleanOp === 'C/ POUP' || 
    cleanOp === 'POUP' || 
    cleanOp === 'CP' || 
    cleanOp === 'POUPANCA' ||
    cleanOp === 'C.POUP' ||
    cleanOp === 'C. POUP'
  ) return 'POUPANÇA';
  return cleanOp;
};

const registeredBanks = [
  { nome: 'Banco do Brasil', codigo: '001' },
  { nome: 'Bradesco', codigo: '237' },
  { nome: 'Itaú', codigo: '341' },
  { nome: 'Santander', codigo: '033' },
  { nome: 'Nubank', codigo: '260' },
  { nome: 'Inter', codigo: '077' },
  { nome: 'C6 Bank', codigo: '336' },
  { nome: 'Caixa Econômica', codigo: '104' }
];

const intelligentMatchBank = (bankName) => {
  if (!bankName) return 'OUTRO';
  
  const clean = String(bankName).trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

  if (clean.includes('caixa') || clean.includes('cx') || clean.includes('cef') || clean.includes('economica')) {
    const found = registeredBanks.find(b => {
      const nameClean = b.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return nameClean.includes('caixa') || nameClean.includes('cx') || nameClean.includes('cef') || nameClean.includes('economica');
    });
    if (found) return found.nome;
    return 'CAIXA ECONÔMICA';
  }

  if (clean === 'bb' || clean.includes('brasil') || clean.includes('dobrasil')) {
    const found = registeredBanks.find(b => {
      const nameClean = b.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return nameClean.includes('brasil') || nameClean.includes('bb');
    });
    if (found) return found.nome;
    return 'BANCO DO BRASIL';
  }

  if (clean.includes('itau')) {
    const found = registeredBanks.find(b => {
      const nameClean = b.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return nameClean.includes('itau');
    });
    if (found) return found.nome;
    return 'ITAÚ UNIBANCO';
  }

  if (clean.includes('nubank') || clean === 'nu') {
    const found = registeredBanks.find(b => {
      const nameClean = b.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return nameClean.includes('nubank') || nameClean === 'nu';
    });
    if (found) return found.nome;
    return 'NUBANK';
  }

  if (clean.includes('inter')) {
    const found = registeredBanks.find(b => {
      const nameClean = b.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return nameClean.includes('inter');
    });
    if (found) return found.nome;
    return 'INTER';
  }

  if (clean.includes('bradesco') || clean.includes('brad')) {
    const found = registeredBanks.find(b => {
      const nameClean = b.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return nameClean.includes('bradesco') || nameClean.includes('brad');
    });
    if (found) return found.nome;
    return 'BRADESCO';
  }

  for (const b of registeredBanks) {
    const nameClean = b.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    if (nameClean.includes(clean) || clean.includes(nameClean)) {
      return b.nome;
    }
  }

  return String(bankName).trim().toUpperCase();
};

async function run() {
  console.log('=== AUTHENTICATING IMPORTER USER ===');
  const email = `temp_master_imp_${Math.random().toString(36).substring(7)}@test.com`;
  const password = 'MasterImpPassword123!';
  
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nome: 'Temp Master Importer',
        role: 'admin'
      }
    }
  });

  if (authError) {
    console.error('Authentication failed:', authError.message);
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
  console.log('Authenticated successfully!');

  // 1. Clear database collaborators
  console.log('\n=== Wiping collaborators table ===');
  const { error: wipeError } = await supabase
    .from('collaborators')
    .delete()
    .neq('id', '');

  if (wipeError) {
    console.error('Wipe failed:', wipeError.message);
    return;
  }
  console.log('collaborators table cleared successfully.');

  // 2. Parse Google Drive Excel
  const filePath = 'L:\\Meu Drive\\DG GROUP\\Base de dados.xlsm';
  console.log(`\n=== Parsing Excel: ${filePath} ===`);
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['CADASTROS'];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const parsedCollabs = [];
  const seenCpfs = new Set();
  let duplicateCount = 0;

  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const val0 = row[0];
    const val1 = row[1];
    const val2 = row[2];

    const isVal0Number = val0 !== undefined && val0 !== null && /^\d+$/.test(String(val0).trim());
    const isVal1Name = val1 !== undefined && val1 !== null && String(val1).trim().length > 2 && !/^\d+$/.test(String(val1).trim());

    if (!isVal0Number || !isVal1Name) {
      continue;
    }

    let id = String(val0).trim();
    if (id && /^\d+(\.0+)?$/.test(id)) {
      id = String(Math.floor(parseFloat(id)));
    }

    const nome = String(val1).trim().toUpperCase();
    
    let cpfRaw = String(row[2] || '').trim().replace(/\D/g, '');
    let formattedCpf = '000.000.000-00';
    if (cpfRaw && cpfRaw.length === 11 && validateCPF(cpfRaw)) {
      formattedCpf = cpfRaw.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }

    // CPF Duplicity prevention:
    // If CPF is a real formatted CPF (not 000.000.000-00) and we've already seen it, zero it out.
    if (formattedCpf !== '000.000.000-00') {
      if (seenCpfs.has(formattedCpf)) {
        duplicateCount++;
        console.warn(`[DUPLICATE CPF] Row ${i + 1}: Name "${nome}" has duplicate CPF ${formattedCpf}. Setting to 000.000.000-00 to avoid DB collision.`);
        formattedCpf = '000.000.000-00';
      } else {
        seenCpfs.add(formattedCpf);
      }
    }

    const bancoRaw = String(row[3] || '').trim();
    const banco = intelligentMatchBank(bancoRaw);
    const agencia = String(row[4] || '').trim();
    const rawOp = String(row[5] || '').trim();
    const tipo_conta = normalizeOperation(rawOp);
    const conta = String(row[6] || '').trim();

    parsedCollabs.push({
      id,
      nome,
      cpf: formattedCpf,
      banco: banco.toUpperCase(),
      agencia: (agencia || '0000').toUpperCase(),
      conta: (conta || '00000-0').toUpperCase(),
      tipo_conta: tipo_conta.toUpperCase(),
      status: 'active',
      data_cadastro: new Date().toISOString()
    });
  }

  console.log(`Parsed ${parsedCollabs.length} collaborators from Excel.`);
  console.log(`Duplicate valid CPFs set to zero: ${duplicateCount}`);
  console.log('Uploading in batches...');

  const batchSize = 100;
  let successfulInserts = 0;

  for (let j = 0; j < parsedCollabs.length; j += batchSize) {
    const batch = parsedCollabs.slice(j, j + batchSize);
    console.log(`Uploading batch ${j / batchSize + 1} (${j} to ${j + batch.length})...`);
    
    const { error: upsertErr } = await supabase.from('collaborators').upsert(batch);
    if (upsertErr) {
      console.error(`Error saving batch ${j / batchSize + 1}:`, upsertErr.message);
      process.exit(1);
    }
    successfulInserts += batch.length;
  }

  console.log(`\nImport completed successfully! ${successfulInserts} collaborators imported into Supabase.`);
}

run();
