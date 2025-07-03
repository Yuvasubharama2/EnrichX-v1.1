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
  
  // Try to get from profiles table first (new schema)
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
      // Try old schema
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_tier')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          return profile.subscription_tier;
        }
      } catch (oldError) {
        console.warn('Could not fetch user tier from profiles:', oldError);
      }
    }
  }
  
  // Fallback to user metadata
  return user?.user_metadata?.subscription_tier || 'free';
};

// Helper function to get current user's role
export const getCurrentUserRole = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  
  // Try to get from profiles table first (new schema)
  if (user) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (profile) {
        return profile.role;
      }
    } catch (error) {
      // Try old schema
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          return profile.role;
        }
      } catch (oldError) {
        console.warn('Could not fetch user role from profiles:', oldError);
      }
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

// Helper function to update user profile (supports both schema versions)
export const updateUserProfile = async (userId: string, profileData: any) => {
  // Try new schema first
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (!error) {
      return { data, error };
    }
  } catch (newSchemaError) {
    console.warn('New schema update failed, trying old schema:', newSchemaError);
  }

  // Fallback to old schema
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', userId)
      .select()
      .single();
    
    return { data, error };
  } catch (oldSchemaError) {
    console.error('Both schema updates failed:', oldSchemaError);
    return { data: null, error: oldSchemaError };
  }
};

// Helper function to get user profile (supports both schema versions)
export const getUserProfile = async (userId: string) => {
  // Try new schema first
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        user_id,
        username,
        email,
        full_name,
        role,
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
    
    if (!error && data) {
      return { data, error };
    }
  } catch (newSchemaError) {
    console.warn('New schema fetch failed, trying old schema:', newSchemaError);
  }

  // Fallback to old schema
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    return { data, error };
  } catch (oldSchemaError) {
    console.error('Both schema fetches failed:', oldSchemaError);
    return { data: null, error: oldSchemaError };
  }
};

// Helper function to check if user is admin
export const isUserAdmin = async () => {
  const role = await getCurrentUserRole();
  return role === 'admin';
};

// Helper function to deduct credits from user (supports both schema versions)
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
    const updateData = {
      credits_remaining: newCredits,
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await updateUserProfile(userId, updateData);
    
    if (error) {
      throw error;
    }
    
    return { success: true, credits_remaining: newCredits };
  } catch (error) {
    console.error('Error deducting credits:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};