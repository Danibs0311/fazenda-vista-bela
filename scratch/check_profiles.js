import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://supabasekong-m86nl82q0awvxc0zlzsoddvm.147.15.114.255.sslip.io';
const supabaseKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3OTkwNDg2MCwiZXhwIjo0OTM1NTc4NDYwLCJyb2xlIjoiYW5vbiJ9.awYIFK9gCQ9JQNbbStRQy1T2dGjH0fqZaimmfrQeVo4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Testing collaborators...');
  const { data: cData, error: cErr } = await supabase.from('collaborators').select('*').limit(1);
  console.log('Collaborators:', cData, 'Error:', cErr?.message);

  console.log('Testing profiles...');
  const { data: pData, error: pErr } = await supabase.from('profiles').select('*').limit(1);
  console.log('Profiles:', pData, 'Error:', pErr?.message);
}

test();
