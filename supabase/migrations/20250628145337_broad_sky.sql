/*
  # Add new columns to contacts table

  1. New Columns
    - `company_website` (text, optional) - Company website URL for linking
    - `department` (text, optional) - Contact's department/division

  2. Changes
    - Add company_website column to contacts table
    - Add department column to contacts table
    - Create indexes for better performance
*/

-- Add new columns to contacts table
DO $$
BEGIN
  -- Add company_website column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contacts' AND column_name = 'company_website'
  ) THEN
    ALTER TABLE contacts ADD COLUMN company_website text;
  END IF;

  -- Add department column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contacts' AND column_name = 'department'
  ) THEN
    ALTER TABLE contacts ADD COLUMN department text;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contacts_company_website ON contacts (company_website);
CREATE INDEX IF NOT EXISTS idx_contacts_department ON contacts (department);
CREATE INDEX IF NOT EXISTS idx_companies_website ON companies (website);

-- Add comment to explain the new columns
COMMENT ON COLUMN contacts.company_website IS 'Company website URL used for smart company linking during CSV import';
COMMENT ON COLUMN contacts.department IS 'Department or division where the contact works';