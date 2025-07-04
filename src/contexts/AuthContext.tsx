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

  // Inactivity timeout (30 minutes)
  const INACTIVITY_TIMEOUT = 30 * 60 * 1000;

  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    if (user) {
      inactivityTimerRef.current = setTimeout(() => {
        console.log('User inactive for 30 minutes, logging out...');
        logout();
      }, INACTIVITY_TIMEOUT);
    }
  };

  const setupActivityListeners = () => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const activityHandler = () => {
      resetInactivityTimer();
    };

    events.forEach(event => {
      document.addEventListener(event, activityHandler, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, activityHandler, true);
      });
    };
  };

  useEffect(() => {
    let cleanupActivityListeners: (() => void) | null = null;

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setIsLoading(false);
          return;
        }

        if (session?.user) {
          const userData = await createUserFromSupabaseUser(session.user);
          setUser(userData);
          
          cleanupActivityListeners = setupActivityListeners();
          resetInactivityTimer();
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (session?.user) {
          const userData = await createUserFromSupabaseUser(session.user);
          setUser(userData);
          
          if (!cleanupActivityListeners) {
            cleanupActivityListeners = setupActivityListeners();
          }
          resetInactivityTimer();
        } else {
          setUser(null);
          
          if (cleanupActivityListeners) {
            cleanupActivityListeners();
            cleanupActivityListeners = null;
          }
          
          if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current);
            inactivityTimerRef.current = null;
          }
        }
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
      if (cleanupActivityListeners) {
        cleanupActivityListeners();
      }
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, []);

  const createUserFromSupabaseUser = async (supabaseUser: any): Promise<User> => {
    try {
      // Fetch user profile from profiles table
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        // Fallback to metadata if profile doesn't exist
        return createUserFromMetadata(supabaseUser);
      }

      return {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        subscription_tier: profile.subscription_tier,
        credits_remaining: profile.credits_remaining,
        credits_monthly_limit: profile.credits_monthly_limit,
        subscription_status: profile.subscription_status,
        created_at: new Date(profile.created_at),
        last_login: new Date(),
        billing_cycle_start: new Date(),
        billing_cycle_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        exports_this_month: {
          companies: 0,
          contacts: 0
        },
        company_name: profile.company_name || ''
      };
    } catch (error) {
      console.error('Error creating user from Supabase user:', error);
      return createUserFromMetadata(supabaseUser);
    }
  };

  const createUserFromMetadata = (supabaseUser: any): User => {
    const metadata = supabaseUser.user_metadata || {};
    const isAdmin = supabaseUser.email === 'admin@enrichx.com';
    
    return {
      id: supabaseUser.id,
      email: supabaseUser.email,
      name: metadata.name || (isAdmin ? 'Admin User' : supabaseUser.email.split('@')[0]),
      role: isAdmin ? 'admin' : (metadata.role || 'subscriber'),
      subscription_tier: isAdmin ? 'enterprise' : (metadata.subscription_tier || 'free'),
      credits_remaining: metadata.credits_remaining || (isAdmin ? 10000 : 50),
      credits_monthly_limit: isAdmin ? 10000 : 50,
      subscription_status: metadata.subscription_status || 'active',
      created_at: new Date(supabaseUser.created_at),
      last_login: new Date(),
      billing_cycle_start: new Date(),
      billing_cycle_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      exports_this_month: {
        companies: 0,
        contacts: 0
      },
      company_name: metadata.company_name || ''
    };
  };

  const updateUser = (userData: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...userData } : null);
  };

  const login = async (email: string, password: string, signupData?: { subscriptionTier: string; name: string; companyName: string }) => {
    setIsLoading(true);
    
    try {
      if (signupData) {
        // Sign up
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
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

        if (signUpError) throw signUpError;
        
        if (signUpData.user) {
          const userData = await createUserFromSupabaseUser(signUpData.user);
          setUser(userData);
          return userData;
        }
      } else {
        // Sign in
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) throw signInError;
        
        if (signInData.user) {
          const userData = await createUserFromSupabaseUser(signInData.user);
          setUser(userData);
          return userData;
        }
      }
    } catch (error) {
      console.error('Authentication error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }

      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      }
      
      setUser(null);
      console.log('User successfully logged out');
    } catch (error) {
      console.error('Logout error:', error);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}