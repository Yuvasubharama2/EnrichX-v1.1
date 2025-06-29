import React, { useState, useEffect } from 'react';
import { Users, Search, Filter, Building2, Mail, Phone, CheckCircle, RefreshCw, Globe, ChevronDown, ChevronUp, X, ExternalLink, Calendar, Linkedin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type Contact = Database['public']['Tables']['contacts']['Row'] & {
  company?: Database['public']['Tables']['companies']['Row'];
};
type SubscriptionTier = Database['public']['Enums']['subscription_tier'];

interface FilterState {
  job_title: string[];
  department: string[];
  location_city: string[];
  location_state: string[];
  location_region: string[];
  company_name: string[];
  email_score_range: string[];
  has_email: string;
  has_phone: string;
}

interface VisibleFields {
  linkedin_url: boolean;
  job_title: boolean;
  company_name: boolean;
  company_website: boolean;
  department: boolean;
  start_date: boolean;
  email: boolean;
  email_score: boolean;
  phone_number: boolean;
  location_city: boolean;
  location_state: boolean;
  location_region: boolean;
  created_at: boolean;
  updated_at: boolean;
}

export default function AdminContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showFieldSelector, setShowFieldSelector] = useState(false);

  const [filters, setFilters] = useState<FilterState>({
    job_title: [],
    department: [],
    location_city: [],
    location_state: [],
    location_region: [],
    company_name: [],
    email_score_range: [],
    has_email: '',
    has_phone: ''
  });

  const [visibleFields, setVisibleFields] = useState<VisibleFields>({
    linkedin_url: true,
    job_title: true,
    company_name: true,
    company_website: false,
    department: true,
    start_date: true,
    email: true,
    email_score: true,
    phone_number: true,
    location_city: true,
    location_state: true,
    location_region: false,
    created_at: false,
    updated_at: false
  });

  // Get unique values for filter options
  const getUniqueValues = (field: string) => {
    let values: string[] = [];
    
    if (field === 'company_name') {
      values = contacts
        .map(contact => contact.company?.company_name)
        .filter(value => value && value !== '')
        .filter((value, index, self) => self.indexOf(value) === index) as string[];
    } else {
      values = contacts
        .map(contact => contact[field as keyof Contact])
        .filter(value => value && value !== '')
        .filter((value, index, self) => self.indexOf(value) === index) as string[];
    }
    
    return values.sort();
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [contacts, searchQuery, filters]);

  const fetchContacts = async () => {
    try {
      setRefreshing(true);
      console.log('Fetching contacts...');
      
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          *,
          company:companies(*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching contacts:', error);
        throw error;
      }
      
      console.log('Contacts fetched:', data?.length || 0);
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = () => {
    let filtered = contacts;

    // Apply search query
    if (searchQuery) {
      filtered = filtered.filter(contact =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.job_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.company?.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.location_city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.location_state.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.department?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply filters
    Object.entries(filters).forEach(([field, values]) => {
      if (field === 'company_name' && Array.isArray(values) && values.length > 0) {
        filtered = filtered.filter(contact => 
          values.includes(contact.company?.company_name || '')
        );
      } else if (field === 'email_score_range' && Array.isArray(values) && values.length > 0) {
        filtered = filtered.filter(contact => {
          if (!contact.email_score) return values.includes('No Score');
          
          return values.some(range => {
            switch (range) {
              case '90-100': return contact.email_score >= 90;
              case '80-89': return contact.email_score >= 80 && contact.email_score < 90;
              case '70-79': return contact.email_score >= 70 && contact.email_score < 80;
              case '60-69': return contact.email_score >= 60 && contact.email_score < 70;
              case 'Below 60': return contact.email_score < 60;
              case 'No Score': return !contact.email_score;
              default: return false;
            }
          });
        });
      } else if (field === 'has_email' && values) {
        if (values === 'yes') {
          filtered = filtered.filter(contact => contact.email && contact.email.trim() !== '');
        } else if (values === 'no') {
          filtered = filtered.filter(contact => !contact.email || contact.email.trim() === '');
        }
      } else if (field === 'has_phone' && values) {
        if (values === 'yes') {
          filtered = filtered.filter(contact => contact.phone_number && contact.phone_number.trim() !== '');
        } else if (values === 'no') {
          filtered = filtered.filter(contact => !contact.phone_number || contact.phone_number.trim() === '');
        }
      } else if (Array.isArray(values) && values.length > 0) {
        filtered = filtered.filter(contact => {
          const contactValue = contact[field as keyof Contact];
          return values.includes(contactValue as string);
        });
      }
    });

    setFilteredContacts(filtered);
  };

  const updateVisibility = async (contactId: string, tier: SubscriptionTier, isVisible: boolean) => {
    setUpdating(contactId);
    
    try {
      const contact = contacts.find(c => c.contact_id === contactId);
      if (!contact) return;

      let updatedTiers = [...(contact.visible_to_tiers || [])];
      
      if (isVisible) {
        if (!updatedTiers.includes(tier)) {
          updatedTiers.push(tier);
        }
      } else {
        updatedTiers = updatedTiers.filter(t => t !== tier);
      }

      const { error } = await supabase
        .from('contacts')
        .update({ visible_to_tiers: updatedTiers })
        .eq('contact_id', contactId);

      if (error) throw error;

      // Update local state
      setContacts(prev => prev.map(c => 
        c.contact_id === contactId 
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
    setFilters(prev => {
      if (field === 'has_email' || field === 'has_phone') {
        return {
          ...prev,
          [field]: checked ? value : ''
        };
      } else {
        const currentValues = prev[field] as string[];
        return {
          ...prev,
          [field]: checked 
            ? [...currentValues, value]
            : currentValues.filter(v => v !== value)
        };
      }
    });
  };

  const clearFilters = () => {
    setFilters({
      job_title: [],
      department: [],
      location_city: [],
      location_state: [],
      location_region: [],
      company_name: [],
      email_score_range: [],
      has_email: '',
      has_phone: ''
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
    let count = 0;
    Object.entries(filters).forEach(([key, value]) => {
      if (key === 'has_email' || key === 'has_phone') {
        if (value) count++;
      } else if (Array.isArray(value)) {
        count += value.length;
      }
    });
    return count;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short'
    });
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
          <h2 className="text-2xl font-bold text-gray-900">Contacts Database</h2>
          <p className="text-gray-600 mt-1">
            Manage contact data visibility by subscription tier
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={fetchContacts}
            disabled={refreshing}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <span className="text-sm text-gray-600">
            Total: {contacts.length} contacts
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
              placeholder="Search contacts by name, title, email, company, or location..."
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
            <Users className="w-4 h-4 mr-2" />
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
              {/* Job Title Filter */}
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">Job Title</h5>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {getUniqueValues('job_title').map((title) => (
                    <label key={title} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.job_title.includes(title)}
                        onChange={(e) => handleFilterChange('job_title', title, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">{title}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Department Filter */}
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">Department</h5>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {getUniqueValues('department').map((dept) => (
                    <label key={dept} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.department.includes(dept)}
                        onChange={(e) => handleFilterChange('department', dept, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">{dept}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Company Filter */}
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">Company</h5>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {getUniqueValues('company_name').map((company) => (
                    <label key={company} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.company_name.includes(company)}
                        onChange={(e) => handleFilterChange('company_name', company, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">{company}</span>
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
                        checked={filters.location_city.includes(city)}
                        onChange={(e) => handleFilterChange('location_city', city, e.target.checked)}
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
                        checked={filters.location_state.includes(state)}
                        onChange={(e) => handleFilterChange('location_state', state, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">{state}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Email Score Filter */}
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">Email Score</h5>
                <div className="space-y-2">
                  {['90-100', '80-89', '70-79', '60-69', 'Below 60', 'No Score'].map((range) => (
                    <label key={range} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.email_score_range.includes(range)}
                        onChange={(e) => handleFilterChange('email_score_range', range, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">{range}%</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Has Email Filter */}
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">Has Email</h5>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="has_email"
                      checked={filters.has_email === 'yes'}
                      onChange={(e) => handleFilterChange('has_email', 'yes', e.target.checked)}
                      className="border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">Yes</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="has_email"
                      checked={filters.has_email === 'no'}
                      onChange={(e) => handleFilterChange('has_email', 'no', e.target.checked)}
                      className="border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">No</span>
                  </label>
                </div>
              </div>

              {/* Has Phone Filter */}
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">Has Phone</h5>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="has_phone"
                      checked={filters.has_phone === 'yes'}
                      onChange={(e) => handleFilterChange('has_phone', 'yes', e.target.checked)}
                      className="border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">Yes</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="has_phone"
                      checked={filters.has_phone === 'no'}
                      onChange={(e) => handleFilterChange('has_phone', 'no', e.target.checked)}
                      className="border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">No</span>
                  </label>
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
            Showing {filteredContacts.length} of {contacts.length} contacts
          </span>
          {getActiveFiltersCount() > 0 && (
            <span className="text-sm text-blue-600">
              {getActiveFiltersCount()} filter{getActiveFiltersCount() !== 1 ? 's' : ''} applied
            </span>
          )}
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                  Contact
                </th>
                {visibleFields.job_title && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                    Job Title
                  </th>
                )}
                {visibleFields.company_name && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                    Company
                  </th>
                )}
                {visibleFields.department && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                    Department
                  </th>
                )}
                {visibleFields.start_date && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                    Start Date
                  </th>
                )}
                {visibleFields.email && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                    Email
                  </th>
                )}
                {visibleFields.phone_number && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                    Phone
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
                {visibleFields.created_at && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                    Created
                  </th>
                )}
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                  Visibility by Tier
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredContacts.map((contact) => (
                <tr key={contact.contact_id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="flex items-center min-w-0">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                        <span className="text-purple-600 font-semibold text-sm">
                          {contact.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {contact.name}
                          </div>
                          {visibleFields.linkedin_url && contact.linkedin_url && (
                            <a
                              href={contact.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-gray-400 hover:text-blue-600 transition-colors flex-shrink-0"
                              title="View LinkedIn profile"
                            >
                              <Linkedin className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  {visibleFields.job_title && (
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">{contact.job_title}</div>
                    </td>
                  )}
                  {visibleFields.company_name && (
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-2">
                        <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div className="text-sm text-gray-900 truncate">
                          {contact.company?.company_name || 'Unknown Company'}
                        </div>
                        {visibleFields.company_website && contact.company?.website && (
                          <a
                            href={formatWebsiteUrl(contact.company.website)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors flex-shrink-0"
                            title="Visit company website"
                          >
                            <Globe className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </td>
                  )}
                  {visibleFields.department && (
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">{contact.department || '-'}</div>
                    </td>
                  )}
                  {visibleFields.start_date && (
                    <td className="px-4 py-4">
                      <div className="flex items-center text-sm text-gray-900">
                        <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                        {formatDate(contact.start_date)}
                      </div>
                    </td>
                  )}
                  {visibleFields.email && (
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        {contact.email ? (
                          <div className="flex items-center text-sm text-gray-700">
                            <Mail className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{contact.email}</span>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">-</div>
                        )}
                        {visibleFields.email_score && contact.email_score && (
                          <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            {contact.email_score}% verified
                          </span>
                        )}
                      </div>
                    </td>
                  )}
                  {visibleFields.phone_number && (
                    <td className="px-4 py-4">
                      {contact.phone_number ? (
                        <div className="flex items-center text-sm text-gray-700">
                          <Phone className="w-4 h-4 mr-2 text-gray-400" />
                          <span>{contact.phone_number}</span>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">-</div>
                      )}
                    </td>
                  )}
                  {visibleFields.location_city && (
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">{contact.location_city}</div>
                    </td>
                  )}
                  {visibleFields.location_state && (
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">{contact.location_state}</div>
                    </td>
                  )}
                  {visibleFields.location_region && (
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">{contact.location_region}</div>
                    </td>
                  )}
                  {visibleFields.created_at && (
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">
                        {new Date(contact.created_at).toLocaleDateString()}
                      </div>
                    </td>
                  )}
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center space-x-3">
                      {tiers.map((tier) => {
                        const isVisible = contact.visible_to_tiers?.includes(tier) || false;
                        const isUpdating = updating === contact.contact_id;
                        
                        return (
                          <div key={tier} className="flex flex-col items-center space-y-1">
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isVisible}
                                onChange={(e) => updateVisibility(contact.contact_id, tier, e.target.checked)}
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

        {filteredContacts.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No contacts found</h3>
            <p className="text-gray-600">
              {searchQuery || getActiveFiltersCount() > 0 
                ? 'Try adjusting your search terms or filters' 
                : 'Upload some contact data to get started'
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