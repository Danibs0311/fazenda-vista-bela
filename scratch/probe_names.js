
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ybupqkowtgflvpfetuha.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlidXBxa293dGdmbHZwZmV0dWhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDA2MDMsImV4cCI6MjA5MDAxNjYwM30.Kh3iciKKMJrufImJnLi-_5jFFyedeJZj4ANEOybpPwI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function list() {
  const { data, error } = await supabase.from('colaboradores').select('*').limit(1);
  console.log('Colaboradores probe:', { data, error });
  
  const { data: d2, error: e2 } = await supabase.from('fazendas').select('*').limit(1);
  console.log('Fazendas probe:', { data: d2, error: e2 });
}

list();
