import { createClient } from '@supabase/supabase-js';

const OLD_URL = 'https://ybupqkowtgflvpfetuha.supabase.co';
const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlidXBxa293dGdmbHZwZmV0dWhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDA2MDMsImV4cCI6MjA5MDAxNjYwM30.Kh3iciKKMJrufImJnLi-_5jFFyedeJZj4ANEOybpPwI';

const NEW_URL = 'http://supabasekong-m86nl82q0awvxc0zlzsoddvm.147.15.114.255.sslip.io';
const NEW_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3OTkwNDg2MCwiZXhwIjo0OTM1NTc4NDYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.65yClZPXGjklMGfNivcFSGXvKUHgWyv42VqdOvZyEt0';

const supabaseOld = createClient(OLD_URL, OLD_KEY);
const supabaseNew = createClient(NEW_URL, NEW_KEY);

const TABLES = ['collaborators', 'harvest_weeks', 'pricing_config', 'banks', 'harvest_logs'];

async function migrate() {
  console.log('Starting data migration...');

  for (const table of TABLES) {
    console.log(`Migrating table: ${table}...`);

    // Fetch from old
    const { data, error } = await supabaseOld.from(table).select('*');
    if (error) {
      console.error(`Error fetching from old table ${table}:`, error.message);
      continue;
    }

    console.log(`Fetched ${data.length} rows from old ${table}.`);

    if (data.length === 0) continue;

    // Delete existing in new to prevent duplicate key errors (optional but safe)
    if (table === 'pricing_config' || table === 'banks') {
      // Clear standard inserted values to overwrite with old values
      const { error: delError } = await supabaseNew.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (delError) {
        console.log(`Notice: Clear operation returned: ${delError.message}`);
      }
    }

    // Insert to new
    const { error: insertError } = await supabaseNew.from(table).upsert(data);
    if (insertError) {
      console.error(`Error inserting into new table ${table}:`, insertError.message);
    } else {
      console.log(`Successfully migrated ${data.length} rows into new ${table}.`);
    }
  }

  console.log('Data migration completed successfully.');
}

migrate();
