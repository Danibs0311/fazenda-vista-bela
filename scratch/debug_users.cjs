const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://supabasekong-m86nl82q0awvxc0zlzsoddvm.147.15.114.255.sslip.io';
const supabaseKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3OTkwNDg2MCwiZXhwIjo0OTM1NTc4NDYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.65yClZPXGjklMGfNivcFSGXvKUHgWyv42VqdOvZyEt0';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function run() {
  console.log('--- DEBUGGING USERS AND PROFILES ---');
  
  // 1. Fetch profiles
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*');
  if (pErr) {
    console.error('Profiles Fetch Error:', pErr);
  } else {
    console.log('PROFILES IN DATABASE:');
    console.log(profiles);
  }
  
  // 2. Fetch auth users using admin API (since we are using service role)
  const { data: authUsers, error: uErr } = await supabase.auth.admin.listUsers();
  if (uErr) {
    console.error('Auth Users Fetch Error:', uErr);
  } else {
    console.log('AUTH USERS IN DATABASE:');
    console.log(authUsers.users.map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      user_metadata: u.user_metadata
    })));
  }
}

run();
