import XLSX from 'xlsx';
import path from 'path';

const filePath = path.resolve('ULTIMA FAZENDA BELA VISTA FINAL - Vlele atualizado18-09.xlsm');

try {
  const workbook = XLSX.readFile(filePath);
  console.log('Searching for bank details (0383755, 3905) and name parts in all sheets...');

  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;

      const rowStr = JSON.stringify(row).toUpperCase();
      if (
        rowStr.includes('0383755') ||
        rowStr.includes('3905') ||
        rowStr.includes('GEISA') ||
        rowStr.includes('BARRADA') ||
        rowStr.includes('MACEDO')
      ) {
        console.log(`- Found in Sheet "${name}" at Row ${i + 1}:`, row);
      }
    }
  }
} catch (err) {
  console.error('Error:', err.message);
}
