/*
  # Initial Schema Setup for EnrichX

  1. New Tables
    - `companies`
      - `company_id` (uuid, primary key)
      - `company_name` (text, required)
      - `company_type` (text)
      - `industry` (text)
      - `website` (text, optional)
      - `linkedin_url` (text, optional)
      - `hq_location` (text)
      - `location_city` (text)
      - `location_state` (text)
      - `location_region` (text)
      - `size_range` (text)
      - `headcount` (integer, optional)
      - `revenue` (text, optional)
      - `phone_number` (text, optional)
      - `company_keywords` (text array)
      - `industry_keywords` (text array)
      - `technologies_used` (text array)
      - `visible_to_tiers` (subscription_tier array)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `contacts`
      - `contact_id` (uuid, primary key)
      - `name` (text, required)
      - `linkedin_url` (text, optional)
      - `job_title` (text, required)
      - `company_id` (uuid, foreign key)
      - `start_date` (date, optional)
      - `email` (text, optional)
      - `email_score` (integer, optional)
      - `phone_number` (text, optional)
      - `location_city` (text)
      - `location_state` (text)
      - `location_region` (text)
      - `visible_to_tiers` (subscription_tier array)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for tier-based access
    - Add admin policies for full access
*/

-- Create subscription tier enum
CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'enterprise');

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
  visible_to_tiers subscription_tier[] DEFAULT ARRAY['free']::subscription_tier[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
  contact_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  linkedin_url text,
  job_title text NOT NULL,
  company_id uuid REFERENCES companies(company_id) ON DELETE CASCADE,
  start_date date,
  email text,
  email_score integer CHECK (email_score >= 0 AND email_score <= 100),
  phone_number text,
  location_city text DEFAULT '',
  location_state text DEFAULT '',
  location_region text DEFAULT '',
  visible_to_tiers subscription_tier[] DEFAULT ARRAY['free']::subscription_tier[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for companies
CREATE POLICY "Users can read companies based on their tier" ON companies
  FOR SELECT
  TO authenticated
  USING (
    CASE 
      WHEN auth.jwt() ->> 'user_metadata' IS NOT NULL THEN
        (auth.jwt() -> 'user_metadata' ->> 'subscription_tier')::subscription_tier = ANY(visible_to_tiers)
      ELSE
        'free'::subscription_tier = ANY(visible_to_tiers)
    END
  );

CREATE POLICY "Admins can manage all companies" ON companies
  FOR ALL
  TO authenticated
  USING (
    CASE 
      WHEN auth.jwt() ->> 'user_metadata' IS NOT NULL THEN
        auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'
      ELSE
        false
    END
  );

-- RLS Policies for contacts
CREATE POLICY "Users can read contacts based on their tier" ON contacts
  FOR SELECT
  TO authenticated
  USING (
    CASE 
      WHEN auth.jwt() ->> 'user_metadata' IS NOT NULL THEN
        (auth.jwt() -> 'user_metadata' ->> 'subscription_tier')::subscription_tier = ANY(visible_to_tiers)
      ELSE
        'free'::subscription_tier = ANY(visible_to_tiers)
    END
  );

CREATE POLICY "Admins can manage all contacts" ON contacts
  FOR ALL
  TO authenticated
  USING (
    CASE 
      WHEN auth.jwt() ->> 'user_metadata' IS NOT NULL THEN
        auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'
      ELSE
        false
    END
  );

-- Insert sample data
INSERT INTO companies (company_name, company_type, industry, website, linkedin_url, hq_location, location_city, location_state, location_region, size_range, headcount, revenue, company_keywords, industry_keywords, technologies_used, visible_to_tiers) VALUES
('TechCorp Inc.', 'Private', 'Software', 'https://techcorp.com', 'https://linkedin.com/company/techcorp', 'San Francisco, CA', 'San Francisco', 'CA', 'North America', '201-500', 350, '$50M-$100M', ARRAY['SaaS', 'B2B', 'Enterprise'], ARRAY['Software', 'Technology'], ARRAY['React', 'Node.js', 'AWS'], ARRAY['free', 'pro', 'enterprise']::subscription_tier[]),
('FinancePlus', 'Public', 'Financial Services', 'https://financeplus.com', 'https://linkedin.com/company/financeplus', 'New York, NY', 'New York', 'NY', 'North America', '1001-5000', 2500, '$500M+', ARRAY['Fintech', 'Banking', 'Investment'], ARRAY['Finance', 'Banking'], ARRAY['Java', 'Oracle', 'Salesforce'], ARRAY['pro', 'enterprise']::subscription_tier[]),
('HealthTech Solutions', 'Private', 'Healthcare', 'https://healthtech.com', 'https://linkedin.com/company/healthtech', 'Boston, MA', 'Boston', 'MA', 'North America', '51-200', 150, '$10M-$50M', ARRAY['HealthTech', 'Medical', 'AI'], ARRAY['Healthcare', 'Technology'], ARRAY['Python', 'TensorFlow', 'AWS'], ARRAY['enterprise']::subscription_tier[]);

INSERT INTO contacts (name, linkedin_url, job_title, company_id, email, email_score, phone_number, location_city, location_state, location_region, visible_to_tiers) VALUES
('Sarah Johnson', 'https://linkedin.com/in/sarahjohnson', 'VP of Engineering', (SELECT company_id FROM companies WHERE company_name = 'TechCorp Inc.'), 'sarah.johnson@techcorp.com', 95, '+1 (555) 123-4567', 'San Francisco', 'CA', 'North America', ARRAY['free', 'pro', 'enterprise']::subscription_tier[]),
('Michael Chen', 'https://linkedin.com/in/michaelchen', 'Head of Sales', (SELECT company_id FROM companies WHERE company_name = 'FinancePlus'), 'michael.chen@financeplus.com', 88, '+1 (555) 987-6543', 'New York', 'NY', 'North America', ARRAY['pro', 'enterprise']::subscription_tier[]),
('Dr. Emily Rodriguez', 'https://linkedin.com/in/emilyrodriguez', 'Chief Medical Officer', (SELECT company_id FROM companies WHERE company_name = 'HealthTech Solutions'), 'emily.rodriguez@healthtech.com', 92, '+1 (555) 456-7890', 'Boston', 'MA', 'North America', ARRAY['enterprise']::subscription_tier[]);