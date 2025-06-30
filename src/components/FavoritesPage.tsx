import React, { useState, useEffect } from 'react';
import { Heart, Building2, Users, Search, Download, Trash2, Calendar, Mail, Phone, Globe, Linkedin, MapPin, Star, Filter, X, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type Company = Database['public']['Tables']['companies']['Row'];
type Contact = Database['public']['Tables']['contacts']['Row'] & {
  company?: Database['public']['Tables']['companies']['Row'];
};

interface FavoriteItem {
  id: string;
  type: 'company' | 'contact';
  data: Company | Contact;
  added_at: Date;
}

export default function FavoritesPage() {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'companies' | 'contacts'>('companies');
  const [favoriteCompanies, setFavoriteCompanies] = useState<string[]>([]);
  const [favoriteContacts, setFavoriteContacts] = useState<string[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [revealedEmails, setRevealedEmails] = useState<string[]>([]);

  useEffect(() => {
    loadFavorites();
    fetchData();
    loadRevealedEmails();
  }, [user]);

  const loadFavorites = () => {
    // Load favorites from localStorage with real-time sync
    const savedCompanyFavorites = localStorage.getItem(`favorites_${user?.id}`);
    const savedContactFavorites = localStorage.getItem(`contact_favorites_${user?.id}`);
    
    if (savedCompanyFavorites) {
      setFavoriteCompanies(JSON.parse(savedCompanyFavorites));
    }
    
    if (savedContactFavorites) {
      setFavoriteContacts(JSON.parse(savedContactFavorites));
    }

    // Set up real-time sync for favorites
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `favorites_${user?.id}` && e.newValue) {
        setFavoriteCompanies(JSON.parse(e.newValue));
      }
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

  const handleRevealEmail = async (contactId: string) => {
    if (revealedEmails.includes(contactId)) {
      return; // Already revealed
    }

    if (!user || user.credits_remaining <= 0) {
      alert('Insufficient credits to reveal email');
      return;
    }

    try {
      // Deduct 1 credit from user
      const newCredits = user.credits_remaining - 1;
      
      // Update user metadata in Supabase
      const { error } = await supabase.auth.updateUser({
        data: {
          ...user,
          credits_remaining: newCredits
        }
      });

      if (error) throw error;

      // Add to revealed emails
      const newRevealed = [...revealedEmails, contactId];
      localStorage.setItem(`revealed_emails_${user?.id}`, JSON.stringify(newRevealed));
      setRevealedEmails(newRevealed);

      // Update user context
      updateUser({ credits_remaining: newCredits });

      // Trigger storage event for real-time sync across tabs
      window.dispatchEvent(new StorageEvent('storage', {
        key: `revealed_emails_${user?.id}`,
        newValue: JSON.stringify(newRevealed)
      }));
    } catch (error) {
      console.error('Error revealing email:', error);
      alert('Failed to reveal email');
    }
  };

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (companiesError) throw companiesError;
      setCompanies(companiesData || []);

      // Fetch contacts with company data
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select(`
          *,
          company:companies(*)
        `)
        .order('created_at', { ascending: false });

      if (contactsError) throw contactsError;
      setContacts(contactsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = (id: string, type: 'company' | 'contact') => {
    if (type === 'company') {
      const newFavorites = favoriteCompanies.filter(fav => fav !== id);
      localStorage.setItem(`favorites_${user?.id}`, JSON.stringify(newFavorites));
      setFavoriteCompanies(newFavorites);
      
      // Trigger storage event for real-time sync
      window.dispatchEvent(new StorageEvent('storage', {
        key: `favorites_${user?.id}`,
        newValue: JSON.stringify(newFavorites)
      }));
    } else {
      const newFavorites = favoriteContacts.filter(fav => fav !== id);
      localStorage.setItem(`contact_favorites_${user?.id}`, JSON.stringify(newFavorites));
      setFavoriteContacts(newFavorites);
      
      // Trigger storage event for real-time sync
      window.dispatchEvent(new StorageEvent('storage', {
        key: `contact_favorites_${user?.id}`,
        newValue: JSON.stringify(newFavorites)
      }));
    }
  };

  const clearAllFavorites = (type: 'company' | 'contact') => {
    if (confirm(`Are you sure you want to remove all favorite ${type === 'company' ? 'companies' : 'contacts'}?`)) {
      if (type === 'company') {
        localStorage.setItem(`favorites_${user?.id}`, JSON.stringify([]));
        setFavoriteCompanies([]);
        
        // Trigger storage event for real-time sync
        window.dispatchEvent(new StorageEvent('storage', {
          key: `favorites_${user?.id}`,
          newValue: JSON.stringify([])
        }));
      } else {
        localStorage.setItem(`contact_favorites_${user?.id}`, JSON.stringify([]));
        setFavoriteContacts([]);
        
        // Trigger storage event for real-time sync
        window.dispatchEvent(new StorageEvent('storage', {
          key: `contact_favorites_${user?.id}`,
          newValue: JSON.stringify([])
        }));
      }
    }
  };

  const exportFavorites = (type: 'company' | 'contact') => {
    let csvContent = '';
    let filename = '';

    if (type === 'company') {
      const favoriteCompanyData = companies.filter(c => favoriteCompanies.includes(c.company_id));
      csvContent = [
        ['Company Name', 'Type', 'Industry', 'Website', 'City', 'State', 'Size', 'Revenue'].join(','),
        ...favoriteCompanyData.map(company => [
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
      filename = 'favorite_companies_export.csv';
    } else {
      const favoriteContactData = contacts.filter(c => favoriteContacts.includes(c.contact_id));
      csvContent = [
        ['Name', 'Job Title', 'Company', 'Email', 'Phone', 'City', 'State', 'Department'].join(','),
        ...favoriteContactData.map(contact => [
          contact.name,
          contact.job_title,
          contact.company?.company_name || '',
          revealedEmails.includes(contact.contact_id) ? (contact.email || '') : '',
          contact.phone_number || '',
          contact.location_city,
          contact.location_state,
          contact.department || ''
        ].map(field => `"${field}"`).join(','))
      ].join('\n');
      filename = 'favorite_contacts_export.csv';
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatWebsiteUrl = (website: string | null) => {
    if (!website) return null;
    if (website.startsWith('http://') || website.startsWith('https://')) {
      return website;
    }
    return `https://${website}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short'
    });
  };

  // Filter data based on search query
  const filteredCompanies = companies
    .filter(c => favoriteCompanies.includes(c.company_id))
    .filter(company => 
      !searchQuery || 
      company.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.location_city.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const filteredContacts = contacts
    .filter(c => favoriteContacts.includes(c.contact_id))
    .filter(contact => 
      !searchQuery || 
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.job_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (revealedEmails.includes(contact.contact_id) && contact.email?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      contact.company?.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Heart className="w-8 h-8 text-red-600 mr-3 fill-current" />
              My Favorites
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your favorite companies and contacts
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="bg-white px-4 py-2 rounded-lg border border-gray-200">
              <span className="text-sm text-gray-600">Total favorites:</span>
              <span className="font-semibold text-red-600 ml-1">
                {favoriteCompanies.length + favoriteContacts.length}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 mb-6">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('companies')}
              className={`flex-1 flex items-center justify-center px-6 py-3 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'companies'
                  ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Building2 className="w-5 h-5 mr-2" />
              Favorite Companies
              <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                activeTab === 'companies' 
                  ? 'bg-white bg-opacity-20 text-white' 
                  : 'bg-red-100 text-red-600'
              }`}>
                {favoriteCompanies.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('contacts')}
              className={`flex-1 flex items-center justify-center px-6 py-3 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'contacts'
                  ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Users className="w-5 h-5 mr-2" />
              Favorite Contacts
              <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                activeTab === 'contacts' 
                  ? 'bg-white bg-opacity-20 text-white' 
                  : 'bg-red-100 text-red-600'
              }`}>
                {favoriteContacts.length}
              </span>
            </button>
          </div>
        </div>

        {/* Search and Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 relative mr-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder={`Search favorite ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => exportFavorites(activeTab === 'companies' ? 'company' : 'contact')}
                disabled={activeTab === 'companies' ? favoriteCompanies.length === 0 : favoriteContacts.length === 0}
                className="flex items-center px-4 py-3 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
              <button
                onClick={() => clearAllFavorites(activeTab === 'companies' ? 'company' : 'contact')}
                disabled={activeTab === 'companies' ? favoriteCompanies.length === 0 : favoriteContacts.length === 0}
                className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'companies' ? (
        <div>
          {/* Companies Results Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Showing {filteredCompanies.length} of {favoriteCompanies.length} favorite companies
              </span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="flex items-center text-sm text-red-600 hover:text-red-700"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear search
                </button>
              )}
            </div>
          </div>

          {/* Companies Grid */}
          {filteredCompanies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCompanies.map((company) => (
                <div key={company.company_id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">{company.company_name}</h3>
                        <p className="text-sm text-gray-600">{company.industry}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFavorite(company.company_id, 'company')}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove from favorites"
                    >
                      <Heart className="w-5 h-5 fill-current" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800 font-medium">
                        {company.company_type}
                      </span>
                      <span className="ml-2">{company.size_range}</span>
                    </div>

                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                      <span>{company.location_city}, {company.location_state}</span>
                    </div>

                    {company.revenue && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Revenue:</span> {company.revenue}
                      </div>
                    )}

                    {company.technologies_used && company.technologies_used.length > 0 && (
                      <div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {company.technologies_used.slice(0, 3).map((tech, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800"
                            >
                              {tech}
                            </span>
                          ))}
                          {company.technologies_used.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{company.technologies_used.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center space-x-2">
                      {company.website && (
                        <a
                          href={formatWebsiteUrl(company.website)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Visit website"
                        >
                          <Globe className="w-4 h-4" />
                        </a>
                      )}
                      {company.linkedin_url && (
                        <a
                          href={company.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="View LinkedIn"
                        >
                          <Linkedin className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      Added {new Date(company.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? 'No companies found' : 'No favorite companies yet'}
              </h3>
              <p className="text-gray-600">
                {searchQuery 
                  ? 'Try adjusting your search terms' 
                  : 'Start adding companies to your favorites from the Companies page'
                }
              </p>
            </div>
          )}
        </div>
      ) : (
        <div>
          {/* Contacts Results Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Showing {filteredContacts.length} of {favoriteContacts.length} favorite contacts
              </span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="flex items-center text-sm text-red-600 hover:text-red-700"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear search
                </button>
              )}
            </div>
          </div>

          {/* Contacts List */}
          {filteredContacts.length > 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="divide-y divide-gray-200">
                {filteredContacts.map((contact) => (
                  <div key={contact.contact_id} className="p-6 hover:bg-gray-50 transition-colors group">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-purple-600 font-semibold text-sm">
                            {contact.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="text-lg font-semibold text-gray-900">{contact.name}</h4>
                            {contact.linkedin_url && (
                              <a
                                href={contact.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                title="View LinkedIn profile"
                              >
                                <Linkedin className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                          
                          <p className="text-gray-700 font-medium mb-2">{contact.job_title}</p>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                            <div className="flex items-center">
                              <Building2 className="w-4 h-4 mr-1" />
                              <span>{contact.company?.company_name || 'Unknown Company'}</span>
                            </div>
                            {contact.department && (
                              <div className="flex items-center">
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                  {contact.department}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            {contact.email && (
                              <div className="space-y-1">
                                {revealedEmails.includes(contact.contact_id) ? (
                                  <div className="flex items-center text-gray-700">
                                    <Mail className="w-4 h-4 mr-2 text-gray-400" />
                                    <span className="truncate">{contact.email}</span>
                                    {contact.email_score && (
                                      <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                        {contact.email_score}%
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center space-x-2">
                                    <div className="flex items-center text-gray-500">
                                      <Mail className="w-4 h-4 mr-2 text-gray-400" />
                                      <span>••••••@••••••.com</span>
                                    </div>
                                    <button
                                      onClick={() => handleRevealEmail(contact.contact_id)}
                                      disabled={user?.credits_remaining === 0}
                                      className="flex items-center px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      title={user?.credits_remaining === 0 ? 'No credits remaining' : 'Reveal email (1 credit)'}
                                    >
                                      <Eye className="w-3 h-3 mr-1" />
                                      Reveal (1 credit)
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {contact.phone_number && (
                              <div className="flex items-center text-gray-700">
                                <Phone className="w-4 h-4 mr-2 text-gray-400" />
                                <span>{contact.phone_number}</span>
                              </div>
                            )}
                            
                            <div className="flex items-center text-gray-600">
                              <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                              <span>{contact.location_city}, {contact.location_state}</span>
                            </div>
                            
                            {contact.start_date && (
                              <div className="flex items-center text-gray-600">
                                <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                                <span>Started {formatDate(contact.start_date)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => removeFavorite(contact.contact_id, 'contact')}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove from favorites"
                      >
                        <Heart className="w-5 h-5 fill-current" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? 'No contacts found' : 'No favorite contacts yet'}
              </h3>
              <p className="text-gray-600">
                {searchQuery 
                  ? 'Try adjusting your search terms' 
                  : 'Start adding contacts to your favorites from the Contacts page'
                }
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}