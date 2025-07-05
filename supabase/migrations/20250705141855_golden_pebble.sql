/*
  # Fix Database error granting user - Final Solution

  1. Problem Analysis
    - The trigger function on auth.users is causing the authentication to fail
    - Even with error handling, the trigger is blocking auth operations
    - Need to remove the trigger and handle profile creation differently

  2. Solution
    - Remove the problematic trigger completely
    - Create profiles manually after successful authentication
    - Use a simpler approach that doesn't interfere with auth

  3. Changes
    - Drop the trigger that's causing auth failures
    - Create a function to manually create profiles when needed
    - Ensure admin user can authenticate without issues
*/

-- ============================================================================
-- STEP 1: Remove the problematic trigger completely
-- ============================================================================

-- Drop the trigger that's causing auth failures
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the problematic function
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- ============================================================================
-- STEP 2: Create a manual profile creation function
-- ============================================================================

-- Create a function that can be called manually to create profiles
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
    
    -- Handle subscription tier
    user_tier := CASE 
      WHEN user_metadata->>'subscription_tier' = 'enterprise' THEN 'enterprise'::subscription_tier
      WHEN user_metadata->>'subscription_tier' = 'pro' THEN 'pro'::subscription_tier
      WHEN user_metadata->>'subscriptionTier' = 'enterprise' THEN 'enterprise'::subscription_tier
      WHEN user_metadata->>'subscriptionTier' = 'pro' THEN 'pro'::subscription_tier
      WHEN user_metadata->>'tier' = 'enterprise' THEN 'enterprise'::subscription_tier
      WHEN user_metadata->>'tier' = 'pro' THEN 'pro'::subscription_tier
      ELSE 'free'::subscription_tier
    END;
    
    company_name := user_metadata->>'company_name';
    
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions on the manual function
GRANT EXECUTE ON FUNCTION create_user_profile_manual(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_profile_manual(uuid, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION create_user_profile_manual(uuid, text, jsonb) TO supabase_auth_admin;

-- ============================================================================
-- STEP 3: Ensure admin user profile exists
-- ============================================================================

-- Create admin profile if admin user exists
DO $$
DECLARE
  admin_user_id uuid;
  admin_metadata jsonb;
BEGIN
  -- Get admin user info
  SELECT id, raw_user_meta_data INTO admin_user_id, admin_metadata
  FROM auth.users 
  WHERE email = 'admin@enrichx.com' 
  LIMIT 1;
  
  -- If admin user exists, create their profile
  IF admin_user_id IS NOT NULL THEN
    PERFORM create_user_profile_manual(
      admin_user_id,
      'admin@enrichx.com',
      COALESCE(admin_metadata, '{"role": "admin", "subscription_tier": "enterprise"}'::jsonb)
    );
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Create profiles for any existing users without profiles
-- ============================================================================

-- Create profiles for existing users
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT u.id, u.email, u.raw_user_meta_data
    FROM auth.users u
    LEFT JOIN profiles p ON u.id = p.id
    WHERE p.id IS NULL
  LOOP
    PERFORM create_user_profile_manual(
      user_record.id,
      user_record.email,
      COALESCE(user_record.raw_user_meta_data, '{}'::jsonb)
    );
  END LOOP;
END $$;

-- ============================================================================
-- STEP 5: Create a simple trigger that doesn't interfere with auth
-- ============================================================================

-- Create a very simple trigger that just logs user creation
CREATE OR REPLACE FUNCTION log_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Just log the user creation, don't do any complex operations
  RAISE LOG 'New user created: %', NEW.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a simple logging trigger (this shouldn't cause auth issues)
CREATE TRIGGER log_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION log_new_user();

-- ============================================================================
-- STEP 6: Ensure all permissions are correct
-- ============================================================================

-- Make sure all roles have necessary permissions
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

-- Grant function permissions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ============================================================================
-- STEP 7: Verify admin user can authenticate
-- ============================================================================

-- Ensure admin user exists and has correct profile
DO $$
DECLARE
  admin_exists boolean := false;
  admin_user_id uuid;
BEGIN
  -- Check if admin user exists
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'admin@enrichx.com') INTO admin_exists;
  
  IF admin_exists THEN
    -- Get admin user ID
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@enrichx.com';
    
    -- Ensure admin profile is correct
    INSERT INTO profiles (
      id, email, name, role, subscription_tier, 
      credits_remaining, credits_monthly_limit, subscription_status
    ) VALUES (
      admin_user_id, 'admin@enrichx.com', 'Admin User', 'admin', 
      'enterprise', 10000, 10000, 'active'
    )
    ON CONFLICT (id) DO UPDATE SET
      role = 'admin',
      subscription_tier = 'enterprise',
      credits_remaining = 10000,
      credits_monthly_limit = 10000,
      name = 'Admin User',
      updated_at = now();
      
    RAISE LOG 'Admin user profile verified/created for user ID: %', admin_user_id;
  ELSE
    RAISE LOG 'Admin user does not exist in auth.users table';
  END IF;
END $$;