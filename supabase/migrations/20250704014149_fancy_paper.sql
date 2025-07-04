/*
  # Clean Database and Restart Authentication Logic

  1. Clean Slate
    - Drop all existing tables, functions, triggers, and policies
    - Remove all custom types and schemas
    - Start completely fresh

  2. Core Tables
    - `companies` - Company data with tier-based visibility
    - `contacts` - Contact data linked to companies
    - `profiles` - User profiles synced with auth.users

  3. Authentication Flow
    - Simple trigger for profile creation
    - Proper permissions for auth operations
    - Clean RLS policies

  4. Security
    - Tier-based access control
    - Admin privileges
    - Proper auth integration
*/

-- ============================================================================
-- STEP 1: CLEAN SLATE - Remove everything
-- ============================================================================

-- Drop all existing triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS sync_profile_to_auth_trigger ON profiles;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;

-- Drop all existing functions
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS sync_profile_to_auth() CASCADE;
DROP FUNCTION IF EXISTS create_user_profile(uuid, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop all existing tables (this will also drop all policies)
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop custom types
DROP TYPE IF EXISTS subscription_tier CASCADE;

-- ============================================================================
-- STEP 2: CREATE CORE TYPES AND FUNCTIONS
-- ============================================================================

-- Create subscription tier enum
CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'enterprise');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 3: CREATE CORE TABLES
-- ============================================================================

-- Create profiles table (linked to auth.users)
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

-- Create companies table
CREATE TABLE companies (
  company_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  company_type text NOT NULL DEFAULT 'Private',
  industry text NOT NULL DEFAULT 'Technology',
  website text,
  linkedin_url text,
  hq_location text NOT NULL DEFAULT '',
  location_city text NOT NULL DEFAULT '',
  location_state text NOT NULL DEFAULT '',
  location_region text NOT NULL DEFAULT 'North America',
  size_range text NOT NULL DEFAULT '1-50',
  headcount integer,
  revenue text,
  phone_number text,
  company_keywords text[] DEFAULT '{}',
  industry_keywords text[] DEFAULT '{}',
  technologies_used text[] DEFAULT '{}',
  visible_to_tiers subscription_tier[] NOT NULL DEFAULT ARRAY['free']::subscription_tier[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create contacts table
CREATE TABLE contacts (
  contact_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  linkedin_url text,
  job_title text NOT NULL,
  company_id uuid NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  start_date date,
  email text,
  email_score integer CHECK (email_score >= 0 AND email_score <= 100),
  phone_number text,
  location_city text NOT NULL DEFAULT '',
  location_state text NOT NULL DEFAULT '',
  location_region text NOT NULL DEFAULT 'North America',
  company_website text,
  department text,
  visible_to_tiers subscription_tier[] NOT NULL DEFAULT ARRAY['free']::subscription_tier[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- STEP 4: CREATE INDEXES
-- ============================================================================

-- Profiles indexes
CREATE INDEX idx_profiles_email ON profiles (email);
CREATE INDEX idx_profiles_role ON profiles (role);
CREATE INDEX idx_profiles_subscription_tier ON profiles (subscription_tier);

-- Companies indexes
CREATE INDEX idx_companies_company_name ON companies (company_name);
CREATE INDEX idx_companies_visible_to_tiers ON companies USING GIN (visible_to_tiers);
CREATE INDEX idx_companies_industry ON companies (industry);
CREATE INDEX idx_companies_location_city ON companies (location_city);
CREATE INDEX idx_companies_location_state ON companies (location_state);

-- Contacts indexes
CREATE INDEX idx_contacts_name ON contacts (name);
CREATE INDEX idx_contacts_company_id ON contacts (company_id);
CREATE INDEX idx_contacts_visible_to_tiers ON contacts USING GIN (visible_to_tiers);
CREATE INDEX idx_contacts_job_title ON contacts (job_title);
CREATE INDEX idx_contacts_location_city ON contacts (location_city);
CREATE INDEX idx_contacts_location_state ON contacts (location_state);

-- ============================================================================
-- STEP 5: CREATE TRIGGERS
-- ============================================================================

-- Updated at triggers
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at 
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at 
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 6: ENABLE RLS AND CREATE POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Profiles policies
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

-- Companies policies
CREATE POLICY "Users can read companies by tier" ON companies
  FOR SELECT TO authenticated
  USING (
    -- Admin can read all
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR
    -- Users can read based on their tier
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND subscription_tier = ANY(visible_to_tiers)
    )
  );

CREATE POLICY "Admins can manage all companies" ON companies
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Service role full access to companies" ON companies
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Contacts policies
CREATE POLICY "Users can read contacts by tier" ON contacts
  FOR SELECT TO authenticated
  USING (
    -- Admin can read all
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR
    -- Users can read based on their tier
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND subscription_tier = ANY(visible_to_tiers)
    )
  );

CREATE POLICY "Admins can manage all contacts" ON contacts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Service role full access to contacts" ON contacts
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- STEP 7: CREATE AUTHENTICATION FUNCTIONS
-- ============================================================================

-- Simple profile creation function
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
      split_part(NEW.email, '@', 1)
    );
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'subscriber');
    user_tier := COALESCE(
      (NEW.raw_user_meta_data->>'subscription_tier')::subscription_tier,
      'free'
    );
    default_credits := CASE user_tier
      WHEN 'enterprise' THEN 10000
      WHEN 'pro' THEN 2000
      ELSE 50
    END;
  END IF;


  -- Insert profile
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
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail auth
    RAISE WARNING 'Failed to create profile for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profile sync function
