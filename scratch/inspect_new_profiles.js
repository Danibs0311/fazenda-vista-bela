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

async function inspectProfiles() {
  const { data, error } = await supabase.from('profiles').select('id, nome, role, status');
  if (error) {
    console.error('Error fetching profiles:', error.message);
  } else {
    console.log('Profiles in new database:');
    console.table(data);
  }
}

inspectProfiles();
