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
    const res = await client.query('SELECT * FROM public.banks ORDER BY nome');
    console.log('=== BANKS ===');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
