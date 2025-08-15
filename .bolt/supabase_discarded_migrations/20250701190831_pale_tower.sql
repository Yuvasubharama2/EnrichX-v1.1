/*
  # Create profiles table for user management

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique)
      - `name` (text)
      - `company_name` (text, optional)
      - `role` (text, default 'subscriber')
      - `subscription_tier` (subscription_tier enum)
      - `credits_remaining` (integer)
      - `credits_monthly_limit` (integer)
      - `subscription_status` (text)
      - `last_sign_in_at` (timestamp, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on profiles table
    - Add policies for user access and admin management
    - Create trigger to auto-create profile on user signup

  3. Functions
    - Function to handle new user signup
    - Trigger to automatically create profile when user signs up
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text,
  company_name text,
  role text DEFAULT 'subscriber' CHECK (role IN ('admin', 'subscriber')),
  subscription_tier subscription_tier DEFAULT 'free',
  credits_remaining integer DEFAULT 50,
  credits_monthly_limit integer DEFAULT 50,
  subscription_status text DEFAULT 'active' CHECK (subscription_status IN ('active', 'canceled', 'past_due')),
  last_sign_in_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger for profiles
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles" ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete profiles" ON profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_credits integer;
  user_tier subscription_tier;
  user_role text;
BEGIN
  -- Determine role and tier based on email
  IF NEW.email = 'admin@enrichx.com' THEN
    user_role := 'admin';
    user_tier := 'enterprise';
    default_credits := 10000;
  ELSE
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'subscriber');
    user_tier := COALESCE((NEW.raw_user_meta_data->>'subscription_tier')::subscription_tier, 'free');
    default_credits := CASE 
      WHEN user_tier = 'enterprise' THEN 10000
      WHEN user_tier = 'pro' THEN 2000
      ELSE 50
    END;
  END IF;

  -- Insert profile
  INSERT INTO profiles (
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to sync profile updates with auth metadata
CREATE OR REPLACE FUNCTION sync_profile_to_auth()
RETURNS TRIGGER AS $$
BEGIN
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

-- Create trigger to sync profile updates to auth
DROP TRIGGER IF EXISTS sync_profile_to_auth_trigger ON profiles;
CREATE TRIGGER sync_profile_to_auth_trigger
  AFTER UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION sync_profile_to_auth();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles (subscription_tier);

-- Insert admin profile if it doesn't exist
INSERT INTO profiles (
  id,
  email,
  name,
  role,
  subscription_tier,
  credits_remaining,
  credits_monthly_limit,
  subscription_status
) 
SELECT 
  id,
  email,
  'Admin User',
  'admin',
  'enterprise',
  10000,
  10000,
  'active'
FROM auth.users 
WHERE email = 'admin@enrichx.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  subscription_tier = 'enterprise',
  credits_remaining = 10000,
  credits_monthly_limit = 10000;