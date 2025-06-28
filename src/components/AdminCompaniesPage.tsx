import React, { useState, useEffect } from 'react';
import { Building2, Search, Filter, Eye, EyeOff, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type Company = Database['public']['Tables']['companies']['Row'];
type SubscriptionTier = Database['public']['Enums']['subscription_tier'];

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setRefreshing(true);
      console.log('Fetching companies...');
      
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching companies:', error);
        throw error;
      }
      
      console.log('Companies fetched:', data?.length || 0);
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateVisibility = async (companyId: string, tier: SubscriptionTier, isVisible: boolean) => {
    setUpdating(companyId);
    
    try {
      const company = companies.find(c => c.company_id === companyId);
      if (!company) return;

      let updatedTiers = [...(company.visible_to_tiers || [])];
      
      if (isVisible) {
        if (!updatedTiers.includes(tier)) {
          updatedTiers.push(tier);
        }
      } else {
        updatedTiers = updatedTiers.filter(t => t !== tier);
      }

      const { error } = await supabase
        .from('companies')
        .update({ visible_to_tiers: updatedTiers })
        .eq('company_id', companyId);

      if (error) throw error;

      // Update local state
      setCompanies(prev => prev.map(c => 
        c.company_id === companyId 
          ? { ...c, visible_to_tiers: updatedTiers }
          : c
      ));
    } catch (error) {
      console.error('Error updating visibility:', error);
    } finally {
      setUpdating(null);
    }
  };

  const filteredCompanies = companies.filter(company =>
    company.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.location_city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tiers: SubscriptionTier[] = ['free', 'pro', 'enterprise'];

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
          <h2 className="text-2xl font-bold text-gray-900">Companies Database</h2>
          <p className="text-gray-600 mt-1">
            Manage company data visibility by subscription tier
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={fetchCompanies}
            disabled={refreshing}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <span className="text-sm text-gray-600">
            Total: {companies.length} companies
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search companies by name, industry, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Companies Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Industry
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Visibility by Tier
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCompanies.map((company) => (
                <tr key={company.company_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {company.company_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {company.company_type}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{company.industry}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {company.location_city}, {company.location_state}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{company.size_range}</div>
                    {company.headcount && (
                      <div className="text-sm text-gray-500">{company.headcount} employees</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center justify-center space-x-4">
                      {tiers.map((tier) => {
                        const isVisible = company.visible_to_tiers?.includes(tier) || false;
                        const isUpdating = updating === company.company_id;
                        
                        return (
                          <div key={tier} className="flex items-center space-x-2">
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isVisible}
                                onChange={(e) => updateVisibility(company.company_id, tier, e.target.checked)}
                                disabled={isUpdating}
                                className="sr-only"
                              />
                              <div className={`relative w-5 h-5 rounded border-2 transition-all ${
                                isVisible 
                                  ? 'bg-blue-600 border-blue-600' 
                                  : 'border-gray-300 hover:border-gray-400'
                              } ${isUpdating ? 'opacity-50' : ''}`}>
                                {isVisible && (
                                  <CheckCircle className="w-3 h-3 text-white absolute top-0.5 left-0.5" />
                                )}
                              </div>
                            </label>
                            <span className={`text-xs font-medium capitalize ${
                              tier === 'free' ? 'text-green-600' :
                              tier === 'pro' ? 'text-blue-600' :
                              'text-purple-600'
                            }`}>
                              {tier}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCompanies.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No companies found</h3>
            <p className="text-gray-600">
              {searchQuery ? 'Try adjusting your search terms' : 'Upload some company data to get started'}
            </p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Visibility Control</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-100 border border-green-300 rounded flex items-center justify-center">
              <CheckCircle className="w-2 h-2 text-green-600" />
            </div>
            <span><strong>Free:</strong> Basic access users</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded flex items-center justify-center">
              <CheckCircle className="w-2 h-2 text-blue-600" />
            </div>
            <span><strong>Pro:</strong> Professional plan users</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-purple-100 border border-purple-300 rounded flex items-center justify-center">
              <CheckCircle className="w-2 h-2 text-purple-600" />
            </div>
            <span><strong>Enterprise:</strong> Enterprise plan users</span>
          </div>
        </div>
      </div>
    </div>
  );
}