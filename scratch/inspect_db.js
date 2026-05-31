import pg from 'pg';

const { Client } = pg;

async function run() {
  const config = {
    host: 'supabasekong-m86nl82q0awvxc0zlzsoddvm.147.15.114.255.sslip.io',
    port: 5432,
    user: 'postgres',
    password: 'VistaBela2026SecurePass',
    database: 'postgres'
  };

  const client = new Client(config);
  try {
    await client.connect();
    console.log('Connected!');

    // Query triggers on auth.users or other tables
    console.log('=== TRIGGERS ON auth.users ===');
    const resTriggers = await client.query(`
      SELECT 
        tgname AS trigger_name,
        proname AS function_name,
        prosrc AS function_source
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      JOIN pg_proc p ON t.tgfoid = p.oid
      WHERE n.nspname = 'auth' AND c.relname = 'users';
    `);
    console.log(JSON.stringify(resTriggers.rows, null, 2));

    console.log('=== TRIGGERS IN PUBLIC SCHEMA ===');
    const resPublicTriggers = await client.query(`
      SELECT 
        c.relname AS table_name,
        tgname AS trigger_name,
        proname AS function_name
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      JOIN pg_proc p ON t.tgfoid = p.oid
      WHERE n.nspname = 'public';
    `);
    console.log(JSON.stringify(resPublicTriggers.rows, null, 2));

    console.log('=== SCHEMAS ===');
    const resSchemas = await client.query(`
      SELECT nspname FROM pg_namespace;
    `);
    console.log(JSON.stringify(resSchemas.rows, null, 2));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
