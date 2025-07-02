import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

// Get environment variables with fallbacks and validation
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate required environment variables
if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable. Please check your .env file or deployment configuration.');
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable. Please check your .env file or deployment configuration.');
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch (error) {
  throw new Error(`Invalid VITE_SUPABASE_URL format: ${supabaseUrl}. Please provide a valid URL.`);
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});

// Helper function to get current user's subscription tier
export const getCurrentUserTier = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  
  // Try to get from profiles table first
  if (user) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        return profile.subscription_tier;
      }
    } catch (error) {
      console.warn('Could not fetch user tier from profiles:', error);
    }
  }
  
  // Fallback to user metadata
  return user?.user_metadata?.subscription_tier || 'free';
};

// Helper function to get current user's role
export const getCurrentUserRole = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  
  // Try to get from profiles table first
  if (user) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        return profile.role;
      }
    } catch (error) {
      console.warn('Could not fetch user role from profiles:', error);
    }
  }
  
  // Fallback to user metadata or email check
  if (user?.email === 'admin@enrichx.com') {
    return 'admin';
  }
  
  return user?.user_metadata?.role || 'subscriber';
};

// Helper function to update user metadata
export const updateUserMetadata = async (metadata: any) => {
  const { data, error } = await supabase.auth.updateUser({
    data: metadata
  });
  return { data, error };
};

// Helper function to update user profile
export const updateUserProfile = async (userId: string, profileData: any) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(profileData)
    .eq('id', userId)
    .select()
    .single();
  
  return { data, error };
};

// Helper function to get user profile
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  return { data, error };
};

// Helper function to check if user is admin
export const isUserAdmin = async () => {
  const role = await getCurrentUserRole();
  return role === 'admin';
};

// Helper function to deduct credits from user
export const deductUserCredits = async (userId: string, amount: number = 1) => {
  try {
    // Get current credits
    const { data: profile, error: fetchError } = await getUserProfile(userId);
    
    if (fetchError || !profile) {
      throw new Error('Could not fetch user profile');
    }
    
    if (profile.credits_remaining < amount) {
      throw new Error('Insufficient credits');
    }
    
    // Deduct credits
    const newCredits = profile.credits_remaining - amount;
    const { data, error } = await updateUserProfile(userId, {
      credits_remaining: newCredits,
      updated_at: new Date().toISOString()
    });
    
    if (error) {
      throw error;
    }
    
    return { success: true, credits_remaining: newCredits };
  } catch (error) {
    console.error('Error deducting credits:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};