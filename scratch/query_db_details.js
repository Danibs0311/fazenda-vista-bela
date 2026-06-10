import pg from 'pg';
const { Client } = pg;

const configs = [
  {
    host: '147.15.114.255',
    port: 5432,
    user: 'postgres',
    password: 'VistaBela2026SecurePass',
    database: 'postgres'
  },
  {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'VistaBela2026SecurePass',
    database: 'postgres'
  }
];

async function run() {
  let client;
  for (const config of configs) {
    try {
      console.log(`Connecting to pg at ${config.host}...`);
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
    console.error('Could not connect to database.');
    return;
  }

  try {
    // 1. Check if delete_collaborator_by_id function exists
    console.log('\nChecking for delete_collaborator_by_id function:');
    const funcRes = await client.query(`
      SELECT routine_name, routine_type
      FROM information_schema.routines
      WHERE routine_schema = 'public' AND routine_name = 'delete_collaborator_by_id';
    `);
    console.table(funcRes.rows);

    // 2. Check collaborators table
    console.log('\nCollaborators count:');
    const countRes = await client.query('SELECT count(*) FROM public.collaborators;');
    console.table(countRes.rows);

    // 3. Let's see some collaborator names and IDs
    console.log('\nSample collaborators:');
    const sampleRes = await client.query('SELECT id, nome, status FROM public.collaborators LIMIT 10;');
    console.table(sampleRes.rows);

    // 4. Check harvest_logs for a collaborator to see if they have harvests
    console.log('\nSample harvests count per collaborator:');
    const harvestsRes = await client.query(`
      SELECT colaborador_id, COUNT(*) 
      FROM public.harvest_logs 
      GROUP BY colaborador_id 
      LIMIT 10;
    `);
    console.table(harvestsRes.rows);

  } catch (err) {
    console.error('Query error:', err);
  } finally {
    await client.end();
  }
}

run();
