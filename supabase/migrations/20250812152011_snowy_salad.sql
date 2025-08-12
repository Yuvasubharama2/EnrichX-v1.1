/*
  # Fresh Database Schema for EnrichX Platform

  This migration creates a complete database schema that aligns with the frontend:

  1. Custom Types
     - subscription_tier enum (free, pro, enterprise)

  2. Core Tables
     - profiles: User profile data with subscription and credit management
     - companies: Company database with tier-based visibility
     - contacts: Contact database linked to companies with tier-based visibility

  3. Security
     - Row Level Security (RLS) enabled on all tables
     - Comprehensive policies for different user roles and tiers
     - Admin access controls

  4. Functions & Triggers
     - Automatic profile creation on user signup
     - Credit limit management based on subscription tier
     - User metadata synchronization
*/

-- Create custom types
CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'enterprise');

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  email text,
  name text,
  full_name text,
  company_name text,
  role text DEFAULT 'subscriber',
  subscription_tier subscription_tier DEFAULT 'free',
  subscription_status text DEFAULT 'active',
  credits_remaining integer DEFAULT 50,
  credits_monthly_limit integer DEFAULT 50,
  billing_cycle_start timestamptz,
  billing_cycle_end timestamptz,
  last_sign_in_at timestamptz,
  email_verified boolean DEFAULT false,
  phone_verified boolean DEFAULT false,
  phone text,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  company_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  company_type text DEFAULT 'Private',
  industry text DEFAULT '',
  website text,
  linkedin_url text,
  hq_location text DEFAULT '',
  location_city text DEFAULT '',
  location_state text DEFAULT '',
  location_region text DEFAULT '',
  size_range text DEFAULT '',
  headcount integer,
  revenue text,
  phone_number text,
  company_keywords text[] DEFAULT '{}',
  industry_keywords text[] DEFAULT '{}',
  technologies_used text[] DEFAULT '{}',
  visible_to_tiers subscription_tier[] DEFAULT ARRAY['free'::subscription_tier],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
  contact_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  linkedin_url text,
  job_title text NOT NULL,
  company_id uuid REFERENCES companies(company_id) ON DELETE CASCADE,
  company_name text,
  company_website text,
  department text,
  start_date date,
  email text,
  email_score integer CHECK (email_score >= 0 AND email_score <= 100),
  phone_number text,
  location_city text DEFAULT '',
  location_state text DEFAULT '',
  location_region text DEFAULT '',
  visible_to_tiers subscription_tier[] DEFAULT ARRAY['free'::subscription_tier],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);

CREATE INDEX IF NOT EXISTS idx_companies_company_name ON companies(company_name);
CREATE INDEX IF NOT EXISTS idx_companies_website ON companies(website);
CREATE INDEX IF NOT EXISTS idx_companies_visible_to_tiers ON companies USING gin(visible_to_tiers);

CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name);
CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_company_website ON contacts(company_website);
CREATE INDEX IF NOT EXISTS idx_contacts_department ON contacts(department);
CREATE INDEX IF NOT EXISTS idx_contacts_visible_to_tiers ON contacts USING gin(visible_to_tiers);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR role = 'admin')
  );
$$;

-- Helper function for hierarchical tier access
CREATE OR REPLACE FUNCTION user_has_hierarchical_tier_access(required_tiers subscription_tier[])
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND (
      is_admin = true OR
      subscription_tier = ANY(required_tiers) OR
      (subscription_tier = 'enterprise' AND ('pro' = ANY(required_tiers) OR 'free' = ANY(required_tiers))) OR
      (subscription_tier = 'pro' AND 'free' = ANY(required_tiers))
    )
  );
$$;

