const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ybupqkowtgflvpfetuha.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlidXBxa293dGdmbHZwZmV0dWhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDA2MDMsImV4cCI6MjA5MDAxNjYwM30.Kh3iciKKMJrufImJnLi-_5jFFyedeJZj4ANEOybpPwI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('banks')
    .select('*');
    
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('BANKS IN DATABASE:');
    console.log(data);
  }
}

run();
