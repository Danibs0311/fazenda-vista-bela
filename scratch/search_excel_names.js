import XLSX from 'xlsx';
import path from 'path';

const filePath = path.resolve('ULTIMA FAZENDA BELA VISTA FINAL - Vlele atualizado18-09.xlsm');

try {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['CADASTROS'];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  const headers = Array.from(rows[1] || []).map(h => String(h || '').trim());
  const nameCol = headers.findIndex(h => h && (h.toLowerCase().includes('benefici') || h.toLowerCase() === 'nome'));
  const idCol = headers.findIndex(h => h && h.toLowerCase() === 'id');
  
  console.log(`Searching for "TAMIRES LIMA DE JESUS" in Excel...`);
  
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const name = row[nameCol] ? String(row[nameCol]).trim().toUpperCase() : '';
    if (name.includes('TAMIRES LIMA DE JESUS')) {
      console.log(`Excel Row ${i + 1}: ID="${row[idCol]}", Name="${row[nameCol]}", CPF="${row[3]}", Banco="${row[4]}", Conta="${row[7]}"`);
    }
  }
} catch (err) {
  console.error('Error:', err.message);
}
