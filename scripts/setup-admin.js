import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pmvqrzillkzmpctjsgjo.supabase.co';
const supabaseServiceKey = 'YOUR_SERVICE_ROLE_KEY_HERE'; // You'll need to get this from your Supabase dashboard

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