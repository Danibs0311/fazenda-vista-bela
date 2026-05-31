
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabase';
import { User, Session } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  nome: string;
  role: 'admin' | 'cabo';
  status: 'active' | 'inactive';
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INACTIVITY_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const lastActivityRef = useRef<number>(Date.now());

  // Function to load profile from the public.profiles table with timeout and offline fallbacks
  const fetchProfile = async (userId: string, authUser?: User | null) => {
    try {
      // Wrap the database query in a promise with a 3-second timeout to prevent hanging forever
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Profile fetch timed out')), 3000)
      );

      const { data, error } = await Promise.race([profilePromise, timeoutPromise]) as any;

      if (error) {
        console.error('Error fetching profile:', error.message);
        throw error;
      }

      if (data) {
        const userProfile = data as UserProfile;
        // If user is inactive, log them out immediately
        if (userProfile.status === 'inactive') {
          console.warn('User account is inactive. Logging out.');
          await supabase.auth.signOut();
          setProfile(null);
          setUser(null);
          setSession(null);
          return;
        }
        setProfile(userProfile);
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error('Exception fetching profile (falling back to offline metadata):', err);
      // Fallback: Reconstruct profile from the cached Auth User metadata
      const fallbackUser = authUser || user;
      if (fallbackUser) {
        const fallbackProfile: UserProfile = {
          id: fallbackUser.id,
          nome: fallbackUser.user_metadata?.nome || fallbackUser.email?.split('@')[0].toUpperCase() || 'COLABORADOR',
          role: (fallbackUser.user_metadata?.role as any) || 'cabo',
          status: 'active'
        };
        console.log('Successfully reconstructed fallback profile:', fallbackProfile);
        setProfile(fallbackProfile);
      } else {
        setProfile(null);
      }
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id, user);
    }
  };

  const signOut = async () => {
    localStorage.removeItem('fvb_last_activity');
    await supabase.auth.signOut();
    setProfile(null);
    setUser(null);
    setSession(null);
  };

  // Activity tracking for 24h inactivity logout
  useEffect(() => {
    const updateActivity = () => {
      const now = Date.now();
      lastActivityRef.current = now;
      localStorage.setItem('fvb_last_activity', now.toString());
    };

    // Load initial activity
    const savedActivity = localStorage.getItem('fvb_last_activity');
    if (savedActivity) {
      lastActivityRef.current = parseInt(savedActivity, 10);
    } else {
      updateActivity();
    }

    // Event listeners for activity
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    // Check inactivity periodically (every 10 seconds)
    const interval = setInterval(() => {
      const saved = localStorage.getItem('fvb_last_activity');
      const lastActivity = saved ? parseInt(saved, 10) : lastActivityRef.current;
      if (Date.now() - lastActivity > INACTIVITY_TIMEOUT) {
        console.warn('Logging out due to 24h inactivity');
        signOut();
      }
    }, 10000);

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    // Ultimate safety net: guarantee the loading screen is dismissed after 4 seconds under any circumstance
    const safetyTimeout = setTimeout(() => {
      setLoading(prev => {
        if (prev) {
          console.warn('Authentication loading timed out. Forcing UI to load.');
          return false;
        }
        return prev;
      });
    }, 4000);

    // Get initial session with robust error handling for offline/network failure
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id, session.user)
            .catch(err => console.error('Failed to load profile in getSession:', err))
            .finally(() => {
              clearTimeout(safetyTimeout);
              setLoading(false);
            });
        } else {
          clearTimeout(safetyTimeout);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Failed to get initial session on mount (offline fallback active):', err);
        clearTimeout(safetyTimeout);
        setLoading(false);
      });

    // Listen for auth state changes with robust error handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id, session.user);
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error('Failed to process auth state change:', err);
      } finally {
        clearTimeout(safetyTimeout);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

