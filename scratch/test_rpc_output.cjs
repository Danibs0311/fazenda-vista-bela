const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://supabasekong-m86nl82q0awvxc0zlzsoddvm.147.15.114.255.sslip.io';
const supabaseKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3OTkwNDg2MCwiZXhwIjo0OTM1NTc4NDYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.65yClZPXGjklMGfNivcFSGXvKUHgWyv42VqdOvZyEt0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('--- CALLING admin_list_users RPC ---');
  const { data, error } = await supabase.rpc('admin_list_users');
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Result:', data);
  }
}

run();
