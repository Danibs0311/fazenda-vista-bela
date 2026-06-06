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

async function compare() {
  const email = `temp_comp_${Math.random().toString(36).substring(7)}@test.com`;
  const password = 'CompPassword123!';
  
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nome: 'Temp Comp User', role: 'admin' }
    }
  });

  if (authError) {
    console.error('Auth failed:', authError.message);
    return;
  }
  if (!authData.session) {
    await supabase.auth.signInWithPassword({ email, password });
  }

  // 1. Read Excel
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

  const excelSample = [];
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

    excelSample.push({ rowIndex: i + 1, excelId: id, excelName: nome });
  }

  console.log(`Parsed ${excelSample.length} collaborators from Excel.`);

  // 2. Fetch those collaborators from the database
  const sampleToCheck = excelSample.slice(0, 30); // Check first 30
  const names = sampleToCheck.map(e => e.excelName);
  
  const { data: dbCollabs, error } = await supabase
    .from('collaborators')
    .select('id, nome')
    .in('nome', names);

  if (error) {
    console.error('Error fetching database:', error.message);
    return;
  }

  console.log('\nComparison of Excel vs Database for first 30 rows:');
  
  const dbMap = new Map();
  dbCollabs.forEach(c => {
    dbMap.set(String(c.nome).trim().toUpperCase(), c.id);
  });

  const comparison = sampleToCheck.map(e => {
    const dbId = dbMap.get(e.excelName) || 'NOT FOUND IN DB';
    return {
      'Excel Row': e.rowIndex,
      'Excel Name': e.excelName,
      'Excel ID': e.excelId,
      'Database ID': dbId,
      'Match?': e.excelId === dbId ? 'YES' : 'NO'
    };
  });

  console.table(comparison);
}

compare();
