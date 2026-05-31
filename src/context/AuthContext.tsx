
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

  // Function to load profile from the public.profiles table
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error.message);
        setProfile(null);
        return;
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
      console.error('Exception fetching profile:', err);
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
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
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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

