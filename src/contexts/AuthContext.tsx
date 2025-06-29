import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { supabase, updateUserMetadata } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, signupData?: { subscriptionTier: string; name: string; companyName: string }) => Promise<any>;
  logout: () => Promise<void>;
  isLoading: boolean;
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
  const lastActivityRef = useRef<number>(Date.now());

  // Inactivity timeout (10 minutes)
  const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds

  const resetInactivityTimer = () => {
    lastActivityRef.current = Date.now();
    
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    if (user) {
      inactivityTimerRef.current = setTimeout(() => {
        console.log('User inactive for 10 minutes, logging out...');
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

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const userData = createUserFromSupabaseUser(session.user);
        setUser(userData);
        
        // Setup activity monitoring for logged-in users
        cleanupActivityListeners = setupActivityListeners();
        resetInactivityTimer();
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (session?.user) {
          const userData = createUserFromSupabaseUser(session.user);
          setUser(userData);
          
          // Setup activity monitoring for newly logged-in users
          if (!cleanupActivityListeners) {
            cleanupActivityListeners = setupActivityListeners();
          }
          resetInactivityTimer();
        } else {
          setUser(null);
          
          // Clean up activity listeners when user logs out
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

  const createUserFromSupabaseUser = (supabaseUser: any): User => {
    const metadata = supabaseUser.user_metadata || {};
    
    // Special handling for admin@enrichx.com
    const isAdmin = supabaseUser.email === 'admin@enrichx.com';
    const role = isAdmin ? 'admin' : (metadata.role || 'subscriber');
    const tier = isAdmin ? 'enterprise' : (metadata.subscription_tier || 'free');
    
    return {
      id: supabaseUser.id,
      email: supabaseUser.email,
      name: metadata.name || (isAdmin ? 'Admin User' : supabaseUser.email.split('@')[0]),
      role: role,
      subscription_tier: tier,
      credits_remaining: metadata.credits_remaining || getDefaultCredits(tier),
      credits_monthly_limit: getDefaultCredits(tier),
      subscription_status: metadata.subscription_status || 'active',
      created_at: new Date(supabaseUser.created_at),
      last_login: new Date()
    };
  };

  const getDefaultCredits = (tier: string) => {
    switch (tier) {
      case 'enterprise': return 10000;
      case 'pro': return 2000;
      case 'free': return 50;
      default: return 50;
    }
  };

  const login = async (email: string, password: string, signupData?: { subscriptionTier: string; name: string; companyName: string }) => {
    setIsLoading(true);
    
    try {
      // If signupData is provided, this is a sign-up attempt
      if (signupData) {
        const role = email === 'admin@enrichx.com' ? 'admin' : 'subscriber';
        const tier = email === 'admin@enrichx.com' ? 'enterprise' : signupData.subscriptionTier;
        
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: email === 'admin@enrichx.com' ? 'Admin User' : signupData.name,
              company_name: signupData.companyName,
              role,
              subscription_tier: tier,
              credits_remaining: getDefaultCredits(tier),
              subscription_status: 'active'
            }
          }
        });

        if (signUpError) throw signUpError;
        
        if (signUpData.user) {
          const userData = createUserFromSupabaseUser(signUpData.user);
          setUser(userData);
          return userData;
        }
      } else {
        // This is a sign-in attempt
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) throw signInError;
        
        if (signInData.user) {
          // Update metadata for admin if needed
          if (email === 'admin@enrichx.com') {
            await updateUserMetadata({
              role: 'admin',
              subscription_tier: 'enterprise',
              credits_remaining: 10000,
              name: 'Admin User'
            });
          }
          
          const userData = createUserFromSupabaseUser(signInData.user);
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
      // Clear inactivity timer
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      }
      
      // Clear user state
      setUser(null);
      
      console.log('User successfully logged out');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, clear the user state
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}