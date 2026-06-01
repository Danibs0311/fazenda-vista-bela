import pg from 'pg';

const { Client } = pg;

async function run() {
  const configs = [
    {
      host: '147.15.114.255',
      port: 5432,
      user: 'postgres',
      password: 'VistaBela2026SecurePass',
      database: 'postgres'
    },
    {
      host: 'supabasekong-m86nl82q0awvxc0zlzsoddvm.147.15.114.255.sslip.io',
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
    console.log('Creating delete_collaborator_by_id RPC function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.delete_collaborator_by_id(target_id TEXT)
      RETURNS VOID AS $$
      BEGIN
        BEGIN
          DELETE FROM public.collaborators WHERE id = target_id;
        EXCEPTION WHEN foreign_key_violation THEN
          RAISE EXCEPTION 'Este colaborador possui colheitas lançadas e não pode ser excluído.';
        END;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);
    console.log('RPC function created successfully!');
  } catch (err) {
    console.error('Failed to create RPC:', err.message);
  } finally {
    await client.end();
  }
}

run();
