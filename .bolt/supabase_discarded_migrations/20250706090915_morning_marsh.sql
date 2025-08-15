/*
  # Fix Authentication and Credit Allocation Issues

  1. Database Schema Fix
    - Ensure profiles.id is properly typed as uuid
    - Fix any type mismatches that cause bigint errors
    - Recreate the table with correct schema if needed

  2. Credit Allocation Fix
    - Ensure proper credit allocation based on subscription tier
    - Update the manual profile creation function
    - Fix any issues with profile creation during signup

  3. Authentication Flow
    - Ensure profiles are created correctly during signup
    - Fix any RLS policy issues
    - Ensure proper permissions
*/

-- ============================================================================
-- STEP 1: Fix the profiles table schema
-- ============================================================================

-- First, let's check if there are any type issues and fix them
DO $$
DECLARE
  profile_id_type text;
BEGIN
  -- Get the current data type of the id column
  SELECT data_type INTO profile_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'id';
  
  -- If it's not uuid, we need to fix it
  IF profile_id_type != 'uuid' THEN
    RAISE NOTICE 'Profiles.id column type is %, fixing to uuid', profile_id_type;
    
    -- Drop the table and recreate it with correct schema
    DROP TABLE IF EXISTS profiles CASCADE;
    
    -- Recreate profiles table with correct uuid type
    CREATE TABLE profiles (
      id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      email text UNIQUE NOT NULL,
      name text NOT NULL,
      company_name text,
      role text NOT NULL DEFAULT 'subscriber' CHECK (role IN ('admin', 'subscriber')),
      subscription_tier subscription_tier NOT NULL DEFAULT 'free',
      credits_remaining integer NOT NULL DEFAULT 50,
      credits_monthly_limit integer NOT NULL DEFAULT 50,
      subscription_status text NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active', 'canceled', 'past_due')),
      last_sign_in_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    
    -- Recreate indexes
    CREATE INDEX idx_profiles_email ON profiles (email);
    CREATE INDEX idx_profiles_role ON profiles (role);
    CREATE INDEX idx_profiles_subscription_tier ON profiles (subscription_tier);
    
    -- Enable RLS
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    
    -- Recreate policies
    CREATE POLICY "Users can read own profile" ON profiles
      FOR SELECT TO authenticated
      USING (auth.uid() = id);

    CREATE POLICY "Users can update own profile" ON profiles
      FOR UPDATE TO authenticated
      USING (auth.uid() = id);

    CREATE POLICY "Admins can read all profiles" ON profiles
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() AND role = 'admin'
        )
      );

    CREATE POLICY "Admins can manage all profiles" ON profiles
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() AND role = 'admin'
        )
      );

    CREATE POLICY "Service role full access to profiles" ON profiles
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);
    
    -- Recreate triggers
    CREATE TRIGGER update_profiles_updated_at 
      BEFORE UPDATE ON profiles
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER sync_profile_to_auth_trigger
      AFTER UPDATE ON profiles
      FOR EACH ROW EXECUTE FUNCTION sync_profile_to_auth();
    
  ELSE
    RAISE NOTICE 'Profiles.id column type is already uuid, no fix needed';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Update the manual profile creation function with proper credit logic
-- ============================================================================

-- Drop and recreate the manual profile creation function with better credit logic
DROP FUNCTION IF EXISTS create_user_profile_manual(uuid, text, jsonb);

