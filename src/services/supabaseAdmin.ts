import { createClient } from '@supabase/supabase-js';

let supabaseAdminInstance: any = null;

// Lazy initialization wrapper to prevent synchronous crashes on module load 
// if the environment variables (especially VITE_SUPABASE_SERVICE_ROLE_KEY) are missing in the browser
export const getSupabaseAdmin = () => {
  if (supabaseAdminInstance) return supabaseAdminInstance;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('Supabase URL or Service Role Key missing! Admin operations will be disabled.');
    return null;
  }

  try {
    supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    return supabaseAdminInstance;
  } catch (err) {
    console.error('Failed to create Supabase Admin client:', err);
    return null;
  }
};
