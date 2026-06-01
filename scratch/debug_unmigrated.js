import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabasekong-m86nl82q0awvxc0zlzsoddvm.147.15.114.255.sslip.io';
const supabaseKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3OTkwNDg2MCwiZXhwIjo0OTM1NTc4NDYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.65yClZPXGjklMGfNivcFSGXvKUHgWyv42VqdOvZyEt0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
  const { data: collab13, error: error13 } = await supabase
    .from('collaborators')
    .select('id, nome, tipo_conta')
    .in('tipo_conta', ['13', '23', 'POUP']);
  
  if (error13) {
    console.error('Error fetching:', error13);
    return;
  }

  console.log('Collaborators with 13, 23, or POUP:');
  console.log(collab13);
}

debug();
