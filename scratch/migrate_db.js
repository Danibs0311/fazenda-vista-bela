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
    console.log('Creating profiles table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.profiles (
        id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
        nome TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'cabo')),
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('Profiles table checked/created.');

    console.log('Adding criada_por columns to harvest_logs if they do not exist...');
    await client.query(`
      ALTER TABLE public.harvest_logs 
      ADD COLUMN IF NOT EXISTS criado_por_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS criado_por_nome TEXT;
    `);
    console.log('Harvest logs columns updated.');

    console.log('Enabling RLS on profiles...');
    await client.query(`
      ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    `);

    console.log('Creating RLS policies on profiles...');
    await client.query(`
      DROP POLICY IF EXISTS "Allow public read profiles" ON public.profiles;
      CREATE POLICY "Allow public read profiles" ON public.profiles
        FOR SELECT USING (true);
      
      DROP POLICY IF EXISTS "Allow admins to modify profiles" ON public.profiles;
      CREATE POLICY "Allow admins to modify profiles" ON public.profiles
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin' AND status = 'active'
          )
        );
    `);
    console.log('RLS policies checked/created.');

  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await client.end();
  }
}

run();
