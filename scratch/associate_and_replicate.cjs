const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ybupqkowtgflvpfetuha.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlidXBxa293dGdmbHZwZmV0dWhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDA2MDMsImV4cCI6MjA5MDAxNjYwM30.Kh3iciKKMJrufImJnLi-_5jFFyedeJZj4ANEOybpPwI';

const supabase = createClient(supabaseUrl, supabaseKey);

const BANK_CODES = {
  'BANCO DO BRASIL': '001',
  'BRADESCO': '237',
  'ITAU': '341',
  'ITAU UNIBANCO': '341',
  'SANTANDER': '033',
  'NUBANK': '260',
  'INTER': '077',
  'C6': '336',
  'C6 BANK': '336',
  'CAIXA': '104',
  'CAIXA ECONOMICA': '104',
  'MERCANTIL': '389',
  'SAFRA': '422',
  'SICREDI': '748',
  'SICOOB': '756',
  'ORIGINAL': '212',
  'BMG': '318',
  'BANRISUL': '041',
  'PAGBANK': '290',
  'PAGSEGURO': '290',
  'NEON': '655',
  'STONE': '197',
  'PICPAY': '380',
  'CREFISA': '069',
  'AGIBANK': '121',
  'AGIPLAN': '121',
  'MODAL': '746',
  'BTG': '208',
  'BTG PACTUAL': '208',
  'XP': '102'
};

const normalizeStr = (str) => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
};

async function run() {
  console.log('--- STARTING BANK ASSOCIATION AND REPLICATION ---');

  // 1. Fetch all registered banks
  const { data: dbBanks, error: banksErr } = await supabase.from('banks').select('*');
  if (banksErr) {
    console.error('Error fetching banks:', banksErr);
    return;
  }
  console.log(`Fetched ${dbBanks.length} registered banks from database.`);

  // 2. Correct bank codes
  const correctedBanks = [];
  for (const bank of dbBanks) {
    const normName = normalizeStr(bank.nome);
    const expectedCode = BANK_CODES[normName] || BANK_CODES[Object.keys(BANK_CODES).find(k => normName.includes(k) || k.includes(normName))];
    
    if (expectedCode && bank.codigo !== expectedCode) {
      console.log(`Correcting code for bank "${bank.nome}": "${bank.codigo}" -> "${expectedCode}"`);
      const { error: updateErr } = await supabase
        .from('banks')
        .update({ codigo: expectedCode })
        .eq('id', bank.id);
      
      if (updateErr) {
        console.error(`Failed to update bank "${bank.nome}" code:`, updateErr);
      } else {
        bank.codigo = expectedCode;
      }
    }
    correctedBanks.push(bank);
  }

  // 3. Fetch all collaborators
  const { data: collaborators, error: collabErr } = await supabase.from('collaborators').select('*');
  if (collabErr) {
    console.error('Error fetching collaborators:', collabErr);
    return;
  }
  console.log(`Fetched ${collaborators.length} collaborators from database.`);

  // 4. Update collaborators to match corrected registered banks
  let updatedCount = 0;
  for (const collab of collaborators) {
    if (!collab.banco) continue;

    const normCollabBank = normalizeStr(collab.banco);
    
    // Find matching registered bank in database
    const matchedBank = correctedBanks.find(b => {
      const normDbBank = normalizeStr(b.nome);
      return normCollabBank === normDbBank || 
             normCollabBank.includes(normDbBank) || 
             normDbBank.includes(normCollabBank);
    });

    if (matchedBank) {
      const correctName = matchedBank.nome.toUpperCase();
      if (collab.banco !== correctName) {
        console.log(`Updating collaborator "${collab.nome}" bank: "${collab.banco}" -> "${correctName}"`);
        const { error: updateCollabErr } = await supabase
          .from('collaborators')
          .update({ banco: correctName })
          .eq('id', collab.id);
        
        if (updateCollabErr) {
          console.error(`Failed to update collaborator "${collab.nome}" bank:`, updateCollabErr);
        } else {
          updatedCount++;
        }
      }
    } else {
      console.log(`Warning: Collaborator "${collab.nome}" is registered with bank "${collab.banco}" which was not found in registered banks list.`);
    }
  }

  console.log(`--- COMPLETED ---`);
  console.log(`Corrected bank codes where needed.`);
  console.log(`Successfully updated ${updatedCount} collaborators' bank associations.`);
}

run();
