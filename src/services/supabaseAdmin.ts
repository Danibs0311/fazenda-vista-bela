import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Supabase URL or Service Role Key missing! Admin operations may fail.');
}

// Dedicated admin client that bypasses RLS and allows auth management
// persistSession is set to false to prevent modifying the logged-in user session
export const supabaseAdmin = createClient(supabaseUrl || '', supabaseServiceKey || '', {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});
