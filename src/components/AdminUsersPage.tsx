import React, { useState, useEffect } from 'react';
import { Users, Search, Filter, Shield, CreditCard, Edit3, Trash2, Plus, Check, X, Crown, User, Building2, RefreshCw, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';
import { useAuth } from '../contexts/AuthContext';

type SubscriptionTier = Database['public']['Enums']['subscription_tier'];

interface UserProfile {
  id: string;
  email: string;
  name: string;
  company_name?: string;
  role: 'admin' | 'subscriber';
  subscription_tier: SubscriptionTier;
  credits_remaining: number;
  credits_monthly_limit: number;
  subscription_status: 'active' | 'canceled' | 'past_due';
  last_sign_in_at?: string;
  created_at: string;
  updated_at: string;
}

interface FilterState {
  role: string[];
  subscription_tier: string[];
  subscription_status: string[];
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    name: '',
    company_name: '',
    role: 'subscriber' as 'admin' | 'subscriber',
    subscription_tier: 'free' as SubscriptionTier,
    subscription_status: 'active' as 'active' | 'canceled' | 'past_due'
  });

  useEffect(() => {
    fetchUsers();
    
    // Set up real-time subscription for profile changes
    const subscription = supabase
      .channel('profiles-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          console.log('Profile change detected:', payload);
          fetchUsers(); // Refresh the list when changes occur
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, searchQuery, filters]);

  const getDefaultCredits = (tier: SubscriptionTier) => {
    switch (tier) {
      case 'enterprise': return 10000;
      case 'pro': return 2000;
      case 'free': return 50;
      default: return 50;
    }
  };

  const fetchUsers = async () => {
    try {
      setRefreshing(true);
      setError(null);
      console.log('Fetching users from profiles table...');
      
      // First, check if current user is admin
      if (!currentUser || currentUser.role !== 'admin') {
        throw new Error('Access denied. Admin privileges required.');
      }

      // Try to fetch from profiles table first
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        
        // If profiles table doesn't exist or has issues, try to get auth users
        console.log('Falling back to auth users...');
        
        try {
          const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
          
          if (authError) {
            throw new Error(`Auth error: ${authError.message}`);
          }

          // Convert auth users to profile format
          const convertedUsers: UserProfile[] = authUsers.users.map(user => {
            const metadata = user.user_metadata || {};
            const isAdmin = user.email === 'admin@enrichx.com';
            const role = isAdmin ? 'admin' : (metadata.role || 'subscriber');
            const tier = isAdmin ? 'enterprise' : (metadata.subscription_tier || 'free');
            const defaultCredits = getDefaultCredits(tier);
            
            return {
              id: user.id,
              email: user.email || '',
              name: metadata.name || (isAdmin ? 'Admin User' : user.email?.split('@')[0] || ''),
              company_name: metadata.company_name || '',
              role: role,
              subscription_tier: tier,
              credits_remaining: metadata.credits_remaining || defaultCredits,
              credits_monthly_limit: defaultCredits,
              subscription_status: metadata.subscription_status || 'active',
              last_sign_in_at: user.last_sign_in_at,
              created_at: user.created_at,
              updated_at: user.updated_at || user.created_at
            };
          });

          console.log('Auth users converted:', convertedUsers.length);
          setUsers(convertedUsers);
          return;
        } catch (authFallbackError) {
          console.error('Auth fallback also failed:', authFallbackError);
          throw new Error('Unable to fetch user data from both profiles and auth tables');
        }
      }

      console.log('Profiles fetched:', profilesData?.length || 0);
      
      // If we have profiles data, use it
      if (profilesData && profilesData.length > 0) {
        setUsers(profilesData);
      } else {
        // If profiles table is empty, try to create admin profile
        console.log('No profiles found, checking for admin user...');
        
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser && authUser.email === 'admin@enrichx.com') {
          // Create admin profile
          const adminProfile: UserProfile = {
            id: authUser.id,
            email: authUser.email,
            name: 'Admin User',
            company_name: '',
            role: 'admin',
            subscription_tier: 'enterprise',
            credits_remaining: 10000,
            credits_monthly_limit: 10000,
            subscription_status: 'active',
            last_sign_in_at: authUser.last_sign_in_at,
            created_at: authUser.created_at,
            updated_at: authUser.updated_at || authUser.created_at
          };
          
          // Try to insert admin profile
          try {
            const { error: insertError } = await supabase
              .from('profiles')
              .insert(adminProfile);
            
            if (!insertError) {
              setUsers([adminProfile]);
              console.log('Admin profile created successfully');
            } else {
              console.error('Failed to create admin profile:', insertError);
              setUsers([adminProfile]); // Still show the admin user
            }
          } catch (insertError) {
            console.error('Error inserting admin profile:', insertError);
            setUsers([adminProfile]); // Still show the admin user
          }
        } else {
          setUsers([]);
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError(error instanceof Error ? error.message : 'Failed to load users');
      
      // As a last resort, show current user if they're admin
      if (currentUser && currentUser.role === 'admin') {
        const fallbackUser: UserProfile = {
          id: currentUser.id,
          email: currentUser.email,
          name: currentUser.name,
          company_name: currentUser.company_name || '',
          role: currentUser.role,
          subscription_tier: currentUser.subscription_tier,
          credits_remaining: currentUser.credits_remaining,
          credits_monthly_limit: currentUser.credits_monthly_limit,
          subscription_status: currentUser.subscription_status,
          created_at: currentUser.created_at.toISOString(),
          updated_at: new Date().toISOString()
        };
        setUsers([fallbackUser]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
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
          const userValue = user[field as keyof UserProfile];
          return values.includes(userValue as string);
        });
      }
    });

    setFilteredUsers(filtered);
  };

  const handleCreateUser = async () => {
    if (!createForm.email || !createForm.password || !createForm.name) {
      alert('Please fill in all required fields');
      return;
    }

    setActionLoading('create');
    try {
      console.log('Creating new user:', createForm.email);
      
      const defaultCredits = getDefaultCredits(createForm.subscription_tier);
      
      // Create user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: createForm.email,
        password: createForm.password,
        options: {
          data: {
            name: createForm.name,
            company_name: createForm.company_name,
            role: createForm.role,
            subscription_tier: createForm.subscription_tier,
            credits_remaining: defaultCredits,
            subscription_status: createForm.subscription_status
          }
        }
      });

      if (authError) {
        console.error('Error creating auth user:', authError);
        throw authError;
      }

      if (authData.user) {
        // The profile will be created automatically by the trigger
        console.log('User created successfully');
        
        // Reset form and close modal
        setCreateForm({
          email: '',
          password: '',
          name: '',
          company_name: '',
          role: 'subscriber',
          subscription_tier: 'free',
          subscription_status: 'active'
        });
        setShowCreateModal(false);
        
        // Refresh the users list
        setTimeout(() => fetchUsers(), 1000); // Give time for trigger to execute
        
        alert('User created successfully!');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditUser = (user: UserProfile) => {
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

    setActionLoading('update');
    try {
      console.log('Updating user profile:', editingUser.id, editForm);
      
      // Try to update profiles table first
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: editForm.name,
          company_name: editForm.company_name,
          role: editForm.role,
          subscription_tier: editForm.subscription_tier,
          credits_remaining: editForm.credits_remaining,
          credits_monthly_limit: editForm.credits_monthly_limit,
          subscription_status: editForm.subscription_status,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingUser.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        
        // Fallback to updating auth metadata
        const { error: authError } = await supabase.auth.admin.updateUserById(editingUser.id, {
          user_metadata: {
            name: editForm.name,
            company_name: editForm.company_name,
            role: editForm.role,
            subscription_tier: editForm.subscription_tier,
            credits_remaining: editForm.credits_remaining,
            subscription_status: editForm.subscription_status
          }
        });

        if (authError) {
          throw authError;
        }
      }

      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === editingUser.id 
          ? { ...user, ...editForm, updated_at: new Date().toISOString() }
          : user
      ));

      setShowEditModal(false);
      setEditingUser(null);
      
      console.log('User updated successfully');
      alert('User updated successfully!');
    } catch (error) {
      console.error('Error updating user:', error);
      alert(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (userEmail === 'admin@enrichx.com') {
      alert('Cannot delete the main admin user');
      return;
    }

    if (userId === currentUser?.id) {
      alert('Cannot delete your own account');
      return;
    }

    if (confirm(`Are you sure you want to delete user ${userEmail}? This action cannot be undone.`)) {
      setActionLoading(userId);
      try {
        // Try to delete from profiles table first
        const { error: profileError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', userId);

        if (profileError) {
          console.error('Error deleting profile:', profileError);
          
          // Fallback to deleting auth user
          const { error: authError } = await supabase.auth.admin.deleteUser(userId);
          
          if (authError) {
            throw authError;
          }
        }

        setUsers(prev => prev.filter(user => user.id !== userId));
        console.log('User deleted successfully');
        alert('User deleted successfully');
      } catch (error) {
        console.error('Error deleting user:', error);
        alert(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setActionLoading(null);
      }
    }
  };

  const handleResetCredits = async (userId: string, tier: SubscriptionTier) => {
    const defaultCredits = getDefaultCredits(tier);
    
    setActionLoading(`reset-${userId}`);
    try {
      // Try to update profiles table first
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          credits_remaining: defaultCredits,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (profileError) {
        console.error('Error updating profile credits:', profileError);
        
        // Fallback to updating auth metadata
        const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
          user_metadata: {
            credits_remaining: defaultCredits
          }
        });

        if (authError) {
          throw authError;
        }
      }

      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, credits_remaining: defaultCredits, updated_at: new Date().toISOString() }
          : user
      ));

      alert('Credits reset successfully!');
    } catch (error) {
      console.error('Error resetting credits:', error);
      alert(`Failed to reset credits: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setActionLoading(null);
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

  const getUniqueValues = (field: keyof UserProfile) => {
    const values = users
      .map(user => user[field])
      .filter(value => value && value !== '')
      .filter((value, index, self) => self.indexOf(value) === index);
    return values.sort();
  };

  const getTierColor = (tier: SubscriptionTier) => {
    switch (tier) {
      case 'enterprise': return 'bg-purple-100 text-purple-800';
      case 'pro': return 'bg-blue-100 text-blue-800';
      case 'free': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'past_due': return 'bg-yellow-100 text-yellow-800';
      case 'canceled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
            Manage user accounts, roles, subscription tiers, and access control
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={fetchUsers}
            disabled={refreshing}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create User
          </button>
          <span className="text-sm text-gray-600">
            Total: {users.length} users
          </span>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <div>
              <h4 className="text-sm font-medium text-red-800">Error Loading Users</h4>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

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
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getTierColor(user.subscription_tier)}`}>
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
                          width: `${Math.min((user.credits_remaining / user.credits_monthly_limit) * 100, 100)}%` 
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.subscription_status)}`}>
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
                        disabled={actionLoading === 'update'}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded disabled:opacity-50"
                        title="Edit user"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleResetCredits(user.id, user.subscription_tier)}
                        disabled={actionLoading === `reset-${user.id}`}
                        className="text-green-600 hover:text-green-900 p-1 rounded disabled:opacity-50"
                        title="Reset credits"
                      >
                        <RefreshCw className={`w-4 h-4 ${actionLoading === `reset-${user.id}` ? 'animate-spin' : ''}`} />
                      </button>
                      {user.email !== 'admin@enrichx.com' && user.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          disabled={actionLoading === user.id}
                          className="text-red-600 hover:text-red-900 p-1 rounded disabled:opacity-50"
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
                : 'No users have been created yet'
              }
            </p>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowCreateModal(false)} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <Plus className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">Create New User</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                      <input
                        type="email"
                        value={createForm.email}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="user@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                      <input
                        type="password"
                        value={createForm.password}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Minimum 6 characters"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                    <input
                      type="text"
                      value={createForm.name}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                    <input
                      type="text"
                      value={createForm.company_name}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, company_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Acme Corp"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                      <select
                        value={createForm.role}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, role: e.target.value as 'admin' | 'subscriber' }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="subscriber">Subscriber</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Subscription Tier</label>
                      <select
                        value={createForm.subscription_tier}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, subscription_tier: e.target.value as SubscriptionTier }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="free">Free ({getDefaultCredits('free')} credits)</option>
                        <option value="pro">Pro ({getDefaultCredits('pro')} credits)</option>
                        <option value="enterprise">Enterprise ({getDefaultCredits('enterprise')} credits)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      value={createForm.subscription_status}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, subscription_status: e.target.value as 'active' | 'canceled' | 'past_due' }))}
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
                  onClick={handleCreateUser}
                  disabled={actionLoading === 'create' || !createForm.email || !createForm.password || !createForm.name}
                  className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading === 'create' ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Create User
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  disabled={actionLoading === 'create'}
                  className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                          credits_monthly_limit: credits
                        }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="free">Free ({getDefaultCredits('free')} credits)</option>
                      <option value="pro">Pro ({getDefaultCredits('pro')} credits)</option>
                      <option value="enterprise">Enterprise ({getDefaultCredits('enterprise')} credits)</option>
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
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Limit</label>
                      <input
                        type="number"
                        value={editForm.credits_monthly_limit}
                        onChange={(e) => setEditForm(prev => ({ ...prev, credits_monthly_limit: parseInt(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="0"
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
                  disabled={actionLoading === 'update'}
                  className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading === 'update' ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Update User
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  disabled={actionLoading === 'update'}
                  className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="text-sm font-medium text-blue-900 mb-4">User Management Features</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-blue-800">
          <div className="flex items-start space-x-2">
            <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <strong>Role-Based Access:</strong> Control user permissions with admin and subscriber roles
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <strong>Credit Management:</strong> Monitor and adjust user credit balances and limits
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <strong>Subscription Tiers:</strong> Manage Free, Pro, and Enterprise access levels
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <strong>Real-time Updates:</strong> Changes sync automatically across the platform
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <strong>Secure Operations:</strong> All actions protected by Row Level Security
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <strong>Audit Trail:</strong> Track user creation, updates, and access patterns
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}