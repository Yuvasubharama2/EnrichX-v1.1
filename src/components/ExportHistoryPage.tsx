import React, { useState, useEffect } from 'react';
import { Download, Calendar, FileText, Building2, Users, Filter, Search, Trash2, Eye } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ExportHistory } from '../types';

export default function ExportHistoryPage() {
  const { user } = useAuth();
  const [exportHistory, setExportHistory] = useState<ExportHistory[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<ExportHistory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'companies' | 'contacts'>('all');
  const [loading, setLoading] = useState(true);

  // Export limits based on subscription tier
  const getExportLimits = () => {
    switch (user?.subscription_tier) {
      case 'enterprise':
        return { companies: 20000, contacts: 10000 };
      case 'pro':
        return { companies: 5000, contacts: 1000 };
      case 'free':
      default:
        return { companies: 1000, contacts: 50 };
    }
  };

  useEffect(() => {
    loadExportHistory();
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [exportHistory, searchQuery, filterType]);

  const loadExportHistory = () => {
    // Load export history from localStorage
    const saved = localStorage.getItem(`export_history_${user?.id}`);
    if (saved) {
      const history = JSON.parse(saved).map((item: any) => ({
        ...item,
        exported_at: new Date(item.exported_at)
      }));
      setExportHistory(history);
    }
    setLoading(false);
  };

  const applyFilters = () => {
    let filtered = exportHistory;

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.type === filterType);
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.filters_applied?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => b.exported_at.getTime() - a.exported_at.getTime());

    setFilteredHistory(filtered);
  };

  const deleteExportRecord = (id: string) => {
    if (confirm('Are you sure you want to delete this export record?')) {
      const updatedHistory = exportHistory.filter(item => item.id !== id);
      setExportHistory(updatedHistory);
      localStorage.setItem(`export_history_${user?.id}`, JSON.stringify(updatedHistory));
    }
  };

  const clearAllHistory = () => {
    if (confirm('Are you sure you want to clear all export history?')) {
      setExportHistory([]);
      localStorage.setItem(`export_history_${user?.id}`, JSON.stringify([]));
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeIcon = (type: string) => {
    return type === 'companies' ? Building2 : Users;
  };

  const getTypeColor = (type: string) => {
    return type === 'companies' ? 'text-blue-600 bg-blue-100' : 'text-purple-600 bg-purple-100';
  };

  const getCurrentMonthExports = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const thisMonthExports = exportHistory.filter(item => {
      const exportDate = new Date(item.exported_at);
      return exportDate.getMonth() === currentMonth && exportDate.getFullYear() === currentYear;
    });

    const companies = thisMonthExports
      .filter(item => item.type === 'companies')
      .reduce((sum, item) => sum + item.count, 0);
    
    const contacts = thisMonthExports
      .filter(item => item.type === 'contacts')
      .reduce((sum, item) => sum + item.count, 0);

    return { companies, contacts };
  };

  const limits = getExportLimits();
  const currentMonthExports = getCurrentMonthExports();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Export History</h1>
        <p className="text-gray-600 mt-1">
          Track your data exports and monitor usage limits
        </p>
      </div>

      {/* Usage Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Companies Export Usage */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Companies Exported</h3>
                <p className="text-sm text-gray-600">This month</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                {currentMonthExports.companies.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">
                of {limits.companies.toLocaleString()}
              </div>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${Math.min((currentMonthExports.companies / limits.companies) * 100, 100)}%` 
              }}
            />
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {((currentMonthExports.companies / limits.companies) * 100).toFixed(1)}% of monthly limit used
          </div>
        </div>

        {/* Contacts Export Usage */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Contacts Exported</h3>
                <p className="text-sm text-gray-600">This month</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-600">
                {currentMonthExports.contacts.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">
                of {limits.contacts.toLocaleString()}
              </div>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${Math.min((currentMonthExports.contacts / limits.contacts) * 100, 100)}%` 
              }}
            />
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {((currentMonthExports.contacts / limits.contacts) * 100).toFixed(1)}% of monthly limit used
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search exports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'companies' | 'contacts')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="companies">Companies</option>
              <option value="contacts">Contacts</option>
            </select>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">
              {filteredHistory.length} export{filteredHistory.length !== 1 ? 's' : ''}
            </span>
            {exportHistory.length > 0 && (
              <button
                onClick={clearAllHistory}
                className="flex items-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Export History List */}
      {filteredHistory.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {filteredHistory.map((item) => {
              const Icon = getTypeIcon(item.type);
              return (
                <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getTypeColor(item.type)}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-lg font-medium text-gray-900">{item.filename}</h3>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${getTypeColor(item.type)}`}>
                            {item.type}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <FileText className="w-4 h-4 mr-1" />
                            <span>{item.count.toLocaleString()} records</span>
                          </div>
                          
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            <span>{formatDate(item.exported_at)}</span>
                          </div>
                        </div>
                        
                        {item.filters_applied && (
                          <div className="mt-2">
                            <span className="text-xs text-gray-500">
                              Filters: {item.filters_applied}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => deleteExportRecord(item.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete export record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Download className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery || filterType !== 'all' ? 'No exports found' : 'No export history yet'}
          </h3>
          <p className="text-gray-600">
            {searchQuery || filterType !== 'all' 
              ? 'Try adjusting your search terms or filters' 
              : 'Your export history will appear here when you download data'
            }
          </p>
        </div>
      )}

      {/* Export Limits Info */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Export Limits by Plan</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-2">Free</div>
            <div className="space-y-1 text-sm text-gray-700">
              <div>50 contacts/month</div>
              <div>1,000 companies/month</div>
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 mb-2">Pro</div>
            <div className="space-y-1 text-sm text-gray-700">
              <div>1,000 contacts/month</div>
              <div>5,000 companies/month</div>
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 mb-2">Enterprise</div>
            <div className="space-y-1 text-sm text-gray-700">
              <div>10,000 contacts/month</div>
              <div>20,000 companies/month</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}