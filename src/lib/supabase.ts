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
  
  if (user) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('user_id', user.id)
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
  
  if (user) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_admin')
        .eq('user_id', user.id)
        .single();
      
      if (profile) {
        return profile.is_admin ? 'admin' : profile.role;
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
    .update({
      ...profileData,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .select()
    .single();
  
  return { data, error };
};

// Helper function to get user profile
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      user_id,
      username,
      email,
      full_name,
      role,
      is_admin,
      subscription_tier,
      subscription_status,
      credits_remaining,
      credits_monthly_limit,
      company_name,
      billing_cycle_start,
      billing_cycle_end,
      last_sign_in_at,
      email_verified,
      phone_verified,
      phone,
      created_at,
      updated_at
    `)
    .eq('user_id', userId)
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
    
    const currentCredits = profile.credits_remaining || 0;
    if (currentCredits < amount) {
      throw new Error('Insufficient credits');
    }
    
    // Deduct credits
    const newCredits = currentCredits - amount;
    const { data, error } = await updateUserProfile(userId, {
      credits_remaining: newCredits
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

// Helper function to create or update user profile
export const createUserProfile = async (userId: string, userData: any) => {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      user_id: userId,
      email: userData.email,
      username: userData.username || userData.email.split('@')[0],
      full_name: userData.full_name || userData.name,
      role: userData.role || 'subscriber',
      is_admin: userData.role === 'admin',
      subscription_tier: userData.subscription_tier || 'free',
      subscription_status: userData.subscription_status || 'active',
      credits_remaining: userData.credits_remaining || getDefaultCredits(userData.subscription_tier || 'free'),
      credits_monthly_limit: userData.credits_monthly_limit || getDefaultCredits(userData.subscription_tier || 'free'),
      company_name: userData.company_name || '',
      phone: userData.phone || '',
      email_verified: userData.email_verified || false,
      phone_verified: userData.phone_verified || false,
      billing_cycle_start: userData.billing_cycle_start || new Date().toISOString(),
      billing_cycle_end: userData.billing_cycle_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();
  
  return { data, error };
};

// Helper function to get default credits based on tier
export const getDefaultCredits = (tier: string) => {
  switch (tier) {
    case 'enterprise': return 10000;
    case 'pro': return 2000;
    case 'free': return 50;
    default: return 50;
  }
};