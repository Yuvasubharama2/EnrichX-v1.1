
import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Filter, Shield, CreditCard, Edit3, Trash2, Plus, 
  Check, X, Crown, User, Building2, Calendar, Mail, Phone, Ban, 
  UserCheck, AlertTriangle, TrendingUp, BarChart3, RefreshCw,
  ChevronLeft, ChevronRight, Eye, EyeOff, Settings, Download
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

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

interface FilterState {
  role: string[];
  subscription_tier: string[];
  subscription_status: string[];
  banned_status: string[];
}

export default function AdminUserManagementPage() {
  const { user } = useAuth();
  const supabase = useSupabaseClient();
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [banningUser, setBanningUser] = useState<UserData | null>(null);
  const [banUntilDate, setBanUntilDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    role: [],
    subscription_tier: [],
    subscription_status: [],
    banned_status: []
  });

  const [editForm, setEditForm] = useState({
    name: '',
    company_name: '',
    role: 'subscriber' as 'admin' | 'subscriber',
    subscription_tier: 'free' as 'free' | 'pro' | 'enterprise',
    credits_remaining: 0,
    credits_monthly_limit: 0,
    subscription_status: 'active' as 'active' | 'canceled' | 'past_due'
  });

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
      fetchStats();
    }
  }, [user, currentPage, searchQuery, sortBy, sortOrder]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }
      
      const token = session.access_token;
      console.log('Using token:', token ? `${token.substring(0, 10)}...` : 'No token found');
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
        search: searchQuery,
        sortBy,
        sortOrder
      });

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-user-management/users?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error:', errorData);
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setUsers(data.users);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }
      
      const token = session.access_token;
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-user-management/stats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleEditUser = (userData: UserData) => {
    setEditingUser(userData);
    setEditForm({
      name: userData.name,
      company_name: userData.company_name || '',
      role: userData.role,
      subscription_tier: userData.subscription_tier,
      credits_remaining: userData.credits_remaining,
      credits_monthly_limit: userData.credits_monthly_limit,
      subscription_status: userData.subscription_status
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }
      
      const token = session.access_token;
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-user-management/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      setShowEditModal(false);
      setEditingUser(null);
      fetchUsers();
      alert('User updated successfully!');
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user');
    }
  };

  const handleBanUser = (userData: UserData) => {
    setBanningUser(userData);
    setBanUntilDate('');
    setShowBanModal(true);
  };

  const handleConfirmBan = async () => {
    if (!banningUser) return;

    try {
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }
      
      const token = session.access_token;
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-user-management/ban`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: banningUser.id,
          banUntil: banUntilDate || null
        })
      });

      if (!response.ok) {
        throw new Error('Failed to ban user');
      }

      setShowBanModal(false);
      setBanningUser(null);
      setBanUntilDate('');
      fetchUsers();
      fetchStats();
      alert(banUntilDate ? 'User banned successfully!' : 'User unbanned successfully!');
    } catch (error) {
      console.error('Error banning user:', error);
      alert('Failed to ban user');
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
      subscription_status: [],
      banned_status: []
    });
  };

  const getActiveFiltersCount = () => {
    return Object.values(filters).reduce((count, filterArray) => count + filterArray.length, 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isUserBanned = (userData: UserData) => {
    return userData.banned_until && new Date(userData.banned_until) > new Date();
  };

  const getTierColor = (tier: string) => {
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
      case 'canceled': return 'bg-red-100 text-red-800';
      case 'past_due': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Check if user has admin privileges
  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => { fetchUsers(); fetchStats(); }}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4 mr-2 inline" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">
            Manage user accounts, roles, and subscription tiers
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => { fetchUsers(); fetchStats(); }}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Statistics Dashboard */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-green-600">+{stats.new_users_this_month}</span>
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total_users}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-sm font-medium text-gray-600">{stats.banned_users} banned</span>
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-500">Active Users</h3>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.active_users}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <div className="text-right text-xs text-gray-500">
                <div>Free: {stats.free_tier_users}</div>
                <div>Pro: {stats.pro_tier_users}</div>
                <div>Enterprise: {stats.enterprise_tier_users}</div>
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-500">Subscription Tiers</h3>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total_users}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-500">Credits Used</h3>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total_credits_used.toLocaleString()}</p>
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
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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

              {/* Ban Status Filter */}
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">Ban Status</h5>
                <div className="space-y-2">
                  {['active', 'banned'].map((status) => (
                    <label key={status} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.banned_status.includes(status)}
                        onChange={(e) => handleFilterChange('banned_status', status, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600 capitalize">{status}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
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
              {users.map((userData) => (
                <tr key={userData.id} className={`hover:bg-gray-50 ${isUserBanned(userData) ? 'bg-red-50' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mr-3">
                        {userData.role === 'admin' ? (
                          <Crown className="w-5 h-5 text-white" />
                        ) : (
                          <User className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 flex items-center">
                          {userData.name}
                          {isUserBanned(userData) && (
                            <Ban className="w-4 h-4 text-red-500 ml-2" title="User is banned" />
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{userData.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      {userData.company_name ? (
                        <>
                          <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                          {userData.company_name}
                        </>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      userData.role === 'admin' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {userData.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                      {userData.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getTierColor(userData.subscription_tier)}`}>
                      {userData.subscription_tier}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {userData.credits_remaining.toLocaleString()} / {userData.credits_monthly_limit.toLocaleString()}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                      <div 
                        className="bg-blue-600 h-1.5 rounded-full"
                        style={{ 
                          width: `${(userData.credits_remaining / userData.credits_monthly_limit) * 100}%` 
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(userData.subscription_status)}`}>
                      {userData.subscription_status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(userData.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => handleEditUser(userData)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        title="Edit user"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      {userData.email !== 'admin@enrichx.com' && (
                        <button
                          onClick={() => handleBanUser(userData)}
                          className={`p-1 rounded ${
                            isUserBanned(userData)
                              ? 'text-green-600 hover:text-green-900'
                              : 'text-red-600 hover:text-red-900'
                          }`}
                          title={isUserBanned(userData) ? 'Unban user' : 'Ban user'}
                        >
                          {isUserBanned(userData) ? <UserCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing page <span className="font-medium">{currentPage}</span> of{' '}
                <span className="font-medium">{totalPages}</span>
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>

        {users.length === 0 && (
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
                        const tier = e.target.value as 'free' | 'pro' | 'enterprise';
                        const credits = tier === 'enterprise' ? 10000 : tier === 'pro' ? 2000 : 50;
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
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ban Until (optional - leave empty for permanent ban)
                    </label>
                    <input
                      type="datetime-local"
                      value={banUntilDate}
                      onChange={(e) => setBanUntilDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                )}
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handleConfirmBan}
                  className={`w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${
                    isUserBanned(banningUser)
                      ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                      : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                  }`}
                >
                  {isUserBanned(banningUser) ? (
                    <>
                      <UserCheck className="w-4 h-4 mr-2" />
                      Unban User
                    </>
                  ) : (
                    <>
                      <Ban className="w-4 h-4 mr-2" />
                      Ban User
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowBanModal(false)}
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