import pg from 'pg';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnvVar = (name) => {
  const match = envContent.match(new RegExp(`${name}=(.*)`));
  return match ? match[1].trim() : null;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
// Get reference ID from URL: https://<ref>.supabase.co
const refId = supabaseUrl.match(/https:\/\/(.*)\.supabase\.co/)[1];

const config = {
  host: `db.${refId}.supabase.co`,
  port: 5432,
  user: 'postgres',
  password: 'VistaBela2026SecurePass', // The default password from oci-deployment or your DB password
  database: 'postgres'
};

const client = new pg.Client(config);

async function inspect() {
  try {
    await client.connect();
    console.log('Connected to PostgreSQL!');

    console.log('\n=== INDEXES ON public.collaborators ===');
    const resIdx = await client.query(`
      SELECT
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'collaborators';
    `);
    console.log(JSON.stringify(resIdx.rows, null, 2));

    console.log('\n=== CONSTRAINTS ON public.collaborators ===');
    const resConst = await client.query(`
      SELECT
        conname AS constraint_name,
        pg_get_constraintdef(c.oid) AS constraint_definition
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      JOIN pg_class cl ON cl.oid = c.conrelid
      WHERE n.nspname = 'public' AND cl.relname = 'collaborators';
    `);
    console.log(JSON.stringify(resConst.rows, null, 2));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

inspect();
