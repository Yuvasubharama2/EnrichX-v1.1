import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pmvqrzillkzmpctjsgjo.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtdnFyemlsbGt6bXBjdGpzZ2pvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTEwMTk5NywiZXhwIjoyMDY2Njc3OTk3fQ.ocU3VD6wbpFGkELdWTBB_B8nEsFV1NX7kdK5Q9NS7O0';

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
      password: 'Yuva8856@',
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
    console.log('🔑 Password: Yuva8856@');
    console.log('👤 Role: admin');
    console.log('💎 Tier: enterprise');
    
  } catch (error) {
    console.error('Setup failed:', error);
  }
}

createAdminAccount();