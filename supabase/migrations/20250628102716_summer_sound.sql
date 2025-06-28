/*
  # Add Insert Policies for Companies and Contacts

  1. New Policies
    - Allow authenticated users to insert companies
    - Allow authenticated users to insert contacts
    - Ensure admins can insert without restrictions

  2. Security
    - Maintain existing RLS policies
    - Add specific insert permissions for CSV uploads
*/

-- Add insert policy for companies table
CREATE POLICY "Allow insert for authenticated users" ON companies
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add insert policy for contacts table  
CREATE POLICY "Allow insert for authenticated users" ON contacts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Ensure service role can also insert (for admin operations)
CREATE POLICY "Allow service role insert" ON companies
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Allow service role insert" ON contacts
  FOR INSERT
  TO service_role
  WITH CHECK (true);