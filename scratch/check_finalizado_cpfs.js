import XLSX from 'xlsx';
import path from 'path';

const filePath = 'C:\\Users\\danie\\OneDrive\\Documentos\\FAZENDA BELA VISTA FINAL - FINALIZADO.xlsm';

function validateCPF(cpf) {
  if (!cpf) return false;
  const cleanCPF = cpf.replace(/\D/g, '');
  if (cleanCPF === '00000000000') return false; // Not a real valid CPF for uniqueness
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

try {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['CADASTROS'];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const headers = Array.from(rows[1] || []).map(h => String(h || '').trim());
  const nameCol = headers.findIndex(h => h && (h.toLowerCase().includes('benefici') || h.toLowerCase() === 'nome'));
  const cpfCol = headers.findIndex(h => h && h.toLowerCase() === 'cpf');
  const idCol = headers.findIndex(h => h && h.toLowerCase() === 'id');

  const cpfs = new Map();
  const duplicates = [];

  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const rawName = row[nameCol];
    if (!rawName || String(rawName).trim() === '') continue;

    const nome = String(rawName).trim().toUpperCase();
    const id = String(row[idCol] || '').trim();
    const rawCpf = String(row[cpfCol] || '').trim();
    const cleanCpf = rawCpf.replace(/\D/g, '');

    if (cleanCpf && validateCPF(cleanCpf)) {
      const formattedCpf = cleanCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      if (cpfs.has(formattedCpf)) {
        duplicates.push({
          cpf: formattedCpf,
          first: cpfs.get(formattedCpf),
          second: { id, nome, rowIndex: i + 1 }
        });
      } else {
        cpfs.set(formattedCpf, { id, nome, rowIndex: i + 1 });
      }
    }
  }

  console.log(`Unique valid non-zero CPFs found: ${cpfs.size}`);
  console.log(`Duplicate valid CPFs found: ${duplicates.length}`);
  
  if (duplicates.length > 0) {
    console.log('\nDuplicates detail:');
    console.table(duplicates);
  } else {
    console.log('SUCCESS! No duplicate valid CPFs detected in this sheet.');
  }

} catch (err) {
  console.error('Error:', err.message);
}
