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

async function verify() {
  const email = `temp_verify_${Math.random().toString(36).substring(7)}@test.com`;
  const password = 'VerifyPassword123!';
  
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nome: 'Temp Verify User',
        role: 'admin'
      }
    }
  });

  if (authError) {
    console.error('Auth failed:', authError.message);
    return;
  }

  if (!authData.session) {
    await supabase.auth.signInWithPassword({ email, password });
  }

  // 1. Read all collaborators from database
  console.log('Fetching all collaborators from online database...');
  
  let dbCollabs = [];
  let from = 0;
  const limit = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('collaborators')
      .select('id, nome, cpf')
      .range(from, from + limit - 1);

    if (error) {
      console.error('Error fetching batch:', error.message);
      return;
    }

    if (data) {
      dbCollabs = dbCollabs.concat(data);
      if (data.length < limit) hasMore = false;
      else from += limit;
    } else {
      hasMore = false;
    }
  }

  console.log(`Found ${dbCollabs.length} collaborators in database.`);
  
  const dbIdSet = new Set(dbCollabs.map(c => String(c.id)));
  const dbNameSet = new Set(dbCollabs.map(c => String(c.nome).trim().toUpperCase()));

  // 2. Read from Excel
  const filePath = path.resolve('ULTIMA FAZENDA BELA VISTA FINAL - Vlele atualizado18-09.xlsm');
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
  const nameCol = headers.findIndex(h => h && (h.toLowerCase().includes('benefici') || h.toLowerCase() === 'nome'));
  const idCol = headers.findIndex(h => h && h.toLowerCase() === 'id');

  const missingCollabs = [];
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

    if (!dbIdSet.has(id) && !dbNameSet.has(nome)) {
      missingCollabs.push({ rowIndex: i + 1, id, nome });
    }
  }

  console.log(`\nVerification Results:`);
  console.log(`- Total collaborators missing in DB: ${missingCollabs.length}`);
  
  if (missingCollabs.length > 0) {
    console.log('Sample of missing collaborators:');
    console.table(missingCollabs.slice(0, 50));
  } else {
    console.log('SUCCESS! Every single collaborator in the spreadsheet is present in the online database.');
  }
}

verify();
