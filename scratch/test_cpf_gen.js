function generateValidCpfFromId(id) {
  const idStr = String(id).padStart(8, '0');
  const base = '9' + idStr; // 9 digits total
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(base[i]) * (10 - i);
  }
  let d1 = 11 - (sum % 11);
  if (d1 >= 10) d1 = 0;
  
  sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(base[i]) * (11 - i);
  }
  sum += d1 * 2;
  let d2 = 11 - (sum % 11);
  if (d2 >= 10) d2 = 0;
  
  const cleanCpf = base + d1 + d2;
  return cleanCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function validateCPF(cpf) {
  const cleanCPF = cpf.replace(/\D/g, '');
  if (cleanCPF.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  let sum = 0;
  let rest;
  for (let i = 1; i <= 9; i++) sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
  rest = (sum * 10) % 11;
  if ((rest === 10) || (rest === 11)) rest = 0;
  if (rest !== parseInt(cleanCPF.substring(9, 10))) return false;
  
  sum = 0;
  for (let i = 1; i <= 10; i++) sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
  rest = (sum * 10) % 11;
  if ((rest === 10) || (rest === 11)) rest = 0;
  if (rest !== parseInt(cleanCPF.substring(10, 11))) return false;
  
  return true;
}

const cpfs = new Set();
let allValid = true;

for (let i = 1; i <= 2000; i++) {
  const cpf = generateValidCpfFromId(i);
  const isValid = validateCPF(cpf);
  
  if (!isValid) {
    console.error(`CPF for ID ${i} (${cpf}) is invalid!`);
    allValid = false;
  }
  
  if (cpfs.has(cpf)) {
    console.error(`CPF for ID ${i} (${cpf}) is duplicate!`);
    allValid = false;
  }
  
  cpfs.add(cpf);
}

if (allValid) {
  console.log(`Successfully generated ${cpfs.size} unique and mathematically valid CPFs!`);
  console.log('Sample CPFs generated:');
  console.log('ID 1:', generateValidCpfFromId(1));
  console.log('ID 100:', generateValidCpfFromId(100));
  console.log('ID 1944:', generateValidCpfFromId(1944));
}
