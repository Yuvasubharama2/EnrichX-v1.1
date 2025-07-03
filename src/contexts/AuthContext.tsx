import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { supabase, updateUserMetadata, getUserProfile, createUserProfile, getDefaultCredits } from '../lib/supabase';

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
  const lastActivityRef = useRef<number>(Date.now());

  // Inactivity timeout (30 minutes for better UX)
  const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

  const resetInactivityTimer = () => {
    lastActivityRef.current = Date.now();
    
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

    // Get initial session with better error handling
    const initializeAuth = async () => {
      try {
        console.log('Initializing authentication...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setIsLoading(false);
          return;
        }

        if (session?.user) {
          console.log('Session found, creating user data...');
          const userData = await createUserFromSupabaseUser(session.user);
          setUser(userData);
          
          // Setup activity monitoring for logged-in users
          cleanupActivityListeners = setupActivityListeners();
          resetInactivityTimer();
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Don't throw error, just log it and continue
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (session?.user) {
          const userData = await createUserFromSupabaseUser(session.user);
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

  const createUserFromSupabaseUser = async (supabaseUser: any): Promise<User> => {
    console.log('Creating user from Supabase user:', supabaseUser.email);
    
    // Try to get user data from profiles table
    try {
      const { data: profile, error } = await getUserProfile(supabaseUser.id);

      if (profile && !error) {
        console.log('Profile found in database:', profile);
        // Use profile data from database
        return {
          id: supabaseUser.id,
          user_id: profile.user_id,
          email: profile.email || supabaseUser.email,
          name: profile.full_name || profile.username || supabaseUser.email.split('@')[0],
          username: profile.username || supabaseUser.email.split('@')[0],
          full_name: profile.full_name,
          role: profile.is_admin ? 'admin' : (profile.role || 'subscriber'),
          is_admin: profile.is_admin || false,
          subscription_tier: profile.subscription_tier || 'free',
          credits_remaining: profile.credits_remaining || 0,
          credits_monthly_limit: profile.credits_monthly_limit || getDefaultCredits(profile.subscription_tier || 'free'),
          subscription_status: profile.subscription_status || 'active',
          created_at: new Date(profile.created_at || supabaseUser.created_at),
          last_login: new Date(),
          last_sign_in_at: profile.last_sign_in_at ? new Date(profile.last_sign_in_at) : new Date(),
          billing_cycle_start: profile.billing_cycle_start ? new Date(profile.billing_cycle_start) : new Date(),
          billing_cycle_end: profile.billing_cycle_end ? new Date(profile.billing_cycle_end) : new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000),
          exports_this_month: { companies: 0, contacts: 0 },
          company_name: profile.company_name || '',
          phone: profile.phone || '',
          email_verified: profile.email_verified || false,
          phone_verified: profile.phone_verified || false,
          updated_at: profile.updated_at ? new Date(profile.updated_at) : new Date()
        };
      }
    } catch (error) {
      console.warn('Could not fetch profile from database, will create new one:', error);
    }

    // If no profile exists, create one from user metadata or defaults
    const metadata = supabaseUser.user_metadata || {};
    const isAdmin = supabaseUser.email === 'admin@enrichx.com';
    const role = isAdmin ? 'admin' : (metadata.role || 'subscriber');
    const tier = isAdmin ? 'enterprise' : (metadata.subscription_tier || 'free');
    
    console.log('Creating new profile for user:', supabaseUser.email, 'with role:', role, 'tier:', tier);
    
    // Create profile in database
    const profileData = {
      email: supabaseUser.email,
      username: metadata.username || supabaseUser.email.split('@')[0],
      full_name: metadata.full_name || metadata.name || (isAdmin ? 'Admin User' : supabaseUser.email.split('@')[0]),
      role: role,
      subscription_tier: tier,
      subscription_status: metadata.subscription_status || 'active',
      credits_remaining: metadata.credits_remaining || getDefaultCredits(tier),
      credits_monthly_limit: getDefaultCredits(tier),
      company_name: metadata.company_name || '',
      phone: metadata.phone || '',
      email_verified: supabaseUser.email_confirmed_at ? true : false,
      phone_verified: supabaseUser.phone_confirmed_at ? true : false,
      billing_cycle_start: metadata.billing_cycle_start || new Date().toISOString(),
      billing_cycle_end: metadata.billing_cycle_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    try {
      const { data: newProfile, error: createError } = await createUserProfile(supabaseUser.id, profileData);
      
      if (createError) {
        console.error('Error creating profile:', createError);
        // Continue with fallback data
      } else {
        console.log('New profile created successfully:', newProfile);
      }
    } catch (error) {
      console.error('Error creating user profile:', error);
      // Continue with fallback data
    }
    
    // Return user data (either from created profile or fallback)
    return {
      id: supabaseUser.id,
      user_id: supabaseUser.id,
      email: supabaseUser.email,
      name: profileData.full_name,
      username: profileData.username,
      full_name: profileData.full_name,
      role: role,
      is_admin: isAdmin,
      subscription_tier: tier,
      credits_remaining: profileData.credits_remaining,
      credits_monthly_limit: profileData.credits_monthly_limit,
      subscription_status: profileData.subscription_status,
      created_at: new Date(supabaseUser.created_at),
      last_login: new Date(),
      last_sign_in_at: new Date(),
      billing_cycle_start: new Date(profileData.billing_cycle_start),
      billing_cycle_end: new Date(profileData.billing_cycle_end),
      exports_this_month: { companies: 0, contacts: 0 },
      company_name: profileData.company_name,
      phone: profileData.phone,
      email_verified: profileData.email_verified,
      phone_verified: profileData.phone_verified,
      updated_at: new Date()
    };
  };

  const updateUser = (userData: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...userData } : null);
  };

  const login = async (email: string, password: string, signupData?: { subscriptionTier: string; name: string; companyName: string }) => {
    setIsLoading(true);
    
    try {
      console.log('Starting login process for:', email);
      
      // If signupData is provided, this is a sign-up attempt
      if (signupData) {
        console.log('Processing signup...');
        const role = email === 'admin@enrichx.com' ? 'admin' : 'subscriber';
        const tier = email === 'admin@enrichx.com' ? 'enterprise' : signupData.subscriptionTier;
        
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: email === 'admin@enrichx.com' ? 'Admin User' : signupData.name,
              username: email.split('@')[0],
              company_name: signupData.companyName,
              role,
              subscription_tier: tier,
              credits_remaining: getDefaultCredits(tier),
              subscription_status: 'active'
            }
          }
        });

        if (signUpError) {
          console.error('Signup error:', signUpError);
          throw signUpError;
        }
        
        if (signUpData.user) {
          console.log('Signup successful, creating user data...');
          const userData = await createUserFromSupabaseUser(signUpData.user);
          setUser(userData);
          return userData;
        }
      } else {
        // This is a sign-in attempt
        console.log('Processing signin...');
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) {
          console.error('Signin error:', signInError);
          throw signInError;
        }
        
        if (signInData.user) {
          console.log('Signin successful, updating last sign in...');
          
          // Update last_sign_in_at in profiles table
          try {
            await supabase
              .from('profiles')
              .update({ 
                last_sign_in_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('user_id', signInData.user.id);
          } catch (updateError) {
            console.warn('Could not update last sign in time:', updateError);
          }

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
      console.log('Logging out user...');
      
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
    <AuthContext.Provider value={{ user, login, logout, isLoading, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}