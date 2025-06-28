import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { supabase, updateUserMetadata } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, subscriptionTier?: string) => Promise<any>;
  logout: () => void;
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

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const userData = createUserFromSupabaseUser(session.user);
        setUser(userData);
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const userData = createUserFromSupabaseUser(session.user);
          setUser(userData);
        } else {
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
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
      case 'pro': return 500;
      case 'free': return 50;
      default: return 50;
    }
  };

  const login = async (email: string, password: string, subscriptionTier?: string) => {
    setIsLoading(true);
    
    try {
      // If subscriptionTier is provided, this is a sign-up attempt
      if (subscriptionTier) {
        const role = email === 'admin@enrichx.com' ? 'admin' : 'subscriber';
        const tier = email === 'admin@enrichx.com' ? 'enterprise' : subscriptionTier;
        
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: email === 'admin@enrichx.com' ? 'Admin User' : 'User',
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
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}