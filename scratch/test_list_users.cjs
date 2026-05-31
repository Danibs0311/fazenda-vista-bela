const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://supabasekong-m86nl82q0awvxc0zlzsoddvm.147.15.114.255.sslip.io';
const supabaseKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3OTkwNDg2MCwiZXhwIjo0OTM1NTc4NDYwLCJyb2xlIjoiYW5vbiJ9.awYIFK9gCQ9JQNbbStRQy1T2dGjH0fqZaimmfrQeVo4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Calling RPC admin_list_users...');
  try {
    const { data, error } = await supabase.rpc('admin_list_users');
    if (error) {
      console.error('RPC Error:', error);
    } else {
      console.log('RPC Success! Users returned:', data);
    }
  } catch (err) {
    console.error('Catched error:', err);
  }
}

run();
