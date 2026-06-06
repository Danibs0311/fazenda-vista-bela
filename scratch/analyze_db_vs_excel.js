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

async function analyze() {
  const email = `temp_anal_${Math.random().toString(36).substring(7)}@test.com`;
  const password = 'AnalPassword123!';
  
  const { data: authData } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nome: 'Temp Anal User', role: 'admin' } }
  });
  if (!authData.session) {
    await supabase.auth.signInWithPassword({ email, password });
  }

  // 1. Fetch all collaborators from database
  let dbCollabs = [];
  let from = 0;
  const limit = 1000;
  let hasMore = true;
  while (hasMore) {
    const { data, error } = await supabase
      .from('collaborators')
      .select('*')
      .range(from, from + limit - 1);
    if (error) {
      console.error(error);
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

  console.log(`Database has ${dbCollabs.length} collaborators.`);

  // 2. Read from FAZENDA BELA VISTA FINAL.xlsm
  const filePath = path.resolve('../FAZENDA BELA VISTA FINAL.xlsm');
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['CADASTROS'];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const headers = Array.from(rows[1] || []).map(h => String(h || '').trim());
  const nameCol = headers.findIndex(h => h && (h.toLowerCase().includes('benefici') || h.toLowerCase() === 'nome'));
  const idCol = headers.findIndex(h => h && h.toLowerCase() === 'id');

  const excelCollabs = [];
  let nextAutoId = 1;

  for (let i = 2; i < rows.length; i++) {
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
    excelCollabs.push({ id, nome });
  }

  console.log(`Excel has ${excelCollabs.length} parsed collaborators.`);

  // Check matching
  const excelIdMap = new Map();
  const excelNameMap = new Map();
  excelCollabs.forEach(c => {
    excelIdMap.set(c.id, c.nome);
    if (!excelNameMap.has(c.nome)) {
      excelNameMap.set(c.nome, []);
    }
    excelNameMap.get(c.nome).push(c.id);
  });

  let exactMatchCount = 0;
  let nameMatchButIdMismatch = 0;
  let idMatchButNameMismatch = 0;
  let dbOnlyCount = 0;

  const dbOnlyList = [];
  const nameMatchButIdMismatchList = [];
  const idMatchButNameMismatchList = [];

  dbCollabs.forEach(db => {
    const dbName = db.nome.toUpperCase();
    const dbId = db.id;

    const excelNameForId = excelIdMap.get(dbId);
    const excelIdsForName = excelNameMap.get(dbName);

    if (excelNameForId === dbName) {
      exactMatchCount++;
    } else if (excelNameForId && excelNameForId !== dbName) {
      idMatchButNameMismatch++;
      idMatchButNameMismatchList.push({ id: dbId, dbName, excelName: excelNameForId });
    } else if (excelIdsForName && excelIdsForName.length > 0) {
      nameMatchButIdMismatch++;
      nameMatchButIdMismatchList.push({ name: dbName, dbId, excelIds: excelIdsForName });
    } else {
      dbOnlyCount++;
      dbOnlyList.push(db);
    }
  });

  console.log('\nAnalysis Summary:');
  console.log(`- Exact matches (ID & Name match Excel): ${exactMatchCount}`);
  console.log(`- ID match but Name mismatch: ${idMatchButNameMismatch}`);
  console.log(`- Name match but ID mismatch: ${nameMatchButIdMismatch}`);
  console.log(`- DB only (not in Excel by ID or Name): ${dbOnlyCount}`);

  if (dbOnlyList.length > 0) {
    console.log('\nSample of DB only records (first 20):');
    console.table(dbOnlyList.slice(0, 20).map(c => ({ id: c.id, nome: c.nome, cpf: c.cpf, data_cadastro: c.data_cadastro })));
  }

  if (nameMatchButIdMismatchList.length > 0) {
    console.log('\nSample of Name match but ID mismatch records (first 20):');
    console.table(nameMatchButIdMismatchList.slice(0, 20));
  }

  if (idMatchButNameMismatchList.length > 0) {
    console.log('\nSample of ID match but Name mismatch records (first 20):');
    console.table(idMatchButNameMismatchList.slice(0, 20));
  }
}

analyze();
