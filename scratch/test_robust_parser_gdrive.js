import XLSX from 'xlsx';
import path from 'path';

const filePath = 'L:\\Meu Drive\\DG GROUP\\Base de dados.xlsm';

try {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['CADASTROS'];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  console.log('Total raw rows in Google Drive spreadsheet:', rows.length);

  const parsed = [];
  let normalCount = 0; // ID at index 0, Name at index 1
  let shiftedCount = 0; // ID at index 1, Name at index 2 (like the older finalizado sheet)
  let skippedCount = 0;

  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) {
      skippedCount++;
      continue;
    }

    // Alignment check
    const val0 = row[0];
    const val1 = row[1];
    const val2 = row[2];

    const isVal0Number = val0 !== undefined && val0 !== null && /^\d+$/.test(String(val0).trim());
    const isVal1Name = val1 !== undefined && val1 !== null && String(val1).trim().length > 2 && !/^\d+$/.test(String(val1).trim());

    const isVal1Number = val1 !== undefined && val1 !== null && /^\d+$/.test(String(val1).trim());
    const isVal2Name = val2 !== undefined && val2 !== null && String(val2).trim().length > 2 && !/^\d+$/.test(String(val2).trim());

    let id = '';
    let name = '';
    let cpf = '';
    let bank = '';
    let ag = '';
    let op = '';
    let acc = '';
    let alignment = '';

    if (isVal0Number && isVal1Name) {
      // Normal alignment for this file (ID at index 0, Name at index 1)
      id = String(val0).trim();
      name = String(val1).trim().toUpperCase();
      cpf = String(row[2] || '').trim();
      bank = String(row[3] || '').trim();
      ag = String(row[4] || '').trim();
      op = String(row[5] || '').trim();
      acc = String(row[6] || '').trim();
      normalCount++;
      alignment = 'NORMAL_GDRIVE';
    } else if (isVal1Number && isVal2Name) {
      // Shifted right alignment (ID at index 1, Name at index 2)
      id = String(val1).trim();
      name = String(val2).trim().toUpperCase();
      cpf = String(row[3] || '').trim();
      bank = String(row[4] || '').trim();
      ag = String(row[5] || '').trim();
      op = String(row[6] || '').trim();
      acc = String(row[7] || '').trim();
      shiftedCount++;
      alignment = 'SHIFTED_RIGHT';
    } else {
      skippedCount++;
      continue;
    }

    parsed.push({ rowIndex: i + 1, id, name, cpf, bank, ag, op, acc, alignment });
  }

  console.log('\nRobust Parsing Summary:');
  console.log(`- Normal aligned rows (ID at index 0): ${normalCount}`);
  console.log(`- Shifted aligned rows (ID at index 1): ${shiftedCount}`);
  console.log(`- Total collaborators parsed: ${parsed.length}`);
  console.log(`- Rows skipped (empty or headers): ${skippedCount}`);

  // Display sample rows
  console.log('\nSample normal aligned rows (first 10):');
  console.table(parsed.filter(p => p.alignment === 'NORMAL_GDRIVE').slice(0, 10));

  if (shiftedCount > 0) {
    console.log('\nSample shifted aligned rows (first 10):');
    console.table(parsed.filter(p => p.alignment === 'SHIFTED_RIGHT').slice(0, 10));
  }

} catch (err) {
  console.error('Error:', err.message);
}
