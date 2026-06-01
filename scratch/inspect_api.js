import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env.local manually
const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[key] = value.trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseServiceKey = env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase URL or Service Role Key missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function run() {
  console.log('Connecting to Supabase at:', supabaseUrl);

  // 1. Inspect profiles
  console.log('\n--- Profiles ---');
  const { data: profiles, error: errProf } = await supabase.from('profiles').select('*');
  if (errProf) console.error('Error fetching profiles:', errProf.message);
  else console.log(`Found ${profiles.length} profiles:`, profiles);

  // 2. Inspect collaborators
  console.log('\n--- Collaborators ---');
  const { data: collabs, error: errCol } = await supabase.from('collaborators').select('*');
  if (errCol) console.error('Error fetching collaborators:', errCol.message);
  else console.log(`Found ${collabs.length} collaborators. Showing first 5:`, collabs.slice(0, 5));

  // 3. Inspect harvest_weeks
  console.log('\n--- Harvest Weeks ---');
  const { data: weeks, error: errW } = await supabase.from('harvest_weeks').select('*');
  if (errW) console.error('Error fetching harvest weeks:', errW.message);
  else console.log(`Found ${weeks.length} harvest weeks:`, weeks);

  // 4. Inspect harvest_logs
  console.log('\n--- Harvest Logs ---');
  const { data: logs, error: errL } = await supabase.from('harvest_logs').select('*');
  if (errL) console.error('Error fetching harvest logs:', errL.message);
  else console.log(`Found ${logs.length} harvest logs.`);
}

run();