CREATE OR REPLACE FUNCTION sync_profile_to_auth()
RETURNS TRIGGER AS $$
BEGIN
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

-- ============================================================================
-- STEP 8: GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions to auth admin
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON public.profiles TO supabase_auth_admin;
GRANT ALL ON public.companies TO supabase_auth_admin;
GRANT ALL ON public.contacts TO supabase_auth_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO supabase_auth_admin;

-- ============================================================================
-- STEP 9: CREATE TRIGGERS
-- ============================================================================

-- Auth trigger for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Profile sync trigger
CREATE TRIGGER sync_profile_to_auth_trigger
  AFTER UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION sync_profile_to_auth();

-- ============================================================================
-- STEP 10: INSERT SAMPLE DATA
-- ============================================================================

-- Insert sample companies
INSERT INTO companies (
  company_name, company_type, industry, website, linkedin_url, 
  hq_location, location_city, location_state, location_region, 
  size_range, headcount, revenue, company_keywords, industry_keywords, 
  technologies_used, visible_to_tiers
) VALUES
(
  'TechCorp Inc.', 'Private', 'Software', 'https://techcorp.com', 
  'https://linkedin.com/company/techcorp', 'San Francisco, CA', 
  'San Francisco', 'CA', 'North America', '201-500', 350, '$50M-$100M',
  ARRAY['SaaS', 'B2B', 'Enterprise'], ARRAY['Software', 'Technology'], 
  ARRAY['React', 'Node.js', 'AWS'], ARRAY['free', 'pro', 'enterprise']::subscription_tier[]
),
(
  'FinancePlus', 'Public', 'Financial Services', 'https://financeplus.com', 
  'https://linkedin.com/company/financeplus', 'New York, NY', 
  'New York', 'NY', 'North America', '1001-5000', 2500, '$500M+',
  ARRAY['Fintech', 'Banking', 'Investment'], ARRAY['Finance', 'Banking'], 
  ARRAY['Java', 'Oracle', 'Salesforce'], ARRAY['pro', 'enterprise']::subscription_tier[]
),
(
  'HealthTech Solutions', 'Private', 'Healthcare', 'https://healthtech.com', 
  'https://linkedin.com/company/healthtech', 'Boston, MA', 
  'Boston', 'MA', 'North America', '51-200', 150, '$10M-$50M',
  ARRAY['HealthTech', 'Medical', 'AI'], ARRAY['Healthcare', 'Technology'], 
  ARRAY['Python', 'TensorFlow', 'AWS'], ARRAY['enterprise']::subscription_tier[]
);

-- Insert sample contacts
INSERT INTO contacts (
  name, linkedin_url, job_title, company_id, email, email_score, 
  phone_number, location_city, location_state, location_region, 
  department, visible_to_tiers
) VALUES
(
  'Sarah Johnson', 'https://linkedin.com/in/sarahjohnson', 'VP of Engineering', 
  (SELECT company_id FROM companies WHERE company_name = 'TechCorp Inc.'), 
  'sarah.johnson@techcorp.com', 95, '+1 (555) 123-4567', 
  'San Francisco', 'CA', 'North America', 'Engineering',
  ARRAY['free', 'pro', 'enterprise']::subscription_tier[]
),
(
  'Michael Chen', 'https://linkedin.com/in/michaelchen', 'Head of Sales', 
  (SELECT company_id FROM companies WHERE company_name = 'FinancePlus'), 
  'michael.chen@financeplus.com', 88, '+1 (555) 987-6543', 
  'New York', 'NY', 'North America', 'Sales',
  ARRAY['pro', 'enterprise']::subscription_tier[]
),
(
  'Dr. Emily Rodriguez', 'https://linkedin.com/in/emilyrodriguez', 'Chief Medical Officer', 
  (SELECT company_id FROM companies WHERE company_name = 'HealthTech Solutions'), 
  'emily.rodriguez@healthtech.com', 92, '+1 (555) 456-7890', 
  'Boston', 'MA', 'North America', 'Medical',
  ARRAY['enterprise']::subscription_tier[]
);

-- ============================================================================
-- STEP 11: CREATE ADMIN USER PROFILE IF EXISTS
-- ============================================================================

-- Create admin profile if admin user exists in auth.users
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Check if admin user exists
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'admin@enrichx.com' 
  LIMIT 1;
  
  -- If admin user exists, ensure their profile exists
  IF admin_user_id IS NOT NULL THEN
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
  END IF;
END $$;