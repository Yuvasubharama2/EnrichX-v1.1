/*
  # Clear All Existing Tables and Data

  This migration will:
  1. Drop all existing tables and their dependencies
  2. Drop all custom types
  3. Drop all functions and triggers
  4. Clean slate for fresh migration
*/

-- Drop all existing tables in correct order (respecting foreign key dependencies)
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop all views
DROP VIEW IF EXISTS admin_dashboard CASCADE;
DROP VIEW IF EXISTS admin_user_management CASCADE;

-- Drop all custom types
DROP TYPE IF EXISTS subscription_tier CASCADE;

-- Drop all custom functions
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS sync_profile_to_auth() CASCADE;
DROP FUNCTION IF EXISTS handle_user_update() CASCADE;
DROP FUNCTION IF EXISTS handle_user_login() CASCADE;
DROP FUNCTION IF EXISTS log_new_user() CASCADE;
DROP FUNCTION IF EXISTS handle_auth_user_login() CASCADE;
DROP FUNCTION IF EXISTS handle_user_auth() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_credits_monthly_limit() CASCADE;
DROP FUNCTION IF EXISTS create_profile() CASCADE;
DROP FUNCTION IF EXISTS sync_admin_status() CASCADE;
DROP FUNCTION IF EXISTS update_profile_on_login() CASCADE;
DROP FUNCTION IF EXISTS update_user_metadata() CASCADE;
DROP FUNCTION IF EXISTS is_admin() CASCADE;
DROP FUNCTION IF EXISTS user_has_hierarchical_tier_access(subscription_tier[]) CASCADE;
DROP FUNCTION IF EXISTS create_user_profile_manual(uuid, text, jsonb) CASCADE;

-- Clean up any remaining objects
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role;