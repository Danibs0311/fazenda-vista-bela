import XLSX from 'xlsx';
import path from 'path';

const filePath = path.resolve('ULTIMA FAZENDA BELA VISTA FINAL - Vlele atualizado18-09.xlsm');

try {
  const workbook = XLSX.readFile(filePath);
  const searchNames = [
    'WANDERSON SANTOS SANTANA',
    'JANAILSON SOUSA SANTANA',
    'IZORAIDE SOUZA SANTOS FERNANDES',
    'ANDERSON DE JESUS SANTOS',
    'EVANI DE LIMA',
    'GEISA BARRADA MACEDO',
    'GEISA BARRADA'
  ];

  console.log('Searching for target names in all sheets...');

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;

      const rowStr = JSON.stringify(row).toUpperCase();
      for (const name of searchNames) {
        // Normalize names for comparison
        const cleanName = name.replace(/\s+/g, '').toUpperCase();
        const cleanRowStr = rowStr.replace(/\s+/g, '');
        if (cleanRowStr.includes(cleanName)) {
          console.log(`- Found name "${name}" in Sheet "${sheetName}" at Row ${i + 1}:`, row);
        }
      }
    }
  }
} catch (err) {
  console.error('Error:', err.message);
}
