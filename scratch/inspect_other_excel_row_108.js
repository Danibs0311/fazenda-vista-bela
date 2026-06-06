import XLSX from 'xlsx';
import path from 'path';

const filePath = path.resolve('../FAZENDA BELA VISTA FINAL.xlsm');

try {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['CADASTROS'];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log('Row 108 in FAZENDA BELA VISTA FINAL.xlsm:', rows[107]);
} catch (err) {
  console.error('Error:', err.message);
}
