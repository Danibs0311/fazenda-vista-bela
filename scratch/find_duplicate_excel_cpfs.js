import XLSX from 'xlsx';
import path from 'path';

const filePath = path.resolve('ULTIMA FAZENDA BELA VISTA FINAL - Vlele atualizado18-09.xlsm');
console.log('Analyzing Excel file at:', filePath);

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
  const sheet = workbook.Sheets['CADASTROS'];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  if (rows.length < 2) {
    console.error('Sheet CADASTROS is empty.');
    process.exit(1);
  }
  
  // Convert sparse array to regular array to avoid holes
  const row1 = Array.from(rows[1] || []);
  const headers = row1.map(h => String(h || '').trim());
  
  const cpfCol = headers.findIndex(h => h && h.toLowerCase() === 'cpf');
  const nameCol = headers.findIndex(h => h && (h.toLowerCase().includes('benefici') || h.toLowerCase() === 'nome'));
  const idCol = headers.findIndex(h => h && h.toLowerCase() === 'id');

  console.log(`Using columns - ID: ${idCol}, Name: ${nameCol}, CPF: ${cpfCol}`);

  const cpfMap = new Map();
  const duplicates = [];

  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    
    const name = nameCol !== -1 && row[nameCol] ? String(row[nameCol]).trim().toUpperCase() : '';
    if (!name) continue;
    
    const id = idCol !== -1 ? String(row[idCol] || '').trim() : '';
    
    const rawCpf = cpfCol !== -1 && row[cpfCol] ? String(row[cpfCol]).trim().replace(/\D/g, '') : '';
    let formattedCpf = '000.000.000-00';
    
    if (rawCpf && rawCpf.length === 11 && validateCPF(rawCpf)) {
      formattedCpf = rawCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }

    // Skip the zeroed placeholder
    if (formattedCpf === '000.000.000-00') continue;

    if (cpfMap.has(formattedCpf)) {
      const firstOccur = cpfMap.get(formattedCpf);
      duplicates.push({
        cpf: formattedCpf,
        first: firstOccur,
        duplicate: { id, name, rowIndex: i + 1 }
      });
    } else {
      cpfMap.set(formattedCpf, { id, name, rowIndex: i + 1 });
    }
  }

  console.log(`\nAnalysis complete. Found ${duplicates.length} duplicate active CPFs:\n`);
  if (duplicates.length > 0) {
    duplicates.forEach((dup, index) => {
      console.log(`${index + 1}. CPF: ${dup.cpf}`);
      console.log(`   - Row ${dup.first.rowIndex} (ID ${dup.first.id}): ${dup.first.name}`);
      console.log(`   - Row ${dup.duplicate.rowIndex} (ID ${dup.duplicate.id}): ${dup.duplicate.name}`);
      console.log('----------------------------------------------------');
    });
  } else {
    console.log('No duplicate real CPFs found!');
  }

} catch (err) {
  console.error('Error analyzing spreadsheet:', err.stack);
}
