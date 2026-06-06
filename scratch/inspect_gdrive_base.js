import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

const filePath = 'L:\\Meu Drive\\DG GROUP\\Base de dados.xlsm';

try {
  const stat = fs.statSync(filePath);
  console.log(`File: ${filePath}`);
  console.log(`Size: ${stat.size} bytes`);
  console.log(`Modified: ${stat.mtime}`);

  const workbook = XLSX.readFile(filePath);
  console.log('\nAvailable sheets in workbook:');
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`- Sheet "${name}": ${rows.length} rows`);
  }
} catch (err) {
  console.error('Error:', err.message);
}
