import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
  return user?.user_metadata?.subscription_tier || 'free';
};

// Helper function to update user metadata
export const updateUserMetadata = async (metadata: any) => {
  const { data, error } = await supabase.auth.updateUser({
    data: metadata
  });
  return { data, error };
};