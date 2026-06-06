import XLSX from 'xlsx';
import path from 'path';

const filePath = 'C:\\Users\\danie\\OneDrive\\Documentos\\FAZENDA BELA VISTA FINAL - FINALIZADO.xlsm';

try {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['CADASTROS'];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  console.log('Total raw rows:', rows.length);

  const parsed = [];
  let shiftedCount = 0;
  let normalCount = 0;
  let skippedCount = 0;

  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) {
      skippedCount++;
      continue;
    }

    // Heuristic detection of column alignment
    let id = '';
    let name = '';
    let cpf = '';
    let bank = '';
    let ag = '';
    let op = '';
    let acc = '';
    let alignment = '';

    // Check Row Layout 1: Index 1 is ID, Index 2 is Name (Normal)
    const val1 = row[1];
    const val2 = row[2];
    const isVal1Number = val1 !== undefined && val1 !== null && /^\d+$/.test(String(val1).trim());
    const isVal2Name = val2 !== undefined && val2 !== null && String(val2).trim().length > 2 && !/^\d+$/.test(String(val2).trim());

    // Check Row Layout 2: Index 0 is ID, Index 1 is Name (Shifted Left)
    const val0 = row[0];
    const isVal0Number = val0 !== undefined && val0 !== null && /^\d+$/.test(String(val0).trim());
    const isVal1Name = val1 !== undefined && val1 !== null && String(val1).trim().length > 2 && !/^\d+$/.test(String(val1).trim());

    if (isVal1Number && isVal2Name) {
      // Normal alignment
      id = String(val1).trim();
      name = String(val2).trim().toUpperCase();
      cpf = String(row[3] || '').trim();
      bank = String(row[4] || '').trim();
      ag = String(row[5] || '').trim();
      op = String(row[6] || '').trim();
      acc = String(row[7] || '').trim();
      normalCount++;
      alignment = 'NORMAL';
    } else if (isVal0Number && isVal1Name) {
      // Shifted left by 1 column
      id = String(val0).trim();
      name = String(val1).trim().toUpperCase();
      cpf = String(row[2] || '').trim();
      bank = String(row[3] || '').trim();
      ag = String(row[4] || '').trim();
      op = String(row[5] || '').trim();
      acc = String(row[6] || '').trim();
      shiftedCount++;
      alignment = 'SHIFTED';
    } else {
      skippedCount++;
      continue;
    }

    parsed.push({ rowIndex: i + 1, id, name, cpf, bank, ag, op, acc, alignment });
  }

  console.log('\nRobust Parsing Summary:');
  console.log(`- Normal aligned rows parsed: ${normalCount}`);
  console.log(`- Shifted aligned rows parsed: ${shiftedCount}`);
  console.log(`- Total collaborators parsed: ${parsed.length}`);
  console.log(`- Rows skipped (empty or headers/metadata): ${skippedCount}`);

  // Display some parsed samples from both normal and shifted
  console.log('\nSample normal rows:');
  console.table(parsed.filter(p => p.alignment === 'NORMAL').slice(0, 10));

  console.log('\nSample shifted rows:');
  console.table(parsed.filter(p => p.alignment === 'SHIFTED').slice(0, 10));

} catch (err) {
  console.error('Error:', err.message);
}
