const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://supabasekong-m86nl82q0awvxc0zlzsoddvm.147.15.114.255.sslip.io';
const serviceRoleKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3OTkwNDg2MCwiZXhwIjo0OTM1NTc4NDYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.65yClZPXGjklMGfNivcFSGXvKUHgWyv42VqdOvZyEt0';
const anonKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3OTkwNDg2MCwiZXhwIjo0OTM1NTc4NDYwLCJyb2xlIjoiYW5vbiJ9.awYIFK9gCQ9JQNbbStRQy1T2dGjH0fqZaimmfrQeVo4';

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const userClient = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  console.log('--- STARTING SAFE RPC DIAGNOSTIC ---');
  let tempUserId = null;

  try {
    // 1. Create temporary auth user
    console.log('Creating temporary admin user...');
    const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
      email: 'testadmin@fvb.com',
      password: 'TestPass123!',
      email_confirm: true
    });

    if (authErr) throw authErr;
    tempUserId = authData.user.id;
    console.log(`Auth user created successfully! ID: ${tempUserId}`);

    // 2. Create profile
    console.log('Creating profile for temporary admin...');
    const { error: profileErr } = await adminClient
      .from('profiles')
      .insert({
        id: tempUserId,
        nome: 'TEST ADMIN DIAGNOSTIC',
        role: 'admin',
        status: 'active'
      });

    if (profileErr) throw profileErr;
    console.log('Profile created successfully!');

    // 3. Sign in as the temporary admin
    console.log('Signing in as temporary admin via user client...');
    const { data: signInData, error: signInErr } = await userClient.auth.signInWithPassword({
      email: 'testadmin@fvb.com',
      password: 'TestPass123!'
    });

    if (signInErr) throw signInErr;
    console.log('Sign in success! Token obtained.');

    // 4. Call the RPC function
    console.log('Calling admin_list_users RPC function...');
    const { data: rpcData, error: rpcErr } = await userClient.rpc('admin_list_users');
    
    if (rpcErr) {
      console.error('--- RPC EXECUTION FAILED ---');
      console.error(rpcErr);
    } else {
      console.log('--- RPC EXECUTION SUCCEEDED ---');
      console.log(rpcData);
    }

  } catch (err) {
    console.error('Diagnostic error:', err);
  } finally {
    // 5. Cleanup
    console.log('--- CLEANING UP ---');
    if (tempUserId) {
      console.log('Deleting temporary profile...');
      const { error: delProfileErr } = await adminClient
        .from('profiles')
        .delete()
        .eq('id', tempUserId);
      if (delProfileErr) console.error('Failed to delete temp profile:', delProfileErr);

      console.log('Deleting temporary auth user...');
      const { error: delAuthErr } = await adminClient.auth.admin.deleteUser(tempUserId);
      if (delAuthErr) console.error('Failed to delete temp auth user:', delAuthErr);
    }
    console.log('Diagnostic finished.');
  }
}

run();
