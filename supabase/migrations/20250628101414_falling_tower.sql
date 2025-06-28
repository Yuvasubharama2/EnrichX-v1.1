/*
  # Fix RLS Policies for CSV Upload

  1. Updates
    - Drop existing RLS policies
    - Create new policies that properly handle admin access
    - Ensure CSV uploads work for admin users
    - Maintain tier-based access for regular users

  2. Security
    - Admin users can insert/update/delete all data
    - Regular users can only read data based on their tier
    - Proper JWT token handling for user metadata
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read companies based on their tier" ON companies;
DROP POLICY IF EXISTS "Admins can manage all companies" ON companies;
DROP POLICY IF EXISTS "Users can read contacts based on their tier" ON contacts;
DROP POLICY IF EXISTS "Admins can manage all contacts" ON contacts;

-- Create new policies for companies table

-- Allow admins full access to companies
CREATE POLICY "Admins have full access to companies" ON companies
  FOR ALL
  TO authenticated
  USING (
    COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin',
      false
    )
  )
  WITH CHECK (
    COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin',
      false
    )
  );

-- Allow users to read companies based on their tier
CREATE POLICY "Users can read companies by tier" ON companies
  FOR SELECT
  TO authenticated
  USING (
    -- Admin can read all
    COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin',
      false
    )
    OR
    -- Users can read based on their tier
    COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'subscription_tier')::subscription_tier = ANY(visible_to_tiers),
      'free'::subscription_tier = ANY(visible_to_tiers)
    )
  );

-- Create new policies for contacts table

-- Allow admins full access to contacts
CREATE POLICY "Admins have full access to contacts" ON contacts
  FOR ALL
  TO authenticated
  USING (
    COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin',
      false
    )
  )
  WITH CHECK (
    COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin',
      false
    )
  );

-- Allow users to read contacts based on their tier
CREATE POLICY "Users can read contacts by tier" ON contacts
  FOR SELECT
  TO authenticated
  USING (
    -- Admin can read all
    COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin',
      false
    )
    OR
    -- Users can read based on their tier
    COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'subscription_tier')::subscription_tier = ANY(visible_to_tiers),
      'free'::subscription_tier = ANY(visible_to_tiers)
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_companies_visible_to_tiers ON companies USING GIN (visible_to_tiers);
CREATE INDEX IF NOT EXISTS idx_contacts_visible_to_tiers ON contacts USING GIN (visible_to_tiers);
CREATE INDEX IF NOT EXISTS idx_companies_company_name ON companies (company_name);
CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts (name);
CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts (company_id);