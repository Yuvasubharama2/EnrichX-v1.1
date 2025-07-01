import React, { useState, useEffect } from 'react';
import { Users, Search, Filter, Shield, CreditCard, Edit3, Trash2, Plus, Check, X, Crown, User, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type SubscriptionTier = Database['public']['Enums']['subscription_tier'];

interface UserData {
  id: string;
  email: string;
  name: string;
  company_name?: string;
  role: 'admin' | 'subscriber';
  subscription_tier: SubscriptionTier;
  credits_remaining: number;
  credits_monthly_limit: number;
  subscription_status: 'active' | 'canceled' | 'past_due';
  created_at: string;
  last_sign_in_at?: string;
}

interface FilterState {
  role: string[];
  subscription_tier: string[];
  subscription_status: string[];
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const [filters, setFilters] = useState<FilterState>({
    role: [],
    subscription_tier: [],
    subscription_status: []
  });

  const [editForm, setEditForm] = useState({
    name: '',
    company_name: '',
    role: 'subscriber' as 'admin' | 'subscriber',
    subscription_tier: 'free' as SubscriptionTier,
    credits_remaining: 0,
    credits_monthly_limit: 0,
    subscription_status: 'active' as 'active' | 'canceled' | 'past_due'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, searchQuery, filters]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('Fetching users via Edge Function...');
      
      // Get the current user's session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error(`Session error: ${sessionError.message}`);
      }
      
      if (!sessionData?.session) {
        throw new Error('No active session');
      }

      // Validate environment variables
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('VITE_SUPABASE_URL environment variable is not set');
      }

      // Construct the Edge Function URL properly
      const baseUrl = supabaseUrl.endsWith('/') ? supabaseUrl.slice(0, -1) : supabaseUrl;
      const apiUrl = `${baseUrl}/functions/v1/admin-users`;
      
      console.log('Edge Function URL:', apiUrl);
      console.log('Using access token:', sessionData.session.access_token ? 'Present' : 'Missing');

      // Call the admin-users Edge Function
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Edge Function error response:', errorText);
        throw new Error(`Edge Function failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Edge Function response:', result);

      if (result.error) {
        throw new Error(result.error);
      }

      const getDefaultCredits = (tier: string) => {
        switch (tier) {
          case 'enterprise': return 10000;
          case 'pro': return 2000;
          case 'free': return 50;
          default: return 50;
        }
      };

      const userData: UserData[] = result.users.map((user: any) => {
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

      console.log('Processed user data:', userData);
      setUsers(userData);
    } catch (error) {
      console.error('Error fetching users:', error);
      
      // Enhanced fallback with better error handling
      try {
        console.log('Trying fallback method...');
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('Fallback user fetch error:', userError);
          throw userError;
        }
        
        if (currentUser) {
          const mockUsers: UserData[] = [
            {
              id: currentUser.id,
              email: currentUser.email || '',
              name: currentUser.user_metadata?.name || 'Admin User',
              company_name: currentUser.user_metadata?.company_name || '',
              role: 'admin',
              subscription_tier: 'enterprise',
              credits_remaining: 10000,
              credits_monthly_limit: 10000,
              subscription_status: 'active',
              created_at: currentUser.created_at,
              last_sign_in_at: currentUser.last_sign_in_at
            }
          ];
          setUsers(mockUsers);
          console.log('Using fallback data with current user');
        } else {
          throw new Error('No current user found in fallback');
        }
      } catch (fallbackError) {
        console.error('Fallback method also failed:', fallbackError);
        // Set empty array to prevent infinite loading
        setUsers([]);
        // Show user-friendly error message
        alert(`Failed to load users: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your connection and try again.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const getDefaultCredits = (tier: string) => {
    switch (tier) {
      case 'enterprise': return 10000;
      case 'pro': return 2000;
      case 'free': return 50;
      default: return 50;
    }
  };

  const applyFilters = () => {
    let filtered = users;

    // Apply search query
    if (searchQuery) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply filters
    Object.entries(filters).forEach(([field, values]) => {
      if (values.length > 0) {
        filtered = filtered.filter(user => {
          const userValue = user[field as keyof UserData];
          return values.includes(userValue as string);
        });
      }
    });

    setFilteredUsers(filtered);
  };

  const handleEditUser = (user: UserData) => {
    setEditingUser(user);
    setEditForm({
      name: user.name,
      company_name: user.company_name || '',
      role: user.role,
      subscription_tier: user.subscription_tier,
      credits_remaining: user.credits_remaining,
      credits_monthly_limit: user.credits_monthly_limit,
      subscription_status: user.subscription_status
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      console.log('Updating user:', editingUser.id, editForm);
      
      const { error } = await supabase.auth.admin.updateUserById(editingUser.id, {
        user_metadata: {
          ...editForm
        }
      });

      if (error) {
        console.error('Error updating user:', error);
        throw error;
      }

      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === editingUser.id 
          ? { ...user, ...editForm }
          : user
      ));

      setShowEditModal(false);
      setEditingUser(null);
      
      console.log('User updated successfully');
    } catch (error) {
      console.error('Error updating user:', error);
      alert(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (userEmail === 'admin@enrichx.com') {
      alert('Cannot delete admin user');
      return;
    }

    if (confirm(`Are you sure you want to delete user ${userEmail}?`)) {
      try {
        const { error } = await supabase.auth.admin.deleteUser(userId);

        if (error) {
          console.error('Error deleting user:', error);
          throw error;
        }

        setUsers(prev => prev.filter(user => user.id !== userId));
        console.log('User deleted successfully');
      } catch (error) {
        console.error('Error deleting user:', error);
        alert(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const handleFilterChange = (field: keyof FilterState, value: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      [field]: checked 
        ? [...prev[field], value]
        : prev[field].filter(v => v !== value)
    }));
  };

  const clearFilters = () => {
    setFilters({
      role: [],
      subscription_tier: [],
      subscription_status: []
    });
  };

  const getActiveFiltersCount = () => {
    return Object.values(filters).reduce((count, filterArray) => count + filterArray.length, 0);
  };

  const getUniqueValues = (field: keyof UserData) => {
    const values = users
      .map(user => user[field])
      .filter(value => value && value !== '')
      .filter((value, index, self) => self.indexOf(value) === index);
    return values.sort();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-600 mt-1">
            Manage user accounts, roles, and subscription tiers
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">
            Total: {users.length} users
          </span>
        </div>
      </div>

      {/* Search and Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search users by name, email, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center px-4 py-2 text-sm font-medium border rounded-lg transition-colors ${
              showFilters || getActiveFiltersCount() > 0
                ? 'bg-blue-50 text-blue-700 border-blue-300'
                : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {getActiveFiltersCount() > 0 && (
              <span className="ml-2 px-2 py-1 bg-blue-600 text-white rounded-full text-xs">
                {getActiveFiltersCount()}
              </span>
            )}
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-blue-900">Filter Options</h4>
              {getActiveFiltersCount() > 0 && (
                <button
                  onClick={clearFilters}
                  className="flex items-center px-3 py-1 text-xs font-medium text-blue-700 bg-white border border-blue-300 rounded-lg hover:bg-blue-50"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear All
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Role Filter */}
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">Role</h5>
                <div className="space-y-2">
                  {['admin', 'subscriber'].map((role) => (
                    <label key={role} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.role.includes(role)}
                        onChange={(e) => handleFilterChange('role', role, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600 capitalize">{role}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Subscription Tier Filter */}
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">Subscription Tier</h5>
                <div className="space-y-2">
                  {['free', 'pro', 'enterprise'].map((tier) => (
                    <label key={tier} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.subscription_tier.includes(tier)}
                        onChange={(e) => handleFilterChange('subscription_tier', tier, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600 capitalize">{tier}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">Status</h5>
                <div className="space-y-2">
                  {['active', 'canceled', 'past_due'].map((status) => (
                    <label key={status} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.subscription_status.includes(status)}
                        onChange={(e) => handleFilterChange('subscription_status', status, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600 capitalize">{status.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            Showing {filteredUsers.length} of {users.length} users
          </span>
          {getActiveFiltersCount() > 0 && (
            <span className="text-sm text-blue-600">
              {getActiveFiltersCount()} filter{getActiveFiltersCount() !== 1 ? 's' : ''} applied
            </span>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subscription
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Credits
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mr-3">
                        {user.role === 'admin' ? (
                          <Crown className="w-5 h-5 text-white" />
                        ) : (
                          <User className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      {user.company_name ? (
                        <>
                          <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                          {user.company_name}
                        </>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'admin' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                      user.subscription_tier === 'enterprise' 
                        ? 'bg-purple-100 text-purple-800'
                        : user.subscription_tier === 'pro'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {user.subscription_tier}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {user.credits_remaining.toLocaleString()} / {user.credits_monthly_limit.toLocaleString()}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                      <div 
                        className="bg-blue-600 h-1.5 rounded-full"
                        style={{ 
                          width: `${(user.credits_remaining / user.credits_monthly_limit) * 100}%` 
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.subscription_status === 'active' 
                        ? 'bg-green-100 text-green-800'
                        : user.subscription_status === 'past_due'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.subscription_status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        title="Edit user"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      {user.email !== 'admin@enrichx.com' && (
                        <button
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          className="text-red-600 hover:text-red-900 p-1 rounded"
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-600">
              {searchQuery || getActiveFiltersCount() > 0 
                ? 'Try adjusting your search terms or filters' 
                : 'No users have signed up yet'
              }
            </p>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowEditModal(false)} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <Edit3 className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">Edit User</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                    <input
                      type="text"
                      value={editForm.company_name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, company_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                    <select
                      value={editForm.role}
                      onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value as 'admin' | 'subscriber' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={editingUser.email === 'admin@enrichx.com'}
                    >
                      <option value="subscriber">Subscriber</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subscription Tier</label>
                    <select
                      value={editForm.subscription_tier}
                      onChange={(e) => {
                        const tier = e.target.value as SubscriptionTier;
                        const credits = getDefaultCredits(tier);
                        setEditForm(prev => ({ 
                          ...prev, 
                          subscription_tier: tier,
                          credits_monthly_limit: credits,
                          credits_remaining: credits
                        }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="free">Free (50 credits)</option>
                      <option value="pro">Pro (2,000 credits)</option>
                      <option value="enterprise">Enterprise (10,000 credits)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Credits Remaining</label>
                      <input
                        type="number"
                        value={editForm.credits_remaining}
                        onChange={(e) => setEditForm(prev => ({ ...prev, credits_remaining: parseInt(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Limit</label>
                      <input
                        type="number"
                        value={editForm.credits_monthly_limit}
                        onChange={(e) => setEditForm(prev => ({ ...prev, credits_monthly_limit: parseInt(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      value={editForm.subscription_status}
                      onChange={(e) => setEditForm(prev => ({ ...prev, subscription_status: e.target.value as 'active' | 'canceled' | 'past_due' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="canceled">Canceled</option>
                      <option value="past_due">Past Due</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handleUpdateUser}
                  className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Update User
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}