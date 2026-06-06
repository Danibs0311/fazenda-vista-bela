import XLSX from 'xlsx';
import path from 'path';

const filePath = 'L:\\Meu Drive\\DG GROUP\\Base de dados.xlsm';

try {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['CADASTROS'];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log('Total rows:', rows.length);
  console.log('First 15 rows:');
  for (let i = 0; i < 15; i++) {
    console.log(`Row ${i + 1}:`, rows[i]);
  }
} catch (err) {
  console.error('Error:', err.message);
}
