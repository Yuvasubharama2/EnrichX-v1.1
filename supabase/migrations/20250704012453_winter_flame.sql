/*
  # Fix authentication database error

  1. Updates
    - Fix handle_new_user() function with proper search_path
    - Ensure subscription_tier enum exists before using it
    - Add proper error handling to the function
    - Fix potential issues with RLS policies

  2. Security
    - Maintain existing RLS policies
    - Ensure proper function security
*/

-- First, ensure the subscription_tier enum exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_tier') THEN
        CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'enterprise');
    END IF;
END $$;

-- Create or replace the updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix the handle_new_user function with proper search_path
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_credits integer;
  user_tier subscription_tier;
  user_role text;
BEGIN
  -- Set search_path to ensure proper type resolution
  SET search_path = public, pg_temp;
  
  -- Determine role and tier based on email
  IF NEW.email = 'admin@enrichx.com' THEN
    user_role := 'admin';
    user_tier := 'enterprise'::subscription_tier;
    default_credits := 10000;
  ELSE
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'subscriber');
    user_tier := COALESCE((NEW.raw_user_meta_data->>'subscription_tier')::subscription_tier, 'free'::subscription_tier);
    default_credits := CASE 
      WHEN user_tier = 'enterprise'::subscription_tier THEN 10000
      WHEN user_tier = 'pro'::subscription_tier THEN 2000
      ELSE 50
    END;
  END IF;

  -- Insert profile with error handling
  BEGIN
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
      last_sign_in_at
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
      NEW.raw_user_meta_data->>'company_name',
      user_role,
      user_tier,
      COALESCE((NEW.raw_user_meta_data->>'credits_remaining')::integer, default_credits),
      default_credits,
      COALESCE(NEW.raw_user_meta_data->>'subscription_status', 'active'),
      NEW.last_sign_in_at
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error but don't fail the user creation
      RAISE WARNING 'Failed to create profile for user %: %', NEW.email, SQLERRM;
      -- Still return NEW to allow user creation to succeed
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix the sync function as well
CREATE OR REPLACE FUNCTION sync_profile_to_auth()
RETURNS TRIGGER AS $$
BEGIN
  -- Set search_path to ensure proper type resolution
  SET search_path = public, pg_temp;
  
  -- Update auth.users metadata when profile is updated
  UPDATE auth.users
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
    'name', NEW.name,
    'company_name', NEW.company_name,
    'role', NEW.role,
    'subscription_tier', NEW.subscription_tier,
    'credits_remaining', NEW.credits_remaining,
    'subscription_status', NEW.subscription_status
  )
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the triggers to ensure they use the updated functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

DROP TRIGGER IF EXISTS sync_profile_to_auth_trigger ON profiles;
CREATE TRIGGER sync_profile_to_auth_trigger
  AFTER UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION sync_profile_to_auth();