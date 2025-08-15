import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Plus, Star, Building2, Mail, Phone, MapPin, ExternalLink, Globe, ChevronDown, ChevronUp, X, Heart, BookmarkPlus, Check, Calendar, Linkedin, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';
import { useAuth } from '../contexts/AuthContext';

type Contact = Database['public']['Tables']['contacts']['Row'] & {
  company?: Database['public']['Tables']['companies']['Row'];
};

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
}

export default function UserDashboard() {
  const { user, updateUser } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [favoriteContacts, setFavoriteContacts] = useState<string[]>([]);
  const [revealedEmails, setRevealedEmails] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showFieldSelector, setShowFieldSelector] = useState(false);
  const [showSaveListModal, setShowSaveListModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');

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
    created_at: false
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
    loadFavorites();
    loadRevealedEmails();
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [contacts, searchQuery, filters]);

  const fetchContacts = async () => {
    if (!user) return;

    try {
      console.log('Fetching contacts for user tier:', user.subscription_tier);
      
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          *,
          company:companies(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('Raw contacts fetched:', data?.length || 0);
      
      // Filter contacts based on user's subscription tier
      const filteredData = (data || []).filter(contact => {
        const visibleTiers = contact.visible_to_tiers || [];
        const hasAccess = visibleTiers.includes(user.subscription_tier);
        console.log(`Contact ${contact.name}: visible_to_tiers=${visibleTiers}, user_tier=${user.subscription_tier}, hasAccess=${hasAccess}`);
        return hasAccess;
      });
      
      console.log('Filtered contacts for user:', filteredData.length);
      setContacts(filteredData);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = () => {
    // Load favorites from localStorage with real-time sync
    const saved = localStorage.getItem(`contact_favorites_${user?.id}`);
    if (saved) {
      setFavoriteContacts(JSON.parse(saved));
    }

    // Set up real-time sync for favorites
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `contact_favorites_${user?.id}` && e.newValue) {
        setFavoriteContacts(JSON.parse(e.newValue));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  };

  const loadRevealedEmails = () => {
    // Load revealed emails from localStorage with real-time sync
    const saved = localStorage.getItem(`revealed_emails_${user?.id}`);
    if (saved) {
      setRevealedEmails(JSON.parse(saved));
    }

    // Set up real-time sync for revealed emails
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `revealed_emails_${user?.id}` && e.newValue) {
        setRevealedEmails(JSON.parse(e.newValue));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  };

  const saveFavorites = (favorites: string[]) => {
    localStorage.setItem(`contact_favorites_${user?.id}`, JSON.stringify(favorites));
    setFavoriteContacts(favorites);
    
    // Trigger storage event for real-time sync
    window.dispatchEvent(new StorageEvent('storage', {
      key: `contact_favorites_${user?.id}`,
      newValue: JSON.stringify(favorites)
    }));
  };

  const saveRevealedEmails = (revealed: string[]) => {
    localStorage.setItem(`revealed_emails_${user?.id}`, JSON.stringify(revealed));
    setRevealedEmails(revealed);
    
    // Trigger storage event for real-time sync
    window.dispatchEvent(new StorageEvent('storage', {
      key: `revealed_emails_${user?.id}`,
      newValue: JSON.stringify(revealed)
    }));
  };

  const applyFilters = () => {
    let filtered = contacts;

    // Apply search query
    if (searchQuery) {
      filtered = filtered.filter(contact =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.job_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (revealedEmails.includes(contact.contact_id) && contact.email?.toLowerCase().includes(searchQuery.toLowerCase())) ||
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

  const handleSelectContact = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleSelectAll = () => {
    setSelectedContacts(
      selectedContacts.length === filteredContacts.length 
        ? [] 
        : filteredContacts.map(c => c.contact_id)
    );
  };

  const toggleFavorite = (contactId: string) => {
    const newFavorites = favoriteContacts.includes(contactId)
      ? favoriteContacts.filter(id => id !== contactId)
      : [...favoriteContacts, contactId];
    
    saveFavorites(newFavorites);
  };

  const handleRevealEmail = async (contactId: string) => {
    if (revealedEmails.includes(contactId)) {
      return; // Already revealed
    }

    if (!user || user.credits_remaining <= 0) {
      alert('Insufficient credits to reveal email');
      return;
    }

    try {
      console.log('Revealing email for contact:', contactId);
      console.log('Current user credits:', user.credits_remaining);
      
      // Deduct 1 credit from user
      const newCredits = user.credits_remaining - 1;
      
      // Update user profile in the profiles table
      const { error } = await supabase
        .from('profiles')
        .update({ credits_remaining: newCredits })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating credits:', error);
        throw error;
      }

      console.log('Credits updated successfully, new credits:', newCredits);

      // Add to revealed emails
      const newRevealed = [...revealedEmails, contactId];
      saveRevealedEmails(newRevealed);

      // Update user context
      updateUser({ credits_remaining: newCredits });

      console.log('Email revealed successfully, credits deducted');
    } catch (error) {
      console.error('Error revealing email:', error);
      alert('Failed to reveal email');
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

  const handleSaveToList = () => {
    if (selectedContacts.length === 0) return;
    setShowSaveListModal(true);
  };

  const handleCreateList = () => {
    if (!newListName.trim() || selectedContacts.length === 0) return;

    // Get selected contact data
    const selectedContactData = contacts.filter(c => selectedContacts.includes(c.contact_id));
    
    // Create new list
    const newList = {
      id: Date.now().toString(),
      user_id: user?.id || '',
      name: newListName,
      description: newListDescription,
      contact_count: selectedContactData.length,
      created_at: new Date(),
      updated_at: new Date(),
      contacts: selectedContactData.map(contact => ({
        contact_id: contact.contact_id,
        name: contact.name,
        job_title: contact.job_title,
        company_name: contact.company?.company_name || '',
        email: contact.email,
        phone_number: contact.phone_number,
        location_city: contact.location_city,
        location_state: contact.location_state,
        department: contact.department,
        linkedin_url: contact.linkedin_url,
        added_at: new Date()
      }))
    };

    // Load existing contact lists
    const existingLists = JSON.parse(localStorage.getItem(`contact_lists_${user?.id}`) || '[]');
    
    // Add new list
    const updatedLists = [...existingLists, newList];
    
    // Save to localStorage
    localStorage.setItem(`contact_lists_${user?.id}`, JSON.stringify(updatedLists));
    
    // Trigger storage event for real-time sync
    window.dispatchEvent(new StorageEvent('storage', {
      key: `contact_lists_${user?.id}`,
      newValue: JSON.stringify(updatedLists)
    }));
    
    // Show success message
    alert(`Successfully saved ${selectedContacts.length} contacts to "${newListName}"`);
    
    // Reset form and close modal
    setNewListName('');
    setNewListDescription('');
    setShowSaveListModal(false);
    setSelectedContacts([]);
  };

  const handleExport = () => {
    if (selectedContacts.length === 0) return;
    
    const selectedData = contacts.filter(c => selectedContacts.includes(c.contact_id));
    const csvContent = [
      // Header
      ['Name', 'Job Title', 'Company', 'Email', 'Phone', 'City', 'State', 'Start Date'].join(','),
      // Data rows
      ...selectedData.map(contact => [
        contact.name,
        contact.job_title,
        contact.company?.company_name || '',
        revealedEmails.includes(contact.contact_id) ? (contact.email || '') : '',
        contact.phone_number || '',
        contact.location_city,
        contact.location_state,
        formatDate(contact.start_date)
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contacts_export_${new Date().toISOString().split('T')[0]}.csv`;
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
            <h1 className="text-3xl font-bold text-gray-900">Contact Database</h1>
            <p className="text-gray-600 mt-1">
              Search and discover verified contacts and companies
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

        {/* Credit Usage Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <Mail className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Email Reveal Cost:</span>
            <span className="text-sm text-blue-800">1 email = 1 credit</span>
          </div>
        </div>

        {/* Search and Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, company, job title, email, or location..."
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
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions Bar */}
      {selectedContacts.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-blue-800 font-medium">
              {selectedContacts.length} contact{selectedContacts.length !== 1 ? 's' : ''} selected
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
                Export ({selectedContacts.length})
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
              checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0}
              onChange={handleSelectAll}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">
              Showing {filteredContacts.length.toLocaleString()} of {contacts.length.toLocaleString()} contacts
            </span>
          </div>
          {getActiveFiltersCount() > 0 && (
            <span className="text-sm text-blue-600">
              {getActiveFiltersCount()} filter{getActiveFiltersCount() !== 1 ? 's' : ''} applied
            </span>
          )}
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  <input
                    type="checkbox"
                    checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
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
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredContacts.map((contact) => (
                <tr key={contact.contact_id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedContacts.includes(contact.contact_id)}
                      onChange={() => handleSelectContact(contact.contact_id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center min-w-0">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                        <span className="text-purple-600 font-semibold text-sm">
                          {contact.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-semibold text-gray-900 truncate">
                            {contact.name}
                          </h4>
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
                          <div className="flex items-center space-x-2">
                            {revealedEmails.includes(contact.contact_id) ? (
                              <div className="flex items-center text-sm text-gray-700">
                                <Mail className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                                <span className="truncate">{contact.email}</span>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <div className="flex items-center text-sm text-gray-500">
                                  <Mail className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                                  <span>••••••@••••••.com</span>
                                </div>
                                <button
                                  onClick={() => handleRevealEmail(contact.contact_id)}
                                  disabled={user?.credits_remaining === 0}
                                  className="flex items-center px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title={user?.credits_remaining === 0 ? 'No credits remaining' : 'Reveal email'}
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  Reveal
                                </button>
                              </div>
                            )}
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
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => toggleFavorite(contact.contact_id)}
                        className={`p-2 rounded-lg transition-colors ${
                          favoriteContacts.includes(contact.contact_id)
                            ? 'text-red-600 bg-red-50 hover:bg-red-100'
                            : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                        }`}
                        title={favoriteContacts.includes(contact.contact_id) ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Heart className={`w-5 h-5 ${favoriteContacts.includes(contact.contact_id) ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredContacts.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No contacts found</h3>
            <p className="text-gray-600">
              {searchQuery || getActiveFiltersCount() > 0 
                ? 'Try adjusting your search terms or filters' 
                : 'No contacts are available for your subscription tier'
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
                  <h3 className="text-lg font-medium text-gray-900">Save to Contact List</h3>
                </div>
                
                <p className="text-sm text-gray-600 mb-4">
                  Save {selectedContacts.length} selected contacts to a new list.
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