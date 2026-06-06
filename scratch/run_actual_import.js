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
  
  // Reject simple repetitive sequences
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  
  let sum = 0;
  let remainder;
  
  for (let i = 1; i <= 9; i++) sum = sum + parseInt(cpf.substring(i - 1, i)) * (11 - i);
  remainder = (sum * 10) % 11;
  
  if ((remainder === 10) || (remainder === 11)) remainder = 0;
  if (remainder !== parseInt(cpf.substring(9, 10))) return false;
  
  sum = 0;
  for (let i = 1; i <= 10; i++) sum = sum + parseInt(cpf.substring(i - 1, i)) * (12 - i);
  remainder = (sum * 10) % 11;
  
  if ((remainder === 10) || (remainder === 11)) remainder = 0;
  if (remainder !== parseInt(cpf.substring(10, 11))) return false;
  
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
  const email = `temp_importer_${Math.random().toString(36).substring(7)}@test.com`;
  const password = 'TempPassword123!';
  
  console.log(`Authenticating temporary user...`);
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nome: 'Temp Importer User',
        role: 'admin'
      }
    }
  });

  if (authError) {
    console.error('Authentication failed:', authError.message);
    return;
  }

  if (!authData.session) {
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (signInError) {
      console.error('Sign in failed:', signInError.message);
      return;
    }
  }
  console.log('Authenticated successfully!');

  const filePath = path.resolve('ULTIMA FAZENDA BELA VISTA FINAL - Vlele atualizado18-09.xlsm');
  console.log(`Reading Excel file: ${filePath}...`);
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames.find(name => 
    /colaboradores|cadastros|colaborador|cadastro|membros|equipe/i.test(name)
  ) || workbook.SheetNames[0];

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  let headerIndex = -1;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i];
    if (row && (row.includes('ID') || row.includes('BENEFICIÁRIOS') || row.includes('NOME') || row.includes('Banco'))) {
      headerIndex = i;
      break;
    }
  }
  if (headerIndex === -1) headerIndex = 0;

  const headers = Array.from(rows[headerIndex] || []).map(h => String(h || '').trim());
  
  let idCol = headers.findIndex(h => {
    if (!h) return false;
    const s = h.toLowerCase().trim();
    return s === 'id' || s === 'código' || s === 'codigo' || s === 'nº' || s === 'no' || s === 'cadastro' || s === 'cod' || s.startsWith('id ') || s.startsWith('id.');
  });
  let nameCol = headers.findIndex(h => {
    if (!h) return false;
    const s = h.toLowerCase().trim();
    return s.includes('benefici') || s.includes('nome') || s.includes('colaborador') || s === 'nome completo';
  });
  let cpfCol = headers.findIndex(h => {
    if (!h) return false;
    const s = h.toLowerCase().trim();
    return s === 'cpf' || s === 'documento' || s.includes('cpf');
  });
  let bankCol = headers.findIndex(h => {
    if (!h) return false;
    const s = h.toLowerCase().trim();
    return s.includes('banco') || s.includes('institu');
  });
  let agCol = headers.findIndex(h => {
    if (!h) return false;
    const s = h.toLowerCase().trim();
    return s.startsWith('ag') || s.includes('agencia') || s.includes('agência');
  });
  let opCol = headers.findIndex(h => {
    if (!h) return false;
    const s = h.toLowerCase().trim();
    return (
      s === 'op' || s === 'op.' || s === 'o.p' || s.startsWith('op ') || s.startsWith('op.') ||
      s.startsWith('oper') || s.includes('tipo') || s.includes('tp') || s.includes('c/c') ||
      s.includes('c/p') || s.includes('operação') || s.includes('operacao')
    );
  });
  let accCol = headers.findIndex(h => {
    if (!h) return false;
    const s = h.toLowerCase().trim();
    return s.includes('conta') && !s.includes('tipo') && !s.includes('op');
  });

  const parsedCollabs = [];
  let nextAutoId = 1;

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rawName = row[nameCol];
    if (!rawName || String(rawName).trim() === '') continue;

    const nome = String(rawName).trim().toUpperCase();
    
    let rawId = idCol !== -1 ? String(row[idCol] || '').trim() : '';
    if (rawId && /^\d+(\.0+)?$/.test(rawId)) {
      rawId = String(Math.floor(parseFloat(rawId)));
    }
    const id = rawId || String(nextAutoId++);

    let cpf = cpfCol !== -1 && row[cpfCol] ? String(row[cpfCol]).trim().replace(/\D/g, '') : '';
    let formattedCpf = '000.000.000-00';
    if (cpf && cpf.length === 11 && validateCPF(cpf)) {
      formattedCpf = cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }

    const bancoRaw = bankCol !== -1 ? String(row[bankCol] || '').trim() : '';
    const banco = intelligentMatchBank(bancoRaw);
    const agencia = agCol !== -1 ? String(row[agCol] || '').trim() : '';
    const rawOp = opCol !== -1 ? String(row[opCol] || '').trim() : '';
    const tipo_conta = normalizeOperation(rawOp);
    const conta = accCol !== -1 ? String(row[accCol] || '').trim() : '';

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

  console.log(`Parsed ${parsedCollabs.length} collaborators from Excel. Starting database upload...`);

  const batchSize = 100;
  let successfulInserts = 0;

  for (let j = 0; j < parsedCollabs.length; j += batchSize) {
    const batch = parsedCollabs.slice(j, j + batchSize);
    console.log(`Uploading batch ${j / batchSize + 1} (${j} to ${j + batch.length})...`);
    
    const { error: upsertErr } = await supabase.from('collaborators').upsert(batch);
    if (upsertErr) {
      console.error(`Error saving batch ${j / batchSize + 1}:`, upsertErr.message);
      console.error('First item in batch was:', batch[0]);
      process.exit(1);
    }
    successfulInserts += batch.length;
  }

  console.log(`\nImport completed successfully! ${successfulInserts} collaborators imported into Supabase.`);
}

run();
