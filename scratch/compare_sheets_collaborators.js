import XLSX from 'xlsx';
import path from 'path';

const filePath = path.resolve('ULTIMA FAZENDA BELA VISTA FINAL - Vlele atualizado18-09.xlsm');

try {
  const workbook = XLSX.readFile(filePath);
  
  // 1. Get all registered names from CADASTROS sheet
  const cadastrosSheet = workbook.Sheets['CADASTROS'];
  const cadastrosRows = XLSX.utils.sheet_to_json(cadastrosSheet, { header: 1 });
  const cadastrosHeaders = Array.from(cadastrosRows[1] || []).map(h => String(h || '').trim());
  const cNameCol = cadastrosHeaders.findIndex(h => h && (h.toLowerCase().includes('benefici') || h.toLowerCase() === 'nome'));
  
  const registeredNames = new Set();
  for (let i = 2; i < cadastrosRows.length; i++) {
    const row = cadastrosRows[i];
    const name = row && row[cNameCol] ? String(row[cNameCol]).trim().toUpperCase() : '';
    if (name) registeredNames.add(name);
  }
  console.log(`Registered names in CADASTROS: ${registeredNames.size}`);

  // 2. Helper to find name column index in any sheet
  const findNameColIndex = (headers) => {
    return headers.findIndex(h => {
      const s = String(h || '').toLowerCase().trim();
      return s.includes('benefici') || s === 'nome' || s === 'colaborador' || s === 'nome completo';
    });
  };

  // 3. Scan PLANILHA_COLHEITA_DIÁRIA
  const colheitaSheet = workbook.Sheets['PLANILHA_COLHEITA_DIÁRIA'];
  if (colheitaSheet) {
    const rows = XLSX.utils.sheet_to_json(colheitaSheet, { header: 1 });
    const headers = Array.from(rows[1] || []).map(h => String(h || '').trim());
    const nameCol = findNameColIndex(headers);
    console.log(`PLANILHA_COLHEITA_DIÁRIA headers:`, headers);
    console.log(`PLANILHA_COLHEITA_DIÁRIA nameCol: ${nameCol}`);
    
    if (nameCol !== -1) {
      const missing = new Set();
      for (let i = 2; i < rows.length; i++) {
        const row = rows[i];
        const name = row && row[nameCol] ? String(row[nameCol]).trim().toUpperCase() : '';
        if (name && !registeredNames.has(name) && name !== 'NOME') {
          missing.add(name);
        }
      }
      console.log(`Unique names in COLHEITA_DIÁRIA not in CADASTROS: ${missing.size}`);
      if (missing.size > 0) {
        console.log('Examples of missing names in COLHEITA_DIÁRIA:', Array.from(missing).slice(0, 10));
      }
    }
  }

  // 4. Scan FOLHA DE PAGAMENTO
  const folhaSheet = workbook.Sheets['FOLHA DE PAGAMENTO'];
  if (folhaSheet) {
    const rows = XLSX.utils.sheet_to_json(folhaSheet, { header: 1 });
    const headers = Array.from(rows[1] || []).map(h => String(h || '').trim());
    const nameCol = findNameColIndex(headers);
    console.log(`FOLHA DE PAGAMENTO headers:`, headers);
    console.log(`FOLHA DE PAGAMENTO nameCol: ${nameCol}`);
    
    if (nameCol !== -1) {
      const missing = new Set();
      for (let i = 2; i < rows.length; i++) {
        const row = rows[i];
        const name = row && row[nameCol] ? String(row[nameCol]).trim().toUpperCase() : '';
        if (name && !registeredNames.has(name) && name !== 'NOME') {
          missing.add(name);
        }
      }
      console.log(`Unique names in FOLHA DE PAGAMENTO not in CADASTROS: ${missing.size}`);
      if (missing.size > 0) {
        console.log('Examples of missing names in FOLHA DE PAGAMENTO:', Array.from(missing).slice(0, 10));
      }
    }
  }

  // 5. Scan PLANILHA_PAGAMENTO_SEMANAL
  const pagSemanalSheet = workbook.Sheets['PLANILHA_PAGAMENTO_SEMANAL'];
  if (pagSemanalSheet) {
    const rows = XLSX.utils.sheet_to_json(pagSemanalSheet, { header: 1 });
    const headers = Array.from(rows[1] || []).map(h => String(h || '').trim());
    const nameCol = findNameColIndex(headers);
    console.log(`PLANILHA_PAGAMENTO_SEMANAL headers:`, headers);
    console.log(`PLANILHA_PAGAMENTO_SEMANAL nameCol: ${nameCol}`);
    
    if (nameCol !== -1) {
      const missing = new Set();
      for (let i = 2; i < rows.length; i++) {
        const row = rows[i];
        const name = row && row[nameCol] ? String(row[nameCol]).trim().toUpperCase() : '';
        if (name && !registeredNames.has(name) && name !== 'NOME') {
          missing.add(name);
        }
      }
      console.log(`Unique names in PLANILHA_PAGAMENTO_SEMANAL not in CADASTROS: ${missing.size}`);
      if (missing.size > 0) {
        console.log('Examples of missing names in PLANILHA_PAGAMENTO_SEMANAL:', Array.from(missing).slice(0, 10));
      }
    }
  }

} catch (err) {
  console.error('Error:', err.message);
}
