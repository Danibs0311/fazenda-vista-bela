import XLSX from 'xlsx';
import path from 'path';

const filePath = path.resolve('ULTIMA FAZENDA BELA VISTA FINAL - Vlele atualizado18-09.xlsm');
console.log('Reading Excel file at:', filePath);

try {
  const workbook = XLSX.readFile(filePath);
  const sheetNames = workbook.SheetNames;
  console.log('Sheet Names:', sheetNames);

  for (const sheetName of sheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`\nSheet "${sheetName}" - Rows: ${data.length}`);
    if (data.length > 0) {
      console.log('First 5 rows:');
      console.log(data.slice(0, 10));
    }
  }
} catch (err) {
  console.error('Error reading excel:', err.message);
}
