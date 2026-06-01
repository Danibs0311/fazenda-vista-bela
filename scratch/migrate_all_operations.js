import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabasekong-m86nl82q0awvxc0zlzsoddvm.147.15.114.255.sslip.io';
const supabaseKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3OTkwNDg2MCwiZXhwIjo0OTM1NTc4NDYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.65yClZPXGjklMGfNivcFSGXvKUHgWyv42VqdOvZyEt0';

const supabase = createClient(supabaseUrl, supabaseKey);

const normalizeOperation = (op) => {
  let cleanOp = (op || '').replace(/\s+/g, ' ').trim().toUpperCase();
  
  // Normalize float representations of integers, e.g., "13.0" -> "13"
  if (/^\d+(\.0+)?$/.test(cleanOp)) {
    cleanOp = String(Math.floor(parseFloat(cleanOp)));
  }

  if (!cleanOp || cleanOp === '0') {
    return 'XXXX';
  }
  if (cleanOp === '13') {
    return '013';
  }
  if (cleanOp === '23') {
    return '023';
  }
  if (
    cleanOp === 'C/ CORR' || 
    cleanOp === 'C/CORR' || 
    cleanOp === 'CORR' || 
    cleanOp === 'CC' || 
    cleanOp === 'C.CORR' || 
    cleanOp === 'C. CORR' || 
    cleanOp === 'C.CORRENTE' || 
    cleanOp === 'C. CORRENTE'
  ) {
    return 'CORRENTE';
  }
  if (
    cleanOp === 'C/POUP' || 
    cleanOp === 'C/ POUP' || 
    cleanOp === 'POUP' || 
    cleanOp === 'CP' || 
    cleanOp === 'POUPANCA' ||
    cleanOp === 'C.POUP' ||
    cleanOp === 'C. POUP'
  ) {
    return 'POUPANÇA';
  }
  return cleanOp;
};

async function run() {
  console.log('Fetching all collaborators in paginated batches...');
  let allCollaborators = [];
  let from = 0;
  const limit = 1000;
  let hasMore = true;

  while (hasMore) {
    console.log(`Fetching rows from ${from} to ${from + limit - 1}...`);
    const { data, error } = await supabase
      .from('collaborators')
      .select('*')
      .range(from, from + limit - 1);

    if (error) {
      console.error('Error fetching batch:', error);
      return;
    }

    allCollaborators = allCollaborators.concat(data);
    console.log(`Fetched ${data.length} rows.`);

    if (data.length < limit) {
      hasMore = false;
    } else {
      from += limit;
    }
  }

  console.log(`Total collaborators fetched: ${allCollaborators.length}`);

  let count = 0;
  for (const collab of allCollaborators) {
    const originalOp = collab.tipo_conta;
    const normalizedOp = normalizeOperation(originalOp);

    if (originalOp !== normalizedOp) {
      console.log(`Migrating ID ${collab.id} (${collab.nome}): '${originalOp}' -> '${normalizedOp}'`);
      
      const { error: updateErr } = await supabase
        .from('collaborators')
        .update({ tipo_conta: normalizedOp })
        .eq('id', collab.id);
      
      if (updateErr) {
        console.error(`Failed to update ID ${collab.id}:`, updateErr.message);
      } else {
        count++;
      }
    }
  }

  console.log(`Successfully migrated ${count} collaborators!`);
}

run();
