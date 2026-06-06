import XLSX from 'xlsx';
import path from 'path';

const filePath = path.resolve('ULTIMA FAZENDA BELA VISTA FINAL - Vlele atualizado18-09.xlsm');

try {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['CADASTROS'];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log('Headers (Row index 1):', rows[1]);
  
  const targetRows = [3, 4, 107, 108, 1243, 1244];
  for (const r of targetRows) {
    console.log(`\nRow ${r + 1} raw cells:`, rows[r]);
  }
  
  console.log('\nSearching for "GEISA BARRADA" in all sheet rows:');
  const headers = Array.from(rows[1] || []).map(h => String(h || '').trim());
  const nameCol = headers.findIndex(h => h && (h.toLowerCase().includes('benefici') || h.toLowerCase() === 'nome'));
  
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const name = row[nameCol] ? String(row[nameCol]).trim().toUpperCase() : '';
    if (name.includes('GEISA BARRADA')) {
      console.log(`Found GEISA BARRADA at Row ${i + 1}:`, row);
    }
  }

} catch (err) {
  console.error('Error:', err.message);
}
