import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface UserData {
  id: string;
  email: string;
  name: string;
  company_name?: string;
  role: 'admin' | 'subscriber';
  subscription_tier: 'free' | 'pro' | 'enterprise';
  credits_remaining: number;
  credits_monthly_limit: number;
  subscription_status: 'active' | 'canceled' | 'past_due';
  created_at: string;
  last_sign_in_at?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Create regular client to verify the requesting user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Verify the user making the request
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if user is admin
    const isAdmin = user.email === 'admin@enrichx.com' || user.user_metadata?.role === 'admin';
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Access denied. Admin privileges required.' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const url = new URL(req.url);
    const method = req.method;

    if (method === 'GET') {
      // Fetch all users
      const { data: authUsers, error } = await supabaseAdmin.auth.admin.listUsers();
      
      if (error) {
        throw error;
      }

      const getDefaultCredits = (tier: string) => {
        switch (tier) {
          case 'enterprise': return 10000;
          case 'pro': return 2000;
          case 'free': return 50;
          default: return 50;
        }
      };

      const userData: UserData[] = authUsers.users.map(user => {
        const metadata = user.user_metadata || {};
        const isAdminUser = user.email === 'admin@enrichx.com';
        
        return {
          id: user.id,
          email: user.email || '',
          name: metadata.name || (isAdminUser ? 'Admin User' : user.email?.split('@')[0] || ''),
          company_name: metadata.company_name || '',
          role: isAdminUser ? 'admin' : (metadata.role || 'subscriber'),
          subscription_tier: isAdminUser ? 'enterprise' : (metadata.subscription_tier || 'free'),
          credits_remaining: metadata.credits_remaining || getDefaultCredits(isAdminUser ? 'enterprise' : (metadata.subscription_tier || 'free')),
          credits_monthly_limit: getDefaultCredits(isAdminUser ? 'enterprise' : (metadata.subscription_tier || 'free')),
          subscription_status: metadata.subscription_status || 'active',
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at
        };
      });

      return new Response(
        JSON.stringify({ users: userData }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (method === 'PUT') {
      // Update user
      const { userId, userData } = await req.json();
      
      if (!userId || !userData) {
        return new Response(
          JSON.stringify({ error: 'Missing userId or userData' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: userData
      });

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({ success: true }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (method === 'DELETE') {
      // Delete user
      const { userId } = await req.json();
      
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'Missing userId' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({ success: true }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in admin-users function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});