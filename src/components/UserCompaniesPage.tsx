import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Plus, Star, Building2, ExternalLink, MapPin, Users, Globe, ChevronDown, ChevronUp, X, Heart, BookmarkPlus, Check, Linkedin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';
import { useAuth } from '../contexts/AuthContext';

type Company = Database['public']['Tables']['companies']['Row'];

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
  revenue: boolean;
  phone_number: boolean;
  company_keywords: boolean;
  industry_keywords: boolean;
  technologies_used: boolean;
  created_at: boolean;
}

export default function UserCompaniesPage() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [favoriteCompanies, setFavoriteCompanies] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showFieldSelector, setShowFieldSelector] = useState(false);
  const [showSaveListModal, setShowSaveListModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');

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
    linkedin_url: true,
    hq_location: false,
    location_city: true,
    location_state: true,
    location_region: false,
    size_range: true,
    revenue: false,
    phone_number: false,
    company_keywords: false,
    industry_keywords: false,
    technologies_used: true,
    created_at: false
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
    loadFavorites();
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [companies, searchQuery, filters]);

  const fetchCompanies = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = () => {
    // Load favorites from localStorage for now
    const saved = localStorage.getItem(`favorites_${user?.id}`);
    if (saved) {
      setFavoriteCompanies(JSON.parse(saved));
    }
  };

  const saveFavorites = (favorites: string[]) => {
    localStorage.setItem(`favorites_${user?.id}`, JSON.stringify(favorites));
    setFavoriteCompanies(favorites);
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
        company.hq_location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.company_keywords?.some(keyword => 
          keyword.toLowerCase().includes(searchQuery.toLowerCase())
        ) ||
        company.technologies_used?.some(tech => 
          tech.toLowerCase().includes(searchQuery.toLowerCase())
        )
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

  const handleSelectCompany = (companyId: string) => {
    setSelectedCompanies(prev => 
      prev.includes(companyId) 
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
    );
  };

  const handleSelectAll = () => {
    setSelectedCompanies(
      selectedCompanies.length === filteredCompanies.length 
        ? [] 
        : filteredCompanies.map(c => c.company_id)
    );
  };

  const toggleFavorite = (companyId: string) => {
    const newFavorites = favoriteCompanies.includes(companyId)
      ? favoriteCompanies.filter(id => id !== companyId)
      : [...favoriteCompanies, companyId];
    
    saveFavorites(newFavorites);
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

  const handleSaveToList = () => {
    if (selectedCompanies.length === 0) return;
    setShowSaveListModal(true);
  };

  const handleCreateList = () => {
    // Mock save to list functionality
    console.log('Creating list:', {
      name: newListName,
      description: newListDescription,
      companies: selectedCompanies
    });
    
    // Show success message
    alert(`Successfully saved ${selectedCompanies.length} companies to "${newListName}"`);
    
    // Reset form and close modal
    setNewListName('');
    setNewListDescription('');
    setShowSaveListModal(false);
    setSelectedCompanies([]);
  };

  const handleExport = () => {
    if (selectedCompanies.length === 0) return;
    
    const selectedData = companies.filter(c => selectedCompanies.includes(c.company_id));
    const csvContent = [
      // Header
      ['Company Name', 'Type', 'Industry', 'Website', 'City', 'State', 'Size', 'Revenue'].join(','),
      // Data rows
      ...selectedData.map(company => [
        company.company_name,
        company.company_type,
        company.industry,
        company.website || '',
        company.location_city,
        company.location_state,
        company.size_range,
        company.revenue || ''
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `companies_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Companies Database</h1>
            <p className="text-gray-600 mt-1">
              Discover and research companies in your target market
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="bg-white px-4 py-2 rounded-lg border border-gray-200">
              <span className="text-sm text-gray-600">Credits remaining:</span>
              <span className="font-semibold text-blue-600 ml-1">
                {user?.credits_remaining}/{user?.credits_monthly_limit}
              </span>
            </div>
          </div>
        </div>

        {/* Search and Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by company name, industry, location, keywords, or technologies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center px-4 py-3 text-sm font-medium border rounded-lg transition-colors ${
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
              className={`flex items-center px-4 py-3 text-sm font-medium border rounded-lg transition-colors ${
                showFieldSelector
                  ? 'bg-purple-50 text-purple-700 border-purple-300'
                  : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Building2 className="w-4 h-4 mr-2" />
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
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> Headcount is automatically displayed below the Size field when Size is visible.
                </p>
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
      </div>

      {/* Actions Bar */}
      {selectedCompanies.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-blue-800 font-medium">
              {selectedCompanies.length} compan{selectedCompanies.length !== 1 ? 'ies' : 'y'} selected
            </span>
            <div className="flex items-center space-x-3">
              <button 
                onClick={handleSaveToList}
                className="flex items-center px-4 py-2 text-blue-700 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <BookmarkPlus className="w-4 h-4 mr-2" />
                Save to List
              </button>
              <button 
                onClick={handleExport}
                className="flex items-center px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Export ({selectedCompanies.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedCompanies.length === filteredCompanies.length && filteredCompanies.length > 0}
              onChange={handleSelectAll}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">
              Showing {filteredCompanies.length.toLocaleString()} of {companies.length.toLocaleString()} companies
            </span>
          </div>
          {getActiveFiltersCount() > 0 && (
            <span className="text-sm text-blue-600">
              {getActiveFiltersCount()} filter{getActiveFiltersCount() !== 1 ? 's' : ''} applied
            </span>
          )}
        </div>
      </div>

      {/* Companies Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  <input
                    type="checkbox"
                    checked={selectedCompanies.length === filteredCompanies.length && filteredCompanies.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[250px]">
                  Company
                </th>
                {visibleFields.company_type && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                    Type
                  </th>
                )}
                {visibleFields.industry && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                    Industry
                  </th>
                )}
                {visibleFields.hq_location && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                    HQ Location
                  </th>
                )}
                {visibleFields.location_city && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                    City
                  </th>
                )}
                {visibleFields.location_state && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">
                    State
                  </th>
                )}
                {visibleFields.location_region && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                    Region
                  </th>
                )}
                {visibleFields.size_range && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                    Size
                  </th>
                )}
                {visibleFields.revenue && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                    Revenue
                  </th>
                )}
                {visibleFields.technologies_used && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                    Technologies
                  </th>
                )}
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCompanies.map((company) => (
                <tr key={company.company_id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedCompanies.includes(company.company_id)}
                      onChange={() => handleSelectCompany(company.company_id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center min-w-0">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                        <Building2 className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-semibold text-gray-900 truncate">
                            {company.company_name}
                          </h4>
                          {visibleFields.website && company.website && (
                            <a
                              href={formatWebsiteUrl(company.website)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-gray-400 hover:text-blue-600 transition-colors flex-shrink-0"
                              title="Visit company website"
                            >
                              <Globe className="w-4 h-4" />
                            </a>
                          )}
                          {visibleFields.linkedin_url && company.linkedin_url && (
                            <a
                              href={company.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-gray-400 hover:text-blue-600 transition-colors flex-shrink-0"
                              title="View LinkedIn profile"
                            >
                              <Linkedin className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                        {visibleFields.company_keywords && company.company_keywords && company.company_keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {company.company_keywords.slice(0, 2).map((keyword, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                              >
                                {keyword}
                              </span>
                            ))}
                            {company.company_keywords.length > 2 && (
                              <span className="text-xs text-gray-500">
                                +{company.company_keywords.length - 2} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  {visibleFields.company_type && (
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800 font-medium">
                        {company.company_type}
                      </span>
                    </td>
                  )}
                  {visibleFields.industry && (
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">{company.industry}</div>
                    </td>
                  )}
                  {visibleFields.hq_location && (
                    <td className="px-4 py-4">
                      <div className="flex items-center text-sm text-gray-900">
                        <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                        {company.hq_location}
                      </div>
                    </td>
                  )}
                  {visibleFields.location_city && (
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">{company.location_city}</div>
                    </td>
                  )}
                  {visibleFields.location_state && (
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">{company.location_state}</div>
                    </td>
                  )}
                  {visibleFields.location_region && (
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">{company.location_region}</div>
                    </td>
                  )}
                  {visibleFields.size_range && (
                    <td className="px-4 py-4">
                      <div className="flex items-center text-sm text-gray-900">
                        <Users className="w-4 h-4 mr-1 text-gray-400" />
                        <div>
                          <div>{company.size_range}</div>
                          {company.headcount && (
                            <div className="text-xs text-gray-500">{company.headcount.toLocaleString()} employees</div>
                          )}
                        </div>
                      </div>
                    </td>
                  )}
                  {visibleFields.revenue && (
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">{company.revenue || '-'}</div>
                    </td>
                  )}
                  {visibleFields.technologies_used && (
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {company.technologies_used?.slice(0, 2).map((tech, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800"
                          >
                            {tech}
                          </span>
                        ))}
                        {company.technologies_used && company.technologies_used.length > 2 && (
                          <span className="text-xs text-gray-500">
                            +{company.technologies_used.length - 2} more
                          </span>
                        )}
                      </div>
                    </td>
                  )}
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => toggleFavorite(company.company_id)}
                        className={`p-2 rounded-lg transition-colors ${
                          favoriteCompanies.includes(company.company_id)
                            ? 'text-red-600 bg-red-50 hover:bg-red-100'
                            : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                        }`}
                        title={favoriteCompanies.includes(company.company_id) ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Heart className={`w-5 h-5 ${favoriteCompanies.includes(company.company_id) ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCompanies.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No companies found</h3>
            <p className="text-gray-600">
              {searchQuery || getActiveFiltersCount() > 0 
                ? 'Try adjusting your search terms or filters' 
                : 'No companies are available for your subscription tier'
              }
            </p>
          </div>
        )}
      </div>

      {/* Save to List Modal */}
      {showSaveListModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowSaveListModal(false)} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <BookmarkPlus className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">Save to List</h3>
                </div>
                
                <p className="text-sm text-gray-600 mb-4">
                  Save {selectedCompanies.length} selected companies to a new list.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="listName" className="block text-sm font-medium text-gray-700 mb-2">
                      List Name *
                    </label>
                    <input
                      type="text"
                      id="listName"
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter list name..."
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="listDescription" className="block text-sm font-medium text-gray-700 mb-2">
                      Description (Optional)
                    </label>
                    <textarea
                      id="listDescription"
                      value={newListDescription}
                      onChange={(e) => setNewListDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Describe this list..."
                    />
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handleCreateList}
                  disabled={!newListName.trim()}
                  className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Save List
                </button>
                <button
                  onClick={() => setShowSaveListModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
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