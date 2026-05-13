
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ybupqkowtgflvpfetuha.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlidXBxa293dGdmbHZwZmV0dWhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDA2MDMsImV4cCI6MjA5MDAxNjYwM30.Kh3iciKKMJrufImJnLi-_5jFFyedeJZj4ANEOybpPwI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function probe() {
  const { data: c1 } = await supabase.from('collaborators').select('count');
  console.log('collaborators:', !!c1);
  const { data: c2 } = await supabase.from('colaboradores').select('count');
  console.log('colaboradores:', !!c2);
  const { data: b1 } = await supabase.from('banks').select('count');
  console.log('banks:', !!b1);
  const { data: b2 } = await supabase.from('bancos').select('count');
  console.log('bancos:', !!b2);
}

probe();
