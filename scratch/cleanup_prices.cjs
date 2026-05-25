const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ybupqkowtgflvpfetuha.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlidXBxa293dGdmbHZwZmV0dWhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDA2MDMsImV4cCI6MjA5MDAxNjYwM30.Kh3iciKKMJrufImJnLi-_5jFFyedeJZj4ANEOybpPwI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: prices, error } = await supabase
    .from('pricing_config')
    .select('*');
    
  if (error) {
    console.error('Error fetching prices:', error);
    return;
  }
  
  console.log('Original prices:', prices);
  
  // Group by date
  const groups = {};
  prices.forEach(p => {
    if (!groups[p.data_inicio_vigencia]) {
      groups[p.data_inicio_vigencia] = [];
    }
    groups[p.data_inicio_vigencia].push(p);
  });
  
  for (const date in groups) {
    const list = groups[date];
    if (list.length > 1) {
      console.log(`Found duplicates for date ${date}:`, list);
      
      // Sort list by price descending (or keep the one with the highest price as it is likely the newest correct one)
      // Here the user has 10, 34, 45. They likely want 45.
      list.sort((a, b) => b.valor_lata - a.valor_lata);
      
      const toKeep = list[0];
      const toDelete = list.slice(1);
      
      console.log(`Keeping:`, toKeep);
      console.log(`Deleting:`, toDelete);
      
      for (const item of toDelete) {
        const { error: delErr } = await supabase
          .from('pricing_config')
          .delete()
          .eq('id', item.id);
          
        if (delErr) {
          console.error(`Failed to delete item ${item.id}:`, delErr);
        } else {
          console.log(`Deleted item ${item.id} successfully.`);
        }
      }
    }
  }
  
  console.log('Cleanup completed successfully.');
}

run();
