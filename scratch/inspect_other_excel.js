import XLSX from 'xlsx';
import path from 'path';

const filePath = path.resolve('../FAZENDA BELA VISTA FINAL.xlsm');

try {
  const workbook = XLSX.readFile(filePath);
  console.log('Sheet names in FAZENDA BELA VISTA FINAL.xlsm:');
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`- Sheet "${name}": ${rows.length} rows`);
  }
  
  const sheetName = workbook.SheetNames.find(name => 
    /colaboradores|cadastros|colaborador|cadastro|membros|equipe/i.test(name)
  ) || workbook.SheetNames[0];

  console.log(`\nAnalyzing sheet: ${sheetName}`);
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  const headers = Array.from(rows[1] || []).map(h => String(h || '').trim());
  const nameCol = headers.findIndex(h => h && (h.toLowerCase().includes('benefici') || h.toLowerCase() === 'nome'));
  const idCol = headers.findIndex(h => h && h.toLowerCase() === 'id');

  console.log(`Headers detected:`, headers);
  console.log(`Columns - ID: ${idCol}, Name: ${nameCol}`);

  let count = 0;
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const name = row[nameCol] ? String(row[nameCol]).trim().toUpperCase() : '';
    
    if (name.includes('GEISA BARRADA') || name.includes('TAMIRES LIMA DE JESUS')) {
      console.log(`- Row ${i + 1}: ID="${row[idCol]}", Name="${row[nameCol]}"`);
      count++;
    }
  }
  console.log(`Found ${count} target names in this sheet.`);

} catch (err) {
  console.error('Error:', err.message);
}
