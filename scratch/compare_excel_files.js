import XLSX from 'xlsx';
import path from 'path';

const file1Path = path.resolve('ULTIMA FAZENDA BELA VISTA FINAL - Vlele atualizado18-09.xlsm');
const file2Path = path.resolve('../FAZENDA BELA VISTA FINAL.xlsm');

try {
  const wb1 = XLSX.readFile(file1Path);
  const wb2 = XLSX.readFile(file2Path);
  
  const sheet1 = wb1.Sheets['CADASTROS'];
  const sheet2 = wb2.Sheets['CADASTROS'];
  
  const rows1 = XLSX.utils.sheet_to_json(sheet1, { header: 1 });
  const rows2 = XLSX.utils.sheet_to_json(sheet2, { header: 1 });
  
  console.log(`File 1 (ULTIMA...) - Total rows in CADASTROS: ${rows1.length}`);
  console.log(`File 2 (FAZENDA...) - Total rows in CADASTROS: ${rows2.length}`);
  
  const headers1 = Array.from(rows1[1] || []).map(h => String(h || '').trim());
  const headers2 = Array.from(rows2[1] || []).map(h => String(h || '').trim());
  
  console.log('File 1 Headers:', headers1);
  console.log('File 2 Headers:', headers2);
  
  let diffCount = 0;
  
  // We compare index by index (since both have 1946 rows)
  const minRows = Math.min(rows1.length, rows2.length);
  for (let i = 2; i < minRows; i++) {
    const r1 = rows1[i] || [];
    const r2 = rows2[i] || [];
    
    // Normalize cells to compare
    const str1 = JSON.stringify(r1.map(c => c === undefined || c === null ? '' : String(c).trim()));
    const str2 = JSON.stringify(r2.map(c => c === undefined || c === null ? '' : String(c).trim()));
    
    if (str1 !== str2) {
      diffCount++;
      if (diffCount <= 5) {
        console.log(`\nDifference at Row ${i + 1}:`);
        console.log(`- File 1:`, r1);
        console.log(`- File 2:`, r2);
      }
    }
  }
  
  console.log(`\nTotal row differences between the two files: ${diffCount}`);
  
} catch (err) {
  console.error('Error:', err.message);
}
