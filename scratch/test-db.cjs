const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ybupqkowtgflvpfetuha.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlidXBxa293dGdmbHZwZmV0dWhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDA2MDMsImV4cCI6MjA5MDAxNjYwM30.Kh3iciKKMJrufImJnLi-_5jFFyedeJZj4ANEOybpPwI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("=== COLABORADORES ===");
  const { data: collabs, error: err1 } = await supabase.from('collaborators').select('*');
  if (err1) console.error(err1);
  else console.log(collabs.map(c => ({ id: c.id, nome: c.nome, status: c.status })));

  console.log("\n=== HISTÓRICO RECENTE ===");
  const { data: harvests, error: err2 } = await supabase.from('harvest_logs').select('*').limit(20);
  if (err2) console.error(err2);
  else console.log(harvests.map(h => ({ id: h.id, colaborador_id: h.colaborador_id, semana_id: h.semana_id, data: h.data_colheita })));
}

run();
