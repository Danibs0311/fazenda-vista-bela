
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ybupqkowtgflvpfetuha.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlidXBxa293dGdmbHZwZmV0dWhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDA2MDMsImV4cCI6MjA5MDAxNjYwM30.Kh3iciKKMJrufImJnLi-_5jFFyedeJZj4ANEOybpPwI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function listTables() {
  const { data, error } = await supabase.rpc('get_tables');
  if (error) {
    console.log('RPC get_tables failed, trying generic query...');
    const { data: data2, error: error2 } = await supabase.from('pg_catalog.pg_tables').select('tablename').eq('schemaname', 'public');
    if (error2) console.error('Failed to list tables:', error2);
    else console.log('Tables:', data2.map(t => t.tablename));
  } else {
    console.log('Tables:', data);
  }
}

listTables();
