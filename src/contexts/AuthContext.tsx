import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, signupData?: { subscriptionTier: string; name: string; companyName: string }) => Promise<any>;
  logout: () => Promise<void>;
  isLoading: boolean;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  const INACTIVITY_TIMEOUT = 30 * 60 * 1000;

  const getDefaultCredits = (tier: string) => {
    switch (tier) {
      case 'enterprise':
        return 10000;
      case 'pro':
        return 2000;
      default:
        return 50;
    }
  };

  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    if (user) {
      inactivityTimerRef.current = setTimeout(() => {
        logout();
      }, INACTIVITY_TIMEOUT);
    }
  };

  const setupActivityListeners = () => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const handler = () => resetInactivityTimer();
    events.forEach(e => document.addEventListener(e, handler, true));
    return () => events.forEach(e => document.removeEventListener(e, handler, true));
  };

  const createUserFromSupabaseUser = async (supabaseUser: any): Promise<User> => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (profile) {
        return {
          ...profile,
          created_at: new Date(profile.created_at),
          last_login: new Date(supabaseUser.last_sign_in_at || Date.now()),
          billing_cycle_start: new Date(),
          billing_cycle_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          exports_this_month: { companies: 0, contacts: 0 },
          company_name: profile.company_name || '',
          banned_until: profile.banned_until || null,
        };
      } else {
        return createUserFromMetadata(supabaseUser);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      return createUserFromMetadata(supabaseUser);
    }
  };

  const createUserFromMetadata = (supabaseUser: any): User => {
    const metadata = supabaseUser.user_metadata || {};
    const isAdmin = supabaseUser.email === 'admin@enrichx.com';
    const subscriptionTier =
      metadata.subscription_tier || metadata.subscriptionTier || metadata.tier || (isAdmin ? 'enterprise' : 'free');
    const defaultCredits = isAdmin ? 10000 : getDefaultCredits(subscriptionTier);
    return {
      id: supabaseUser.id,
      email: supabaseUser.email,
      name: metadata.name || supabaseUser.email.split('@')[0],
      role: isAdmin ? 'admin' : metadata.role || 'subscriber',
      subscription_tier: subscriptionTier,
      credits_remaining: metadata.credits_remaining || defaultCredits,
      credits_monthly_limit: defaultCredits,
      subscription_status: metadata.subscription_status || 'active',
      created_at: new Date(supabaseUser.created_at),
      last_login: new Date(supabaseUser.last_sign_in_at || Date.now()),
      billing_cycle_start: new Date(),
      billing_cycle_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      exports_this_month: { companies: 0, contacts: 0 },
      company_name: metadata.company_name || metadata.companyName || '',
      banned_until: null,
    };
  };

  useEffect(() => {
    let cleanupListeners: () => void;

    const init = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const userData = await createUserFromSupabaseUser(session.user);
          setUser(userData);
          cleanupListeners = setupActivityListeners();
          resetInactivityTimer();
        }
      } catch (err) {
        console.error('Error during session init:', err);
      } finally {
        setIsLoading(false); // Always unlock the UI
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth change:', event);
      if (session?.user) {
        const userData = await createUserFromSupabaseUser(session.user);
        setUser(userData);
        if (!cleanupListeners) {
          cleanupListeners = setupActivityListeners();
        }
        resetInactivityTimer();
      } else {
        setUser(null);
        if (cleanupListeners) cleanupListeners();
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      if (cleanupListeners) cleanupListeners();
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, []);

  const login = async (
    email: string,
    password: string,
    signupData?: { subscriptionTier: string; name: string; companyName: string }
  ) => {
    setIsLoading(true);
    try {
      if (signupData) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: signupData.name,
              company_name: signupData.companyName,
              subscription_tier: signupData.subscriptionTier,
              role: email === 'admin@enrichx.com' ? 'admin' : 'subscriber',
            },
          },
        });

        if (error) throw error;

        const userData = await createUserFromSupabaseUser(data.user);
        setUser(userData);
        return userData;
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        const userData = await createUserFromSupabaseUser(data.user);
        setUser(userData);
        return userData;
      }
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Logout error:', error);
    setUser(null);
  };

  const updateUser = (userData: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...userData } : null));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
