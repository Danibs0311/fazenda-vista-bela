import XLSX from 'xlsx';
import path from 'path';

const filePath = path.resolve('ULTIMA FAZENDA BELA VISTA FINAL - Vlele atualizado18-09.xlsm');

try {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['CADASTROS'];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  console.log('Total rows read:', data.length);

  let validCount = 0;
  let missingCpfCount = 0;
  const cpfs = new Set();
  const duplicateCpfs = [];
  const validRecords = [];

  // Let's find where the header row is. It should contain ID, BENEFICIÁRIOS, CPF, Banco
  let headerIndex = -1;
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (row.includes('ID') && row.includes('BENEFICIÁRIOS') && row.includes('Banco')) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    console.error('Could not find header row in CADASTROS sheet.');
    process.exit(1);
  }

  console.log('Header found at row index:', headerIndex);
  const headers = data[headerIndex];
  console.log('Headers:', headers);

  const idCol = headers.indexOf('ID');
  const nameCol = headers.indexOf('BENEFICIÁRIOS');
  const cpfCol = headers.indexOf('CPF');
  const bankCol = headers.indexOf('Banco');
  const agCol = headers.indexOf('Ag.');
  const opCol = headers.indexOf('OP.');
  const accCol = headers.indexOf('Nº Conta');
  const regionCol = headers.indexOf('Região');

  for (let i = headerIndex + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const id = row[idCol];
    const name = row[nameCol];
    let cpf = row[cpfCol];
    const bank = row[bankCol];
    const agency = row[agCol];
    const op = row[opCol]; // OP can be used for tipo_conta or combined with conta
    const account = row[accCol];

    // If there is no ID and no Name, skip
    if (!id && !name) continue;

    validCount++;

    if (!cpf || String(cpf).trim() === '') {
      missingCpfCount++;
      cpf = null;
    } else {
      const cleanCpf = String(cpf).trim();
      if (cpfs.has(cleanCpf)) {
        duplicateCpfs.push({ index: i, name, cpf: cleanCpf });
      } else {
        cpfs.add(cleanCpf);
      }
    }

    validRecords.push({
      index: i,
      id: String(id || '').trim(),
      name: String(name || '').trim(),
      cpf,
      bank: bank ? String(bank).trim() : null,
      agency: agency ? String(agency).trim() : null,
      op: op ? String(op).trim() : null,
      account: account ? String(account).trim() : null
    });
  }

  console.log('--- Statistics ---');
  console.log('Total valid rows (with ID or Name):', validCount);
  console.log('Rows with missing CPF:', missingCpfCount);
  console.log('Unique CPFs found:', cpfs.size);
  console.log('Duplicate CPFs found:', duplicateCpfs.length);
  if (duplicateCpfs.length > 0) {
    console.log('First 5 duplicates:', duplicateCpfs.slice(0, 5));
  }

  console.log('\nShowing first 10 records parsed:');
  console.log(validRecords.slice(0, 10));

} catch (err) {
  console.error('Error:', err.message);
}
