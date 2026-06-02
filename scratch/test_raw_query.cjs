const pg = require('pg');
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

    const res = await client.query(`
      SELECT 
        u.id,
        COALESCE(p.nome, (u.raw_user_meta_data->>'nome'), UPPER(SPLIT_PART(u.email, '@', 1)))::text AS nome,
        COALESCE(p.role, (u.raw_user_meta_data->>'role'), 'admin')::text AS role,
        COALESCE(p.status, 'active')::text AS status,
        u.email::text,
        (u.raw_user_meta_data->>'cpf')::text AS cpf
      FROM auth.users u
      LEFT JOIN public.profiles p ON p.id = u.id;
    `);
    
    console.log('RAW QUERY OUTPUT:');
    console.log(res.rows);

  } catch (err) {
    console.error('Error running raw query:', err);
  } finally {
    await client.end();
  }
}

run();
