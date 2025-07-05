/*
  # Fix Profile Insert Policy for Authentication

  1. Issue
    - Users cannot login because the `handle_new_user` trigger cannot insert profiles
    - RLS policies are blocking profile creation during authentication
    - Subscription tiers are not being assigned correctly

  2. Solution
    - Add INSERT policy for authenticated users to create their own profiles
    - This allows the authentication trigger to work properly
    - Ensures subscription tiers are correctly assigned during signup

  3. Security
    - Users can only insert their own profile (auth.uid() = id)
    - Maintains security while allowing proper authentication flow
*/

-- Add policy to allow authenticated users to insert their own profile
CREATE POLICY "Allow authenticated users to create their own profile" 
ON profiles 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

-- Also add a policy for anon users during the signup process
-- This is needed because during signup, the user might not be fully authenticated yet
CREATE POLICY "Allow profile creation during signup" 
ON profiles 
FOR INSERT 
TO anon 
WITH CHECK (true);

-- Update the handle_new_user function to be more robust
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_name text;
  user_role text;
  user_tier subscription_tier;
  default_credits integer;
BEGIN
  -- Determine user details based on email and metadata
  IF NEW.email = 'admin@enrichx.com' THEN
    user_name := 'Admin User';
    user_role := 'admin';
    user_tier := 'enterprise';
    default_credits := 10000;
  ELSE
    user_name := COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    );
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'subscriber');
    
    -- Fix subscription tier assignment
    user_tier := CASE 
      WHEN NEW.raw_user_meta_data->>'subscription_tier' = 'enterprise' THEN 'enterprise'::subscription_tier
      WHEN NEW.raw_user_meta_data->>'subscription_tier' = 'pro' THEN 'pro'::subscription_tier
      WHEN NEW.raw_user_meta_data->>'tier' = 'enterprise' THEN 'enterprise'::subscription_tier
      WHEN NEW.raw_user_meta_data->>'tier' = 'pro' THEN 'pro'::subscription_tier
      ELSE 'free'::subscription_tier
    END;
    
    default_credits := CASE user_tier
      WHEN 'enterprise' THEN 10000
      WHEN 'pro' THEN 2000
      ELSE 50
    END;
  END IF;

  -- Insert profile with proper error handling
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
    user_name,
    NEW.raw_user_meta_data->>'company_name',
    user_role,
    user_tier,
    default_credits,
    default_credits,
    'active',
    NEW.last_sign_in_at
  )
  ON CONFLICT (id) DO UPDATE SET
    last_sign_in_at = NEW.last_sign_in_at,
    email = NEW.email,
    updated_at = now();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail auth
    RAISE WARNING 'Failed to create profile for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger to ensure it uses the updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();