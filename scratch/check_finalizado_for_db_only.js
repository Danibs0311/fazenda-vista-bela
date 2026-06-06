import XLSX from 'xlsx';
import path from 'path';

const filePath = 'C:\\Users\\danie\\OneDrive\\Documentos\\FAZENDA BELA VISTA FINAL - FINALIZADO.xlsm';

try {
  const workbook = XLSX.readFile(filePath);
  const searchNames = [
    'WANDERSON SANTOS SANTANA',
    'JANAILSON SOUSA SANTANA',
    'IZORAIDE SOUZA SANTOS FERNANDES',
    'ANDERSON DE JESUS SANTOS',
    'EVANI DE LIMA'
  ];

  console.log(`Searching for DB-only names in ${filePath}...`);

  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;

      const rowStr = JSON.stringify(row).toUpperCase();
      for (const sName of searchNames) {
        if (rowStr.includes(sName.toUpperCase())) {
          console.log(`- Found "${sName}" in Sheet "${name}" at Row ${i + 1}:`, row);
        }
      }
    }
  }
} catch (err) {
  console.error('Error:', err.message);
}
