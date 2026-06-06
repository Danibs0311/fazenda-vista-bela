import XLSX from 'xlsx';
import path from 'path';

const filePath = 'C:\\Users\\danie\\OneDrive\\Documentos\\FAZENDA BELA VISTA FINAL - FINALIZADO.xlsm';

try {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['CADASTROS'];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log('Total rows in CADASTROS sheet:', rows.length);
  
  const headers = Array.from(rows[1] || []).map(h => String(h || '').trim());
  const nameCol = headers.findIndex(h => h && (h.toLowerCase().includes('benefici') || h.toLowerCase() === 'nome'));
  const idCol = headers.findIndex(h => h && h.toLowerCase() === 'id');
  
  console.log(`Using columns - ID index: ${idCol}, Name index: ${nameCol}`);
  
  let validNameCount = 0;
  let hasIdCount = 0;
  let hasIdAndNameCount = 0;
  
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    
    const rawName = row[nameCol];
    const nameStr = rawName ? String(rawName).trim() : '';
    const rawId = row[idCol];
    const idStr = rawId ? String(rawId).trim() : '';
    
    if (nameStr !== '') {
      validNameCount++;
    }
    if (idStr !== '') {
      hasIdCount++;
    }
    if (nameStr !== '' && idStr !== '') {
      hasIdAndNameCount++;
    }
  }
  
  console.log('Results:');
  console.log(`- Collaborators with non-empty name: ${validNameCount}`);
  console.log(`- Rows with non-empty ID: ${hasIdCount}`);
  console.log(`- Rows with both ID and Name: ${hasIdAndNameCount}`);
} catch (err) {
  console.error('Error:', err.message);
}
