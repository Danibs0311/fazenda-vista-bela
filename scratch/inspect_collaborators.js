import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnvVar = (name) => {
  const match = envContent.match(new RegExp(`${name}=(.*)`));
  return match ? match[1].trim() : null;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectCollaborators() {
  const { data, error } = await supabase.from('collaborators').select('id, nome, cpf').limit(50);
  if (error) {
    console.error('Error fetching collaborators:', error.message);
    process.exit(1);
  }
  console.log(`Found ${data.length} collaborators in database:`);
  console.table(data);
}

inspectCollaborators();
