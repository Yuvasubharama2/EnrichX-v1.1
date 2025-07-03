/*
  # Allow service role to update profiles table

  1. Security Policy
    - Grant UPDATE permissions to service_role for profiles table
    - This allows Supabase Auth to update last_sign_in_at and other fields during login

  2. Changes
    - Add RLS policy for service_role to update profiles
    - Ensures authentication process can complete successfully
*/

-- Allow service role to update profiles table
CREATE POLICY "Service role can update profiles" ON profiles 
  FOR UPDATE 
  TO service_role 
  USING (true);

-- Also allow service role to insert profiles (for user creation)
CREATE POLICY "Service role can insert profiles" ON profiles 
  FOR INSERT 
  TO service_role 
  WITH CHECK (true);