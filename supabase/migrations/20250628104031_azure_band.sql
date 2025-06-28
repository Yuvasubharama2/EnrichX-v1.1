/*
  # Fix Admin Insert Policies

  1. Policy Updates
    - Add specific admin insert policies for companies and contacts
    - Ensure admin users can insert data regardless of RLS restrictions
    - Add fallback policies for authenticated users

  2. Security
    - Maintain existing read policies
    - Allow admins to insert data for CSV uploads
    - Ensure proper access control
*/

-- Drop existing insert policies to recreate them
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON companies;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON contacts;
DROP POLICY IF EXISTS "Allow service role insert" ON companies;
DROP POLICY IF EXISTS "Allow service role insert" ON contacts;

-- Create comprehensive insert policies for companies
CREATE POLICY "Admin can insert companies" ON companies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if user is admin
    COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin',
      false
    )
    OR
    -- Allow if user email is admin@enrichx.com (fallback)
    COALESCE(
      auth.jwt() ->> 'email' = 'admin@enrichx.com',
      false
    )
  );

-- Create comprehensive insert policies for contacts
CREATE POLICY "Admin can insert contacts" ON contacts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if user is admin
    COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin',
      false
    )
    OR
    -- Allow if user email is admin@enrichx.com (fallback)
    COALESCE(
      auth.jwt() ->> 'email' = 'admin@enrichx.com',
      false
    )
  );

-- Service role policies (for backend operations)
CREATE POLICY "Service role can insert companies" ON companies
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can insert contacts" ON contacts
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Anon role policies (for public access if needed)
CREATE POLICY "Allow anon insert companies" ON companies
  FOR INSERT
  TO anon
  WITH CHECK (false); -- Disabled by default

CREATE POLICY "Allow anon insert contacts" ON contacts
  FOR INSERT
  TO anon
  WITH CHECK (false); -- Disabled by default