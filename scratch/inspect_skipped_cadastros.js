import XLSX from 'xlsx';
import path from 'path';

const filePath = path.resolve('ULTIMA FAZENDA BELA VISTA FINAL - Vlele atualizado18-09.xlsm');

try {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['CADASTROS'];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log('Total rows in sheet CADASTROS:', rows.length);
  
  const headers = Array.from(rows[1] || []).map(h => String(h || '').trim());
  const nameCol = headers.findIndex(h => h && (h.toLowerCase().includes('benefici') || h.toLowerCase() === 'nome'));
  const idCol = headers.findIndex(h => h && h.toLowerCase() === 'id');
  
  console.log(`Using columns - ID: ${idCol}, Name: ${nameCol}`);
  
  let totalSkipped = 0;
  let skippedExamples = [];
  
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    const rawName = row ? row[nameCol] : undefined;
    const nameStr = rawName ? String(rawName).trim() : '';
    
    if (!row || row.length === 0 || nameStr === '') {
      totalSkipped++;
      if (skippedExamples.length < 20) {
        skippedExamples.push({ rowIndex: i + 1, rowContent: row });
      }
    }
  }
  
  console.log(`Total rows skipped due to empty name or empty row: ${totalSkipped}`);
  console.log('First 20 skipped rows details:');
  console.log(JSON.stringify(skippedExamples, null, 2));
  
} catch (err) {
  console.error('Error:', err.message);
}