CREATE OR REPLACE FUNCTION create_user_profile_manual(
  user_id uuid,
  user_email text,
  user_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void AS $$
DECLARE
  user_name text;
  user_role text;
  user_tier subscription_tier;
  default_credits integer;
  company_name text;
BEGIN
  -- Determine user details
  IF user_email = 'admin@enrichx.com' THEN
    user_name := 'Admin User';
    user_role := 'admin';
    user_tier := 'enterprise';
    default_credits := 10000;
    company_name := null;
  ELSE
    user_name := COALESCE(
      user_metadata->>'name',
      user_metadata->>'full_name',
      split_part(user_email, '@', 1)
    );
    user_role := COALESCE(user_metadata->>'role', 'subscriber');
    
    -- Handle subscription tier - check multiple possible field names
    user_tier := CASE 
      WHEN user_metadata->>'subscription_tier' = 'enterprise' THEN 'enterprise'::subscription_tier
      WHEN user_metadata->>'subscription_tier' = 'pro' THEN 'pro'::subscription_tier
      WHEN user_metadata->>'subscriptionTier' = 'enterprise' THEN 'enterprise'::subscription_tier
      WHEN user_metadata->>'subscriptionTier' = 'pro' THEN 'pro'::subscription_tier
      WHEN user_metadata->>'tier' = 'enterprise' THEN 'enterprise'::subscription_tier
      WHEN user_metadata->>'tier' = 'pro' THEN 'pro'::subscription_tier
      ELSE 'free'::subscription_tier
    END;
    
    company_name := COALESCE(
      user_metadata->>'company_name',
      user_metadata->>'companyName'
    );
    
    -- Set credits based on tier
    default_credits := CASE user_tier
      WHEN 'enterprise' THEN 10000
      WHEN 'pro' THEN 2000
      ELSE 50
    END;
  END IF;

  -- Insert or update profile
  INSERT INTO public.profiles (
    id,
    email,
    name,
    company_name,
    role,
    subscription_tier,
    credits_remaining,
    credits_monthly_limit,
    subscription_status,
    created_at,
    updated_at
  ) VALUES (
    user_id,
    user_email,
    user_name,
    company_name,
    user_role,
    user_tier,
    default_credits,
    default_credits,
    'active',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    company_name = EXCLUDED.company_name,
    role = EXCLUDED.role,
    subscription_tier = EXCLUDED.subscription_tier,
    credits_remaining = EXCLUDED.credits_remaining,
    credits_monthly_limit = EXCLUDED.credits_monthly_limit,
    subscription_status = EXCLUDED.subscription_status,
    updated_at = now();
    
  RAISE LOG 'Profile created/updated for user % with tier % and % credits', user_email, user_tier, default_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 3: Grant all necessary permissions
-- ============================================================================

-- Grant permissions on the manual function
GRANT EXECUTE ON FUNCTION create_user_profile_manual(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_profile_manual(uuid, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION create_user_profile_manual(uuid, text, jsonb) TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION create_user_profile_manual(uuid, text, jsonb) TO anon;

-- Ensure all permissions are correct for profiles table
GRANT ALL ON public.profiles TO supabase_auth_admin;
GRANT ALL ON public.profiles TO postgres;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO supabase_auth_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ============================================================================
-- STEP 4: Recreate profiles for existing users with correct credits
-- ============================================================================

-- Create profiles for existing users with correct credit allocation
DO $$
DECLARE
  user_record RECORD;
  user_tier subscription_tier;
  credits integer;
BEGIN
  FOR user_record IN 
    SELECT u.id, u.email, u.raw_user_meta_data
    FROM auth.users u
  LOOP
    -- Determine tier and credits
    IF user_record.email = 'admin@enrichx.com' THEN
      user_tier := 'enterprise';
      credits := 10000;
    ELSE
      user_tier := CASE 
        WHEN user_record.raw_user_meta_data->>'subscription_tier' = 'enterprise' THEN 'enterprise'::subscription_tier
        WHEN user_record.raw_user_meta_data->>'subscription_tier' = 'pro' THEN 'pro'::subscription_tier
        WHEN user_record.raw_user_meta_data->>'subscriptionTier' = 'enterprise' THEN 'enterprise'::subscription_tier
        WHEN user_record.raw_user_meta_data->>'subscriptionTier' = 'pro' THEN 'pro'::subscription_tier
        WHEN user_record.raw_user_meta_data->>'tier' = 'enterprise' THEN 'enterprise'::subscription_tier
        WHEN user_record.raw_user_meta_data->>'tier' = 'pro' THEN 'pro'::subscription_tier
        ELSE 'free'::subscription_tier
      END;
      
      credits := CASE user_tier
        WHEN 'enterprise' THEN 10000
        WHEN 'pro' THEN 2000
        ELSE 50
      END;
    END IF;
    
    -- Create/update profile with correct credits
    PERFORM create_user_profile_manual(
      user_record.id,
      user_record.email,
      COALESCE(user_record.raw_user_meta_data, '{}'::jsonb)
    );
    
    RAISE LOG 'Updated profile for % with tier % and % credits', user_record.email, user_tier, credits;
  END LOOP;
END $$;

-- ============================================================================
-- STEP 5: Create a function to get default credits by tier (for client use)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_default_credits_for_tier(tier text)
RETURNS integer AS $$
BEGIN
  RETURN CASE tier
    WHEN 'enterprise' THEN 10000
    WHEN 'pro' THEN 2000
    ELSE 50
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_default_credits_for_tier(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_default_credits_for_tier(text) TO service_role;
GRANT EXECUTE ON FUNCTION get_default_credits_for_tier(text) TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION get_default_credits_for_tier(text) TO anon;