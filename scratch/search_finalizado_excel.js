import XLSX from 'xlsx';
import path from 'path';

const filePath = 'C:\\Users\\danie\\OneDrive\\Documentos\\FAZENDA BELA VISTA FINAL - FINALIZADO.xlsm';

try {
  const workbook = XLSX.readFile(filePath);
  console.log(`Searching for "GEISA" or "BARRADA" or "MACEDO" in all sheets of ${filePath}...`);

  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;

      const rowStr = JSON.stringify(row).toUpperCase();
      if (
        rowStr.includes('GEISA') ||
        rowStr.includes('BARRADA') ||
        rowStr.includes('MACEDO') ||
        rowStr.includes('0383755') || // Geisa's bank account
        rowStr.includes('3905')      // Geisa's agency
      ) {
        console.log(`- Found in Sheet "${name}" at Row ${i + 1}:`, row);
      }
    }
  }
} catch (err) {
  console.error('Error:', err.message);
}
