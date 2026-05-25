// JS implementation of dateUtils local format getWeekRange
const getWeekRange = (dateStr, weekOffset = 0) => {
  const date = dateStr ? new Date(dateStr + 'T12:00:00') : new Date("2026-05-24T22:23:04-03:00");
  date.setDate(date.getDate() + (weekOffset * 7));

  const day = date.getDay();
  let daysSinceFriday = (day + 2) % 7;

  const startDate = new Date(date);
  startDate.setDate(date.getDate() - daysSinceFriday);

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6); // Ends on Thursday

  const toLocalDateString = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  return {
    start: toLocalDateString(startDate),
    end: toLocalDateString(endDate),
    id: toLocalDateString(startDate)
  };
};

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ybupqkowtgflvpfetuha.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlidXBxa293dGdmbHZwZmV0dWhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDA2MDMsImV4cCI6MjA5MDAxNjYwM30.Kh3iciKKMJrufImJnLi-_5jFFyedeJZj4ANEOybpPwI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const currentWeekId = getWeekRange().id;
  console.log("Current Week ID:", currentWeekId);

  const { data: harvests } = await supabase
    .from('harvest_logs')
    .select('*')
    .eq('semana_id', currentWeekId);

  console.log("Harvests fetched for current week:", harvests.length);
  console.log("Harvest logs:", harvests.map(h => ({ colaborador_id: h.colaborador_id, semana_id: h.semana_id })));

  const { data: collabs } = await supabase.from('collaborators').select('*');

  collabs.forEach(c => {
    const isActive = harvests.some(h => h.colaborador_id === c.id);
    console.log(`Colaborador: ${c.nome} (ID: ${c.id}) -> ${isActive ? 'ATIVO' : 'INATIVO'}`);
  });
}

run();
