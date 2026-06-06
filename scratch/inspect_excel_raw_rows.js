import XLSX from 'xlsx';
import path from 'path';

const filePath = path.resolve('ULTIMA FAZENDA BELA VISTA FINAL - Vlele atualizado18-09.xlsm');

try {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['CADASTROS'];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log('Total rows:', rows.length);
  
  // Find rows with non-empty CPF
  const headers = Array.from(rows[1] || []).map(h => String(h || '').trim());
  const cpfCol = headers.findIndex(h => h && h.toLowerCase() === 'cpf');
  
  console.log('CPF Column index:', cpfCol);
  
  let count = 0;
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    
    const cpfVal = row[cpfCol];
    if (cpfVal && String(cpfVal).trim() !== '' && String(cpfVal).trim() !== '000.000.000-00') {
      console.log(`Row ${i + 1}: Name="${row[2]}", CPF="${cpfVal}"`);
      count++;
      if (count > 20) break;
    }
  }
  
  console.log(`Found ${count} rows with non-empty/non-zero CPFs (sampled up to 20).`);
} catch (err) {
  console.error('Error:', err.message);
}
