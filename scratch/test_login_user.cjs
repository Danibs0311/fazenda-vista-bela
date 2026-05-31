const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://supabasekong-m86nl82q0awvxc0zlzsoddvm.147.15.114.255.sslip.io';
const supabaseKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3OTkwNDg2MCwiZXhwIjo0OTM1NTc4NDYwLCJyb2xlIjoiYW5vbiJ9.awYIFK9gCQ9JQNbbStRQy1T2dGjH0fqZaimmfrQeVo4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLogin() {
  const email = 'deivide-55466@fvb.com';
  const password = '55466676055'; // Clean CPF digits

  console.log(`Attempting login with ${email}...`);
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('Login Failed with error:', error.message, error.status);
    } else {
      console.log('Login Succeeded!', data.user.id, data.session ? 'Session created' : 'No session');
    }
  } catch (err) {
    console.error('Exception during login:', err);
  }
}

testLogin();
