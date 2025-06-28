import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://inejpuwktglspygjgjlz.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZWpwdXdrdGdsc3B5Z2pnamx6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTA5MTY5OSwiZXhwIjoyMDY2NjY3Njk5fQ.your-service-key-here';

// Create admin client with service role
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminAccount() {
  try {
    console.log('Creating admin account...');
    
    // Create admin user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'admin@enrichx.com',
      password: 'admin123',
      email_confirm: true,
      user_metadata: {
        name: 'Admin User',
        role: 'admin',
        subscription_tier: 'enterprise',
        credits_remaining: 10000,
        credits_monthly_limit: 10000,
        subscription_status: 'active'
      }
    });

    if (authError) {
      console.error('Error creating admin user:', authError);
      return;
    }

    console.log('✅ Admin account created successfully!');
    console.log('📧 Email: admin@enrichx.com');
    console.log('🔑 Password: admin123');
    console.log('👤 Role: admin');
    console.log('💎 Tier: enterprise');
    
  } catch (error) {
    console.error('Setup failed:', error);
  }
}

createAdminAccount();