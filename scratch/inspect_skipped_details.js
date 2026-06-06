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
  
  let validSkippedCount = 0;
  
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    
    const rawName = row[nameCol];
    const nameStr = rawName ? String(rawName).trim() : '';
    
    if (nameStr === '') {
      // Check if any other cell in this row has data (excluding the ID column)
      const hasOtherData = row.some((cell, colIdx) => {
        if (colIdx === idCol) return false;
        return cell !== undefined && cell !== null && String(cell).trim() !== '';
      });
      
      if (hasOtherData) {
        validSkippedCount++;
        console.log(`Row ${i + 1} has empty Name but has other data! Content:`, row);
        if (validSkippedCount > 10) {
          console.log('Stopping after 10 examples.');
          break;
        }
      }
    }
  }
  
  console.log(`Total skipped rows that actually contain other data: ${validSkippedCount}`);
} catch (err) {
  console.error('Error:', err.message);
}
