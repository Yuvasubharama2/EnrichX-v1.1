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
  banned_until?: string | null;
}

interface UserStats {
  total_users: number;
  active_users: number;
  banned_users: number;
  free_tier_users: number;
  pro_tier_users: number;
  enterprise_tier_users: number;
  total_credits_used: number;
  new_users_this_month: number;
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
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = user.email === 'admin@enrichx.com' || profile?.role === 'admin';
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
    const pathSegments = url.pathname.split('/').filter(Boolean);

    // Route: GET /admin-user-management/stats
    if (method === 'GET' && pathSegments[pathSegments.length - 1] === 'stats') {
      const stats = await getAdminUserStats(supabaseAdmin);
      return new Response(
        JSON.stringify(stats),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Route: GET /admin-user-management/users
    if (method === 'GET' && pathSegments[pathSegments.length - 1] === 'users') {
      const page = parseInt(url.searchParams.get('page') || '1');
      const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
      const search = url.searchParams.get('search') || '';
      const sortBy = url.searchParams.get('sortBy') || 'created_at';
      const sortOrder = url.searchParams.get('sortOrder') || 'desc';

      const users = await listUsers(supabaseAdmin, { page, pageSize, search, sortBy, sortOrder });
      return new Response(
        JSON.stringify(users),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Route: GET /admin-user-management/users/[user_id]
    if (method === 'GET' && pathSegments.length >= 3 && pathSegments[pathSegments.length - 2] === 'users') {
      const userId = pathSegments[pathSegments.length - 1];
      const userDetails = await getUserDetails(supabaseAdmin, userId);
      
      if (!userDetails) {
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      return new Response(
        JSON.stringify(userDetails),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Route: PUT /admin-user-management/users/[user_id]
    if (method === 'PUT' && pathSegments.length >= 3 && pathSegments[pathSegments.length - 2] === 'users') {
      const userId = pathSegments[pathSegments.length - 1];
      const updateData = await req.json();
      
      const result = await updateUser(supabaseAdmin, userId, updateData);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Route: POST /admin-user-management/users/[user_id]/ban
    if (method === 'POST' && pathSegments.length >= 4 && pathSegments[pathSegments.length - 1] === 'ban') {
      const userId = pathSegments[pathSegments.length - 2];
      const banData = await req.json();
      
      const result = await banUser(supabaseAdmin, userId, banData.banUntil);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Route not found' }),
      { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in admin-user-management function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function getAdminUserStats(supabase: any): Promise<UserStats> {
  try {
    // Get all users from auth.users
    const { data: authUsers, error } = await supabase.auth.admin.listUsers();
    if (error) throw error;

    // Get profiles data
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    
    if (profilesError) throw profilesError;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats: UserStats = {
      total_users: authUsers.users.length,
      active_users: authUsers.users.filter(u => !u.banned_until || new Date(u.banned_until) < now).length,
      banned_users: authUsers.users.filter(u => u.banned_until && new Date(u.banned_until) > now).length,
      free_tier_users: profiles.filter(p => p.subscription_tier === 'free').length,
      pro_tier_users: profiles.filter(p => p.subscription_tier === 'pro').length,
      enterprise_tier_users: profiles.filter(p => p.subscription_tier === 'enterprise').length,
      total_credits_used: profiles.reduce((sum, p) => sum + (p.credits_monthly_limit - p.credits_remaining), 0),
      new_users_this_month: authUsers.users.filter(u => new Date(u.created_at) >= startOfMonth).length
    };

    return stats;
  } catch (error) {
    console.error('Error getting admin stats:', error);
    throw error;
  }
}

async function listUsers(supabase: any, options: {
  page: number;
  pageSize: number;
  search: string;
  sortBy: string;
  sortOrder: string;
}) {
  try {
    const { data: authUsers, error } = await supabase.auth.admin.listUsers();
    if (error) throw error;

    // Get profiles data
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    
    if (profilesError) throw profilesError;

    // Create a map for quick profile lookup
    const profileMap = new Map(profiles.map(p => [p.id, p]));

    // Transform auth users to include profile data
    let users: UserData[] = authUsers.users.map(user => {
      const profile = profileMap.get(user.id);
      const metadata = user.user_metadata || {};
      
      return {
        id: user.id,
        email: user.email || '',
        name: profile?.name || metadata.name || user.email?.split('@')[0] || '',
        company_name: profile?.company_name || metadata.company_name || '',
        role: profile?.role || (user.email === 'admin@enrichx.com' ? 'admin' : 'subscriber'),
        subscription_tier: profile?.subscription_tier || 'free',
        credits_remaining: profile?.credits_remaining || 50,
        credits_monthly_limit: profile?.credits_monthly_limit || 50,
        subscription_status: profile?.subscription_status || 'active',
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        banned_until: user.banned_until
      };
    });

    // Apply search filter
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      users = users.filter(user => 
        user.email.toLowerCase().includes(searchLower) ||
        user.name.toLowerCase().includes(searchLower) ||
        (user.company_name && user.company_name.toLowerCase().includes(searchLower))
      );
    }

    // Apply sorting
    users.sort((a, b) => {
      const aValue = a[options.sortBy as keyof UserData];
      const bValue = b[options.sortBy as keyof UserData];
      
      if (options.sortOrder === 'desc') {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      } else {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      }
    });

    // Apply pagination
    const startIndex = (options.page - 1) * options.pageSize;
    const endIndex = startIndex + options.pageSize;
    const paginatedUsers = users.slice(startIndex, endIndex);

    return {
      users: paginatedUsers,
      total: users.length,
      page: options.page,
      pageSize: options.pageSize,
      totalPages: Math.ceil(users.length / options.pageSize)
    };
  } catch (error) {
    console.error('Error listing users:', error);
    throw error;
  }
}

async function getUserDetails(supabase: any, userId: string): Promise<UserData | null> {
  try {
    const { data: user, error } = await supabase.auth.admin.getUserById(userId);
    if (error || !user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    const metadata = user.user_metadata || {};
    
    return {
      id: user.id,
      email: user.email || '',
      name: profile?.name || metadata.name || user.email?.split('@')[0] || '',
      company_name: profile?.company_name || metadata.company_name || '',
      role: profile?.role || (user.email === 'admin@enrichx.com' ? 'admin' : 'subscriber'),
      subscription_tier: profile?.subscription_tier || 'free',
      credits_remaining: profile?.credits_remaining || 50,
      credits_monthly_limit: profile?.credits_monthly_limit || 50,
      subscription_status: profile?.subscription_status || 'active',
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      banned_until: user.banned_until
    };
  } catch (error) {
    console.error('Error getting user details:', error);
    return null;
  }
}

async function updateUser(supabase: any, userId: string, updateData: any) {
  try {
    // Update auth metadata
    const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: updateData
    });

    if (authError) throw authError;

    // Update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId);

    if (profileError) throw profileError;

    return { success: true, message: 'User updated successfully' };
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

async function banUser(supabase: any, userId: string, banUntil: string | null) {
  try {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      banned_until: banUntil
    });

    if (error) throw error;

    return { 
      success: true, 
      message: banUntil ? 'User banned successfully' : 'User unbanned successfully' 
    };
  } catch (error) {
    console.error('Error banning/unbanning user:', error);
    throw error;
  }
}