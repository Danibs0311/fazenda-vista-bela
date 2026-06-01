import pg from 'pg';

const { Client } = pg;

async function run() {
  const configs = [
    {
      host: 'supabasekong-m86nl82q0awvxc0zlzsoddvm.147.15.114.255.sslip.io',
      port: 5432,
      user: 'postgres',
      password: 'VistaBela2026SecurePass',
      database: 'postgres'
    },
    {
      host: '147.15.114.255',
      port: 5432,
      user: 'postgres',
      password: 'VistaBela2026SecurePass',
      database: 'postgres'
    }
  ];

  let client;
  for (const config of configs) {
    try {
      console.log(`Trying to connect to ${config.host}:${config.port}...`);
      client = new Client(config);
      await client.connect();
      console.log('Connected successfully!');
      break;
    } catch (err) {
      console.error(`Failed to connect to ${config.host}:`, err.message);
      client = null;
    }
  }

  if (!client) {
    console.error('Could not connect to any database config.');
    process.exit(1);
  }

  try {
    console.log('=== ROW COUNTS ===');
    
    const tables = [
      'public.collaborators',
      'public.harvest_weeks',
      'public.harvest_logs',
      'public.pricing_config',
      'public.banks',
      'public.profiles',
      'auth.users'
    ];

    for (const table of tables) {
      try {
        const res = await client.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`${table}: ${res.rows[0].count} rows`);
      } catch (err) {
        console.error(`Error querying ${table}:`, err.message);
      }
    }

    console.log('\n=== USERS IN public.profiles ===');
    try {
      const res = await client.query('SELECT * FROM public.profiles');
      console.log(res.rows);
    } catch (err) {
      console.error(err.message);
    }

    console.log('\n=== USERS IN auth.users ===');
    try {
      const res = await client.query('SELECT id, email, raw_user_meta_data FROM auth.users');
      console.log(res.rows);
    } catch (err) {
      console.error(err.message);
    }

  } catch (err) {
    console.error('Error during inspection:', err.message);
  } finally {
    await client.end();
  }
}

run();
