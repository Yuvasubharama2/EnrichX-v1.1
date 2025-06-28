import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { supabase, updateUserMetadata } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, subscriptionTier?: string) => Promise<void>;
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
  const navigate = useNavigate();

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
    return {
      id: supabaseUser.id,
      email: supabaseUser.email,
      name: metadata.name || supabaseUser.email.split('@')[0],
      role: metadata.role || 'subscriber',
      subscription_tier: metadata.subscription_tier || 'free',
      credits_remaining: metadata.credits_remaining || getDefaultCredits(metadata.subscription_tier || 'free'),
      credits_monthly_limit: getDefaultCredits(metadata.subscription_tier || 'free'),
      subscription_status: metadata.subscription_status || 'active',
      created_at: new Date(supabaseUser.created_at),
      last_login: new Date()
    };
  };

  const getDefaultCredits = (tier: string) => {
    switch (tier) {
      case 'enterprise': return 10000;
      case 'pro': return 2000;
      case 'starter': return 500;
      default: return 50;
    }
  };

  const login = async (email: string, password: string, subscriptionTier?: string) => {
    setIsLoading(true);
    
    try {
      // If subscriptionTier is provided, this is a sign-up attempt
      if (subscriptionTier) {
        const role = email === 'admin@enrichx.com' ? 'admin' : 'subscriber';
        const tier = subscriptionTier || (role === 'admin' ? 'enterprise' : 'free');
        
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
        }
      } else {
        // This is a sign-in attempt
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) throw signInError;
        
        if (signInData.user) {
          const userData = createUserFromSupabaseUser(signInData.user);
          setUser(userData);
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