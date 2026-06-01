import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabasekong-m86nl82q0awvxc0zlzsoddvm.147.15.114.255.sslip.io';
const supabaseKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3OTkwNDg2MCwiZXhwIjo0OTM1NTc4NDYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.65yClZPXGjklMGfNivcFSGXvKUHgWyv42VqdOvZyEt0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('collaborators')
    .select('tipo_conta');
  
  if (error) {
    console.error('Error:', error);
    return;
  }

  const counts = {};
  for (const c of data) {
    const op = c.tipo_conta;
    counts[op] = (counts[op] || 0) + 1;
  }

  console.log('Unique tipo_conta values in database:');
  console.log(counts);
}

check();
