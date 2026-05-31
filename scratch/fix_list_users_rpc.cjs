const pg = require('pg');
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
    console.log('Updating admin_list_users RPC function with non-ambiguous syntax...');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.admin_list_users()
      RETURNS TABLE (
        id uuid,
        nome text,
        role text,
        status text,
        email text,
        cpf text
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      #variable_conflict use_column
      BEGIN
        -- Check admin authorization
        IF NOT EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() AND role = 'admin' AND status = 'active'
        ) THEN
          RAISE EXCEPTION 'Acesso negado: Apenas administradores podem listar usuários.';
        END IF;

        RETURN QUERY
        SELECT 
          p.id,
          p.nome,
          p.role,
          p.status,
          u.email::text,
          (u.raw_user_meta_data->>'cpf')::text
        FROM public.profiles p
        JOIN auth.users u ON p.id = u.id;
      END;
      $$;
    `);

    console.log('Function re-created successfully!');

    // Re-grant execute permissions just in case
    console.log('Re-granting execute permission...');
    await client.query('GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;');
    console.log('Granted!');

  } catch (err) {
    console.error('Failed to run migration:', err);
  } finally {
    await client.end();
  }
}

run();
