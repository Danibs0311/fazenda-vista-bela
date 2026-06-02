const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ybupqkowtgflvpfetuha.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlidXBxa293dGdmbHZwZmV0dWhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDA2MDMsImV4cCI6MjA5MDAxNjYwM30.Kh3iciKKMJrufImJnLi-_5jFFyedeJZj4ANEOybpPwI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const price = {
    valor_lata: 25.5,
    data_inicio_vigencia: '2026-06-01'
  };
  
  try {
    const { data: existing } = await supabase
      .from('pricing_config')
      .select('id')
      .eq('data_inicio_vigencia', price.data_inicio_vigencia)
      .limit(1);

    console.log('Existing check:', existing);

    if (existing && existing.length > 0) {
      console.log('Updating existing price...');
      const { error } = await supabase
        .from('pricing_config')
        .update({ valor_lata: price.valor_lata })
        .eq('id', existing[0].id);

      if (error) throw error;
      console.log('Update success!');
    } else {
      console.log('Inserting new price...');
      const { error } = await supabase.from('pricing_config').insert(price);
      if (error) throw error;
      console.log('Insert success!');
    }
  } catch (err) {
    console.error('Operation failed:', err);
  }
}

run();
