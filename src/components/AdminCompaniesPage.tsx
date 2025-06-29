import React, { useState, useEffect } from 'react';
import { Building2, Search, Filter, Eye, EyeOff, CheckCircle, XCircle, RefreshCw, Globe, ChevronDown, ChevronUp, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type Company = Database['public']['Tables']['companies']['Row'];
type SubscriptionTier = Database['public']['Enums']['subscription_tier'];

interface FilterState {
  company_type: string[];
  industry: string[];
  location_city: string[];
  location_state: string[];
  location_region: string[];
  size_range: string[];
  revenue: string[];
}

interface VisibleFields {
  company_type: boolean;
  industry: boolean;
  website: boolean;
  linkedin_url: boolean;
  hq_location: boolean;
  location_city: boolean;
  location_state: boolean;
  location_region: boolean;
  size_range: boolean;
  headcount: boolean;
  revenue: boolean;
  phone_number: boolean;
  company_keywords: boolean;
  industry_keywords: boolean;
  technologies_used: boolean;
  created_at: boolean;
  updated_at: boolean;
}

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showFieldSelector, setShowFieldSelector] = useState(false);

  const [filters, setFilters] = useState<FilterState>({
    company_type: [],
    industry: [],
    location_city: [],
    location_state: [],
    location_region: [],
    size_range: [],
    revenue: []
  });

  const [visibleFields, setVisibleFields] = useState<VisibleFields>({
    company_type: true,
    industry: true,
    website: true,
    linkedin_url: false,
    hq_location: false,
    location_city: true,
    location_state: false,
    location_region: false,
    size_range: true,
    headcount: false,
    revenue: false,
    phone_number: false,
    company_keywords: false,
    industry_keywords: false,
    technologies_used: false,
    created_at: false,
    updated_at: false
  });

  // Get unique values for filter options
  const getUniqueValues = (field: keyof Company) => {
    const values = companies
      .map(company => company[field])
      .filter(value => value && value !== '')
      .filter((value, index, self) => self.indexOf(value) === index);
    return values.sort();
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [companies, searchQuery, filters]);

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

  const applyFilters = () => {
    let filtered = companies;

    // Apply search query
    if (searchQuery) {
      filtered = filtered.filter(company =>
        company.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.location_city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.location_state.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.hq_location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply filters
    Object.entries(filters).forEach(([field, values]) => {
      if (values.length > 0) {
        filtered = filtered.filter(company => {
          const companyValue = company[field as keyof Company];
          return values.includes(companyValue as string);
        });
      }
    });

    setFilteredCompanies(filtered);
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
      company_type: [],
      industry: [],
      location_city: [],
      location_state: [],
      location_region: [],
      size_range: [],
      revenue: []
    });
  };

  const toggleFieldVisibility = (field: keyof VisibleFields) => {
    setVisibleFields(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const formatWebsiteUrl = (website: string | null) => {
    if (!website) return null;
    if (website.startsWith('http://') || website.startsWith('https://')) {
      return website;
    }
    return `https://${website}`;
  };

  const formatFieldName = (field: string) => {
    return field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getActiveFiltersCount = () => {
    return Object.values(filters).reduce((count, filterArray) => count + filterArray.length, 0);
  };

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

      {/* Search and Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search companies by name, industry, or location..."
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
          <button
            onClick={() => setShowFieldSelector(!showFieldSelector)}
            className={`flex items-center px-4 py-2 text-sm font-medium border rounded-lg transition-colors ${
              showFieldSelector
                ? 'bg-purple-50 text-purple-700 border-purple-300'
                : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Eye className="w-4 h-4 mr-2" />
            Fields
            {showFieldSelector ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
          </button>
        </div>

        {/* Field Selector */}
        {showFieldSelector && (
          <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h4 className="text-sm font-medium text-purple-900 mb-3">Select Fields to Display</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(visibleFields).map(([field, isVisible]) => (
                <label key={field} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={() => toggleFieldVisibility(field as keyof VisibleFields)}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">{formatFieldName(field)}</span>
                </label>
              ))}
            </div>
          </div>
        )}

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
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Company Type Filter */}
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">Company Type</h5>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {getUniqueValues('company_type').map((type) => (
                    <label key={type} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.company_type.includes(type as string)}
                        onChange={(e) => handleFilterChange('company_type', type as string, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Industry Filter */}
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">Industry</h5>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {getUniqueValues('industry').map((industry) => (
                    <label key={industry} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.industry.includes(industry as string)}
                        onChange={(e) => handleFilterChange('industry', industry as string, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">{industry}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* City Filter */}
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">City</h5>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {getUniqueValues('location_city').map((city) => (
                    <label key={city} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.location_city.includes(city as string)}
                        onChange={(e) => handleFilterChange('location_city', city as string, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">{city}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* State Filter */}
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">State</h5>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {getUniqueValues('location_state').map((state) => (
                    <label key={state} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.location_state.includes(state as string)}
                        onChange={(e) => handleFilterChange('location_state', state as string, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">{state}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Size Range Filter */}
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">Company Size</h5>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {getUniqueValues('size_range').map((size) => (
                    <label key={size} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.size_range.includes(size as string)}
                        onChange={(e) => handleFilterChange('size_range', size as string, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">{size}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Revenue Filter */}
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">Revenue</h5>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {getUniqueValues('revenue').filter(revenue => revenue).map((revenue) => (
                    <label key={revenue} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.revenue.includes(revenue as string)}
                        onChange={(e) => handleFilterChange('revenue', revenue as string, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">{revenue}</span>
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
            Showing {filteredCompanies.length} of {companies.length} companies
          </span>
          {getActiveFiltersCount() > 0 && (
            <span className="text-sm text-blue-600">
              {getActiveFiltersCount()} filter{getActiveFiltersCount() !== 1 ? 's' : ''} applied
            </span>
          )}
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
                {visibleFields.company_type && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                )}
                {visibleFields.industry && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Industry
                  </th>
                )}
                {visibleFields.hq_location && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    HQ Location
                  </th>
                )}
                {visibleFields.location_city && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    City
                  </th>
                )}
                {visibleFields.location_state && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    State
                  </th>
                )}
                {visibleFields.size_range && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                )}
                {visibleFields.headcount && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Headcount
                  </th>
                )}
                {visibleFields.revenue && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                )}
                {visibleFields.phone_number && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                )}
                {visibleFields.technologies_used && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Technologies
                  </th>
                )}
                {visibleFields.created_at && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                )}
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
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <div className="text-sm font-medium text-gray-900">
                            {company.company_name}
                          </div>
                          {visibleFields.website && company.website && (
                            <a
                              href={formatWebsiteUrl(company.website)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                              title="Visit company website"
                            >
                              <Globe className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                        {visibleFields.linkedin_url && company.linkedin_url && (
                          <div className="text-xs text-blue-600 mt-1">
                            <a
                              href={company.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              LinkedIn Profile
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  {visibleFields.company_type && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{company.company_type}</div>
                    </td>
                  )}
                  {visibleFields.industry && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{company.industry}</div>
                    </td>
                  )}
                  {visibleFields.hq_location && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{company.hq_location}</div>
                    </td>
                  )}
                  {visibleFields.location_city && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{company.location_city}</div>
                    </td>
                  )}
                  {visibleFields.location_state && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{company.location_state}</div>
                    </td>
                  )}
                  {visibleFields.size_range && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{company.size_range}</div>
                      {visibleFields.headcount && company.headcount && (
                        <div className="text-sm text-gray-500">{company.headcount} employees</div>
                      )}
                    </td>
                  )}
                  {visibleFields.headcount && !visibleFields.size_range && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{company.headcount || '-'}</div>
                    </td>
                  )}
                  {visibleFields.revenue && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{company.revenue || '-'}</div>
                    </td>
                  )}
                  {visibleFields.phone_number && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{company.phone_number || '-'}</div>
                    </td>
                  )}
                  {visibleFields.technologies_used && (
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {company.technologies_used?.slice(0, 3).map((tech, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800"
                          >
                            {tech}
                          </span>
                        ))}
                        {company.technologies_used && company.technologies_used.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{company.technologies_used.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                  )}
                  {visibleFields.created_at && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(company.created_at).toLocaleDateString()}
                      </div>
                    </td>
                  )}
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
              {searchQuery || getActiveFiltersCount() > 0 
                ? 'Try adjusting your search terms or filters' 
                : 'Upload some company data to get started'
              }
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