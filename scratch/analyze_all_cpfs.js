import XLSX from 'xlsx';
import path from 'path';

const filePath = path.resolve('ULTIMA FAZENDA BELA VISTA FINAL - Vlele atualizado18-09.xlsm');

const validateCPF = (cpf) => {
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
};

try {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['CADASTROS'];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  const headers = Array.from(rows[1] || []).map(h => String(h || '').trim());
  const cpfCol = headers.findIndex(h => h && h.toLowerCase() === 'cpf');
  const nameCol = headers.findIndex(h => h && (h.toLowerCase().includes('benefici') || h.toLowerCase() === 'nome'));
  const idCol = headers.findIndex(h => h && h.toLowerCase() === 'id');

  const counts = {};

  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rawName = row[nameCol];
    if (!rawName || String(rawName).trim() === '') continue;

    let cpf = cpfCol !== -1 && row[cpfCol] ? String(row[cpfCol]).trim().replace(/\D/g, '') : '';
    let formattedCpf = '000.000.000-00';
    
    if (cpf && cpf.length === 11 && validateCPF(cpf)) {
      formattedCpf = cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }

    counts[formattedCpf] = (counts[formattedCpf] || 0) + 1;
  }

  console.log('Total unique CPFs generated:', Object.keys(counts).length);
  
  const duplicates = Object.entries(counts).filter(([cpf, count]) => count > 1 && cpf !== '000.000.000-00');
  
  console.log('Duplicate non-zero CPFs found:', duplicates.length);
  if (duplicates.length > 0) {
    console.table(duplicates);
  } else {
    console.log('No duplicate non-zero CPFs found in CADASTROS sheet.');
  }

  // Check other sheets for collaborators
  console.log('\nChecking "FOLHA DE PAGAMENTO FINAL" sheet...');
  const paySheet = workbook.Sheets['FOLHA DE PAGAMENTO FINAL'];
  if (paySheet) {
    const payRows = XLSX.utils.sheet_to_json(paySheet, { header: 1 });
    console.log(`Found ${payRows.length} rows in payment sheet.`);
  }

} catch (err) {
  console.error('Error:', err.message);
}
