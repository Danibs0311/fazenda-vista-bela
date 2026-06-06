import XLSX from 'xlsx';
import path from 'path';

const filePath = path.resolve('ULTIMA FAZENDA BELA VISTA FINAL - Vlele atualizado18-09.xlsm');

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

try {
  const workbook = XLSX.readFile(filePath);
  let sheetName = workbook.SheetNames.find(name => 
    /colaboradores|cadastros|colaborador|cadastro|membros|equipe/i.test(name)
  ) || workbook.SheetNames[0];

  console.log('Detected sheet name:', sheetName);
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  console.log('Total rows read:', rows.length);

  let headerIndex = -1;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i];
    if (row && (row.includes('ID') || row.includes('BENEFICIÁRIOS') || row.includes('NOME') || row.includes('Banco'))) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    headerIndex = 0;
  }
  console.log('Detected headerIndex:', headerIndex);

  const headers = Array.from(rows[headerIndex] || []).map(h => String(h || '').trim());
  console.log('Headers:', headers);

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
      s === 'op' || 
      s === 'op.' || 
      s === 'o.p' || 
      s.startsWith('op ') || 
      s.startsWith('op.') || 
      s.startsWith('oper') || 
      s.includes('tipo') || 
      s.includes('tp') || 
      s.includes('c/c') || 
      s.includes('c/p') ||
      s.includes('operação') ||
      s.includes('operacao')
    );
  });

  let accCol = headers.findIndex(h => {
    if (!h) return false;
    const s = h.toLowerCase().trim();
    return s.includes('conta') && !s.includes('tipo') && !s.includes('op');
  });

  console.log('Initial Column Indexes detected by headers:');
  console.log({ idCol, nameCol, cpfCol, bankCol, agCol, opCol, accCol });

  const numCols = headers.length;
  const colScores = Array.from({ length: numCols }, () => ({
    id: 0,
    name: 0,
    cpf: 0,
    bank: 0,
    ag: 0,
    op: 0,
    acc: 0
  }));

  let scannedCount = 0;
  for (let i = headerIndex + 1; i < rows.length && scannedCount < 50; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    
    const hasData = row.some(cell => String(cell || '').trim() !== '');
    if (!hasData) continue;

    scannedCount++;
    
    for (let colIdx = 0; colIdx < Math.min(row.length, numCols); colIdx++) {
      const val = String(row[colIdx] || '').trim();
      if (!val) continue;

      const valUpper = val.toUpperCase();
      const digits = val.replace(/\D/g, '');

      if (
        valUpper === '13' || valUpper === '23' || valUpper === '013' || valUpper === '023' ||
        valUpper === 'CC' || valUpper === 'CP' || valUpper === 'POUP' || valUpper === 'CORR' ||
        valUpper === 'CORRENTE' || valUpper === 'POUPANÇA' || valUpper === 'POUPANCA' ||
        valUpper === 'C/C' || valUpper === 'C/P' || valUpper === 'C/ CORR' || valUpper === 'C/CORR' ||
        valUpper === 'C/POUP' || valUpper === 'C/ POUP' || valUpper === '0'
      ) {
        colScores[colIdx].op += 1;
      }

      if (digits.length === 11) {
        colScores[colIdx].cpf += 1;
      }

      if (
        valUpper.includes('BRASIL') || valUpper.includes('ITAU') || valUpper.includes('ITAÚ') ||
        valUpper.includes('BRADESCO') || valUpper.includes('CAIXA') || valUpper.includes('SANTANDER') ||
        valUpper.includes('NUBANK') || valUpper.includes('INTER') || valUpper.includes('C6')
      ) {
        colScores[colIdx].bank += 1;
      }

      if (digits.length >= 3 && digits.length <= 5 && /^\d+[-]?\d*$/.test(val)) {
        colScores[colIdx].ag += 1;
      }

      if (digits.length >= 4 && digits.length <= 12 && val.includes('-')) {
        colScores[colIdx].acc += 1;
      }

      if (/^\d+$/.test(val) && parseInt(val) < 2000) {
        colScores[colIdx].id += 1;
      }

      if (val.length > 5 && /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ\s]+$/i.test(val) && !val.includes('-')) {
        colScores[colIdx].name += 1;
      }
    }
  }

  if (nameCol === -1) {
    let bestIdx = -1, maxScore = 0;
    for (let c = 0; c < numCols; c++) {
      if (colScores[c].name > maxScore) {
        maxScore = colScores[c].name;
        bestIdx = c;
      }
    }
    if (bestIdx !== -1) nameCol = bestIdx;
  }

  if (bankCol === -1) {
    let bestIdx = -1, maxScore = 0;
    for (let c = 0; c < numCols; c++) {
      if (c === nameCol) continue;
      if (colScores[c].bank > maxScore) {
        maxScore = colScores[c].bank;
        bestIdx = c;
      }
    }
    if (bestIdx !== -1) bankCol = bestIdx;
  }

  if (cpfCol === -1) {
    let bestIdx = -1, maxScore = 0;
    for (let c = 0; c < numCols; c++) {
      if (c === nameCol || c === bankCol) continue;
      if (colScores[c].cpf > maxScore) {
        maxScore = colScores[c].cpf;
        bestIdx = c;
      }
    }
    if (bestIdx !== -1) cpfCol = bestIdx;
  }

  if (agCol === -1) {
    let bestIdx = -1, maxScore = 0;
    for (let c = 0; c < numCols; c++) {
      if (c === nameCol || c === bankCol || c === cpfCol) continue;
      if (colScores[c].ag > maxScore) {
        maxScore = colScores[c].ag;
        bestIdx = c;
      }
    }
    if (bestIdx !== -1) agCol = bestIdx;
  }

  if (accCol === -1) {
    let bestIdx = -1, maxScore = 0;
    for (let c = 0; c < numCols; c++) {
      if (c === nameCol || c === bankCol || c === cpfCol || c === agCol) continue;
      if (colScores[c].acc > maxScore) {
        maxScore = colScores[c].acc;
        bestIdx = c;
      }
    }
    if (bestIdx !== -1) accCol = bestIdx;
  }

  if (opCol === -1) {
    let bestIdx = -1, maxScore = 0;
    for (let c = 0; c < numCols; c++) {
      if (c === nameCol || c === bankCol || c === cpfCol || c === agCol || c === accCol) continue;
      if (colScores[c].op > maxScore) {
        maxScore = colScores[c].op;
        bestIdx = c;
      }
    }
    if (bestIdx !== -1) opCol = bestIdx;
  }

  if (idCol === -1) {
    let bestIdx = -1, maxScore = 0;
    for (let c = 0; c < numCols; c++) {
      if (c === nameCol || c === bankCol || c === cpfCol || c === agCol || c === accCol || c === opCol) continue;
      if (colScores[c].id > maxScore) {
        maxScore = colScores[c].id;
        bestIdx = c;
      }
    }
    if (bestIdx !== -1) idCol = bestIdx;
  }

  console.log('Final Column Indexes after fallback scanner:');
  console.log({ idCol, nameCol, cpfCol, bankCol, agCol, opCol, accCol });

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

    parsedCollabs.push({
      id,
      nome,
      cpf: formattedCpf,
      rowIndex: i + 1
    });
  }

  console.log(`Parsed ${parsedCollabs.length} collaborators.`);

  // Find duplicates of any CPF that is NOT '000.000.000-00'
  const cpfMap = new Map();
  const duplicates = [];

  parsedCollabs.forEach(c => {
    if (c.cpf === '000.000.000-00') return; // Exclude zeroed placeholder

    if (cpfMap.has(c.cpf)) {
      duplicates.push({
        cpf: c.cpf,
        first: cpfMap.get(c.cpf),
        dup: c
      });
    } else {
      cpfMap.set(c.cpf, c);
    }
  });

  console.log(`\nFound ${duplicates.length} duplicate CPFs among non-zero ones:`);
  duplicates.forEach((d, idx) => {
    console.log(`\n${idx + 1}. CPF: ${d.cpf}`);
    console.log(`   - Row ${d.first.rowIndex} (ID: ${d.first.id}): ${d.first.nome}`);
    console.log(`   - Row ${d.dup.rowIndex} (ID: ${d.dup.id}): ${d.dup.nome}`);
  });

  const nonZeroCPFs = Array.from(cpfMap.keys());
  console.log(`\nTotal unique non-zero CPFs: ${nonZeroCPFs.length}`);
  console.log('Examples of non-zero CPFs:', nonZeroCPFs.slice(0, 20));

} catch (err) {
  console.error('Error during mimic:', err.stack);
}
