import XLSX from 'xlsx';
import path from 'path';

const filePath = path.resolve('ULTIMA FAZENDA BELA VISTA FINAL - Vlele atualizado18-09.xlsm');

try {
  const workbook = XLSX.readFile(filePath);
  console.log('Available sheets in Excel file:');
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`- Sheet "${name}": ${rows.length} rows`);
  }
} catch (err) {
  console.error('Error reading workbook sheets:', err.message);
}
