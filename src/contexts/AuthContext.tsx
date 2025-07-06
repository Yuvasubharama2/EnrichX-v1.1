import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  const INACTIVITY_TIMEOUT = 10; // 1 minute

  const getDefaultCredits = (tier: string): number => {
    switch (tier) {
      case 'enterprise': return 10000;
      case 'pro': return 2000;
      default: return 50;
    }
  };

  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);

    if (user) {
      inactivityTimerRef.current = setTimeout(() => {
        console.log('User inactive for 1 minutes, logging out...');
        logout();
      }, INACTIVITY_TIMEOUT);
    }
  };

  const setupActivityListeners = () => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    const handler = () => resetInactivityTimer();
    events.forEach(event => document.addEventListener(event, handler, true));
    return () => events.forEach(event => document.removeEventListener(event, handler, true));
  };

  useEffect(() => {
    let cleanupActivityListeners: (() => void) | null = null;

    const initializeAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
          return;
        }

        const session = data?.session;

        if (session?.user) {
          const userData = await createUserFromSupabaseUser(session.user);
          setUser(userData);
          cleanupActivityListeners = setupActivityListeners();
          resetInactivityTimer();
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
      } finally {
        setIsLoading(false); // ensure loading ends
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);

        if (session?.user) {
          const userData = await createUserFromSupabaseUser(session.user);
          setUser(userData);
          if (!cleanupActivityListeners) cleanupActivityListeners = setupActivityListeners();
          resetInactivityTimer();
        } else {
          setUser(null);
          if (cleanupActivityListeners) cleanupActivityListeners();
          if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        }
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
      if (cleanupActivityListeners) cleanupActivityListeners();
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, []);

  const createUserFromSupabaseUser = async (supabaseUser: any): Promise<User> => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', supabaseUser.id)
        .single();

      if (!error && profile) {
        return {
          id: supabaseUser.id,
          email: profile.email || supabaseUser.email,
          name: profile.name || profile.full_name || supabaseUser.email?.split('@')[0],
          role: profile.role || 'subscriber',
          subscription_tier: profile.subscription_tier || 'free',
          credits_remaining: profile.credits_remaining || 0,
          credits_monthly_limit: profile.credits_monthly_limit || getDefaultCredits(profile.subscription_tier || 'free'),
          subscription_status: profile.subscription_status || 'active',
          created_at: new Date(profile.created_at || supabaseUser.created_at),
          last_login: new Date(),
          billing_cycle_start: profile.billing_cycle_start ? new Date(profile.billing_cycle_start) : new Date(),
          billing_cycle_end: profile.billing_cycle_end ? new Date(profile.billing_cycle_end) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          exports_this_month: {
            companies: 0,
            contacts: 0
          },
          company_name: profile.company_name || '',
          is_admin: profile.is_admin || profile.role === 'admin' || profile.role === 'superadmin' || supabaseUser.email === 'admin@enrichx.com'
        };
      } else {
        console.log('Profile not found, using metadata fallback:', error);
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

    const subscriptionTier = metadata.subscription_tier || metadata.subscriptionTier || metadata.tier || (isAdmin ? 'enterprise' : 'free');
    const defaultCredits = isAdmin ? 10000 : getDefaultCredits(subscriptionTier);

    return {
      id: supabaseUser.id,
      email: supabaseUser.email,
      name: metadata.name || (isAdmin ? 'Admin User' : supabaseUser.email.split('@')[0]),
      role: isAdmin ? 'admin' : (metadata.role || 'subscriber'),
      subscription_tier: subscriptionTier,
      credits_remaining: metadata.credits_remaining || defaultCredits,
      credits_monthly_limit: defaultCredits,
      subscription_status: metadata.subscription_status || 'active',
      created_at: new Date(supabaseUser.created_at),
      last_login: new Date(),
      billing_cycle_start: new Date(),
      billing_cycle_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      exports_this_month: { companies: 0, contacts: 0 },
      company_name: metadata.company_name || metadata.companyName || '',
      is_admin: isAdmin
    };
  };

  const updateUser = (userData: Partial<User>) => {
    setUser(prev => (prev ? { ...prev, ...userData } : null));
  };

  const login = async (email: string, password: string, signupData?: { subscriptionTier: string; name: string; companyName: string }) => {
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
              role: email === 'admin@enrichx.com' ? 'admin' : 'subscriber'
            }
          }
        });

        if (error) throw error;

        if (data?.user) {
          await supabase.rpc('create_user_profile_manual', {
            user_id: data.user.id,
            user_email: email,
            user_metadata: {
              name: signupData.name,
              company_name: signupData.companyName,
              subscription_tier: signupData.subscriptionTier,
              role: email === 'admin@enrichx.com' ? 'admin' : 'subscriber'
            }
          });

          const userData = await createUserFromSupabaseUser(data.user);
          setUser(userData);
          return userData;
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        if (data?.user) {
          const userData = await createUserFromSupabaseUser(data.user);
          setUser(userData);
          return userData;
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      await supabase.auth.signOut();
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