-- Function to update credits monthly limit based on subscription tier
CREATE OR REPLACE FUNCTION update_credits_monthly_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update credits_monthly_limit based on subscription_tier
  CASE NEW.subscription_tier
    WHEN 'enterprise' THEN
      NEW.credits_monthly_limit := 10000;
      -- Reset credits to full amount when upgrading
      IF OLD.subscription_tier IS DISTINCT FROM NEW.subscription_tier THEN
        NEW.credits_remaining := 10000;
      END IF;
    WHEN 'pro' THEN
      NEW.credits_monthly_limit := 2000;
      -- Reset credits to full amount when upgrading
      IF OLD.subscription_tier IS DISTINCT FROM NEW.subscription_tier THEN
        NEW.credits_remaining := 2000;
      END IF;
    WHEN 'free' THEN
      NEW.credits_monthly_limit := 50;
      -- Reset credits to full amount when upgrading
      IF OLD.subscription_tier IS DISTINCT FROM NEW.subscription_tier THEN
        NEW.credits_remaining := 50;
      END IF;
  END CASE;
  
  RETURN NEW;
END;
$$;

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_metadata jsonb;
  default_credits integer;
BEGIN
  user_metadata := NEW.raw_user_meta_data;
  
  -- Determine default credits based on subscription tier
  CASE COALESCE(user_metadata->>'subscription_tier', 'free')
    WHEN 'enterprise' THEN default_credits := 10000;
    WHEN 'pro' THEN default_credits := 2000;
    ELSE default_credits := 50;
  END CASE;

  -- Insert profile for new user
  INSERT INTO profiles (
    user_id,
    email,
    name,
    full_name,
    company_name,
    role,
    subscription_tier,
    subscription_status,
    credits_remaining,
    credits_monthly_limit,
    is_admin,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(user_metadata->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(user_metadata->>'name', split_part(NEW.email, '@', 1)),
    user_metadata->>'company_name',
    CASE 
      WHEN NEW.email = 'admin@enrichx.com' THEN 'admin'
      ELSE COALESCE(user_metadata->>'role', 'subscriber')
    END,
    COALESCE((user_metadata->>'subscription_tier')::subscription_tier, 'free'::subscription_tier),
    COALESCE(user_metadata->>'subscription_status', 'active'),
    default_credits,
    default_credits,
    CASE WHEN NEW.email = 'admin@enrichx.com' THEN true ELSE false END,
    now(),
    now()
  );

  RETURN NEW;
END;
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Function to manually create user profile (for edge cases)
CREATE OR REPLACE FUNCTION create_user_profile_manual(
  user_id uuid,
  user_email text,
  user_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  default_credits integer;
BEGIN
  -- Determine default credits based on subscription tier
  CASE COALESCE(user_metadata->>'subscription_tier', 'free')
    WHEN 'enterprise' THEN default_credits := 10000;
    WHEN 'pro' THEN default_credits := 2000;
    ELSE default_credits := 50;
  END CASE;

  -- Insert or update profile
  INSERT INTO profiles (
    user_id,
    email,
    name,
    full_name,
    company_name,
    role,
    subscription_tier,
    subscription_status,
    credits_remaining,
    credits_monthly_limit,
    is_admin,
    created_at,
    updated_at
  ) VALUES (
    user_id,
    user_email,
    COALESCE(user_metadata->>'name', split_part(user_email, '@', 1)),
    COALESCE(user_metadata->>'name', split_part(user_email, '@', 1)),
    user_metadata->>'company_name',
    CASE 
      WHEN user_email = 'admin@enrichx.com' THEN 'admin'
      ELSE COALESCE(user_metadata->>'role', 'subscriber')
    END,
    COALESCE((user_metadata->>'subscription_tier')::subscription_tier, 'free'::subscription_tier),
    COALESCE(user_metadata->>'subscription_status', 'active'),
    default_credits,
    default_credits,
    CASE WHEN user_email = 'admin@enrichx.com' THEN true ELSE false END,
    now(),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    name = EXCLUDED.name,
    full_name = EXCLUDED.full_name,
    company_name = EXCLUDED.company_name,
    role = EXCLUDED.role,
    subscription_tier = EXCLUDED.subscription_tier,
    subscription_status = EXCLUDED.subscription_status,
    credits_remaining = EXCLUDED.credits_remaining,
    credits_monthly_limit = EXCLUDED.credits_monthly_limit,
    is_admin = EXCLUDED.is_admin,
    updated_at = now();
END;
$$;

-- Create triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER update_credits_monthly_limit_trigger
  BEFORE INSERT OR UPDATE OF subscription_tier ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_credits_monthly_limit();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Profiles RLS Policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR is_admin())
  WITH CHECK (user_id = auth.uid() OR is_admin());

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR is_admin());

CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Service role full access to profiles"
  ON profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Companies RLS Policies
CREATE POLICY "Users can view companies based on tier access"
  ON companies FOR SELECT
  TO authenticated
  USING (user_has_hierarchical_tier_access(visible_to_tiers) OR is_admin());

CREATE POLICY "Authenticated users can insert companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update companies"
  ON companies FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete companies"
  ON companies FOR DELETE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Service role full access to companies"
  ON companies FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Contacts RLS Policies
CREATE POLICY "Users can view contacts based on tier access"
  ON contacts FOR SELECT
  TO authenticated
  USING (user_has_hierarchical_tier_access(visible_to_tiers) OR is_admin());

CREATE POLICY "Authenticated users can insert contacts"
  ON contacts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update contacts"
  ON contacts FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete contacts"
  ON contacts FOR DELETE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Service role full access to contacts"
  ON contacts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create admin dashboard view
CREATE OR REPLACE VIEW admin_dashboard
WITH (security_invoker = true)
AS
SELECT 
  p.id,
  p.user_id,
  p.email,
  p.name,
  p.company_name,
  p.role,
  p.subscription_tier,
  p.credits_remaining,
  p.credits_monthly_limit,
  p.subscription_status,
  p.created_at,
  p.updated_at,
  p.is_admin,
  p.last_sign_in_at,
  u.confirmed_at,
  u.email_confirmed_at,
  u.banned_until,
  u.raw_user_meta_data
FROM profiles p
LEFT JOIN auth.users u ON p.user_id = u.id
WHERE is_admin();

-- Create admin user management view
CREATE OR REPLACE VIEW admin_user_management
WITH (security_invoker = true)
AS
SELECT 
  p.id,
  p.user_id,
  p.email,
  p.name,
  p.full_name,
  p.company_name,
  p.role,
  p.subscription_tier,
  p.subscription_status,
  p.credits_remaining,
  p.credits_monthly_limit,
  p.created_at,
  p.updated_at,
  p.last_sign_in_at,
  p.email_verified,
  p.phone_verified,
  p.phone,
  p.is_admin,
  u.banned_until,
  u.email_confirmed_at,
  u.confirmed_at,
  u.raw_user_meta_data
FROM profiles p
LEFT JOIN auth.users u ON p.user_id = u.id;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- Insert admin user profile if it doesn't exist
DO $$
BEGIN
  -- Check if admin user exists in auth.users
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@enrichx.com') THEN
    -- Get the admin user ID
    INSERT INTO profiles (
      user_id,
      email,
      name,
      full_name,
      company_name,
      role,
      subscription_tier,
      subscription_status,
      credits_remaining,
      credits_monthly_limit,
      is_admin,
      created_at,
      updated_at
    )
    SELECT 
      id,
      'admin@enrichx.com',
      'Admin User',
      'Admin User',
      'EnrichX',
      'admin',
      'enterprise'::subscription_tier,
      'active',
      10000,
      10000,
      true,
      now(),
      now()
    FROM auth.users 
    WHERE email = 'admin@enrichx.com'
    ON CONFLICT (user_id) DO UPDATE SET
      role = 'admin',
      subscription_tier = 'enterprise'::subscription_tier,
      credits_remaining = 10000,
      credits_monthly_limit = 10000,
      is_admin = true,
      updated_at = now();
  END IF;
END $$;