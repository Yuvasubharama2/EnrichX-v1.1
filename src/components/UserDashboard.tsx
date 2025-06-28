import React, { useState } from 'react';
import { Search, Filter, Download, Plus, Star, Building2, Mail, Phone, MapPin, ExternalLink } from 'lucide-react';
import { Contact, Company, SearchFilters } from '../types';
import { useAuth } from '../contexts/AuthContext';

export default function UserDashboard() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Mock data - replace with API calls
  const mockContacts: (Contact & { company: Company })[] = [
    {
      contact_id: '1',
      name: 'Sarah Johnson',
      job_title: 'VP of Engineering',
      email: 'sarah.johnson@techcorp.com',
      email_score: 95,
      phone_number: '+1 (555) 123-4567',
      linkedin_url: 'https://linkedin.com/in/sarahjohnson',
      location_city: 'San Francisco',
      location_state: 'CA',
      location_region: 'North America',
      company_id: '1',
      created_at: new Date(),
      updated_at: new Date(),
      company: {
        company_id: '1',
        company_name: 'TechCorp Inc.',
        company_type: 'Private',
        industry: 'Software',
        website: 'https://techcorp.com',
        linkedin_url: 'https://linkedin.com/company/techcorp',
        hq_location: 'San Francisco, CA',
        location_city: 'San Francisco',
        location_state: 'CA',
        location_region: 'North America',
        size_range: '201-500',
        headcount: 350,
        revenue: '$50M-$100M',
        company_keywords: ['SaaS', 'B2B', 'Enterprise'],
        industry_keywords: ['Software', 'Technology'],
        technologies_used: ['React', 'Node.js', 'AWS'],
        created_at: new Date(),
        updated_at: new Date()
      }
    },
    {
      contact_id: '2',
      name: 'Michael Chen',
      job_title: 'Head of Sales',
      email: 'michael.chen@financeplus.com',
      email_score: 88,
      phone_number: '+1 (555) 987-6543',
      linkedin_url: 'https://linkedin.com/in/michaelchen',
      location_city: 'New York',
      location_state: 'NY',
      location_region: 'North America',
      company_id: '2',
      created_at: new Date(),
      updated_at: new Date(),
      company: {
        company_id: '2',
        company_name: 'FinancePlus',
        company_type: 'Public',
        industry: 'Financial Services',
        website: 'https://financeplus.com',
        linkedin_url: 'https://linkedin.com/company/financeplus',
        hq_location: 'New York, NY',
        location_city: 'New York',
        location_state: 'NY',
        location_region: 'North America',
        size_range: '1001-5000',
        headcount: 2500,
        revenue: '$500M+',
        company_keywords: ['Fintech', 'Banking', 'Investment'],
        industry_keywords: ['Finance', 'Banking'],
        technologies_used: ['Java', 'Oracle', 'Salesforce'],
        created_at: new Date(),
        updated_at: new Date()
      }
    }
  ];

  const handleSelectContact = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleSelectAll = () => {
    setSelectedContacts(
      selectedContacts.length === mockContacts.length 
        ? [] 
        : mockContacts.map(c => c.contact_id)
    );
  };

  const handleExport = () => {
    // Mock export functionality
    console.log('Exporting contacts:', selectedContacts);
  };

  const handleSaveToList = () => {
    // Mock save to list functionality
    console.log('Saving to list:', selectedContacts);
  };

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

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, company, job title, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Filter className="w-5 h-5 mr-2" />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
              <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="">All Industries</option>
                <option value="software">Software</option>
                <option value="finance">Finance</option>
                <option value="healthcare">Healthcare</option>
              </select>
              <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="">All Locations</option>
                <option value="san-francisco">San Francisco</option>
                <option value="new-york">New York</option>
                <option value="london">London</option>
              </select>
              <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="">Company Size</option>
                <option value="1-50">1-50</option>
                <option value="51-200">51-200</option>
                <option value="201-500">201-500</option>
              </select>
              <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="">Job Level</option>
                <option value="c-level">C-Level</option>
                <option value="vp">VP</option>
                <option value="director">Director</option>
              </select>
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
                <Plus className="w-4 h-4 mr-2" />
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

      {/* Results */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {mockContacts.length.toLocaleString()} contacts found
            </h3>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedContacts.length === mockContacts.length}
                onChange={handleSelectAll}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">Select all</span>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {mockContacts.map((contact) => (
            <div key={contact.contact_id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start space-x-4">
                <input
                  type="checkbox"
                  checked={selectedContacts.includes(contact.contact_id)}
                  onChange={() => handleSelectContact(contact.contact_id)}
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-semibold text-gray-900">{contact.name}</h4>
                        {contact.linkedin_url && (
                          <a
                            href={contact.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                      
                      <p className="text-gray-700 font-medium mb-1">{contact.job_title}</p>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center">
                          <Building2 className="w-4 h-4 mr-1" />
                          {contact.company.company_name}
                        </div>
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          {contact.location_city}, {contact.location_state}
                        </div>
                      </div>

                      <div className="flex items-center space-x-6 text-sm">
                        {contact.email && (
                          <div className="flex items-center text-gray-700">
                            <Mail className="w-4 h-4 mr-2 text-gray-400" />
                            <span>{contact.email}</span>
                            <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                              {contact.email_score}% verified
                            </span>
                          </div>
                        )}
                        {contact.phone_number && (
                          <div className="flex items-center text-gray-700">
                            <Phone className="w-4 h-4 mr-2 text-gray-400" />
                            <span>{contact.phone_number}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button className="p-2 text-gray-400 hover:text-yellow-500 transition-colors">
                        <Star className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Company Info */}
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-gray-900">{contact.company.company_name}</h5>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                        {contact.company.size_range} employees
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Industry:</span> {contact.company.industry}
                      </div>
                      <div>
                        <span className="font-medium">Revenue:</span> {contact.company.revenue}
                      </div>
                      <div>
                        <span className="font-medium">Type:</span> {contact.company.company_type}
                      </div>
                      <div>
                        <span className="font-medium">Location:</span> {contact.company.hq_location}
                      </div>
                    </div>
                    {contact.company.technologies_used.length > 0 && (
                      <div className="mt-3">
                        <span className="text-sm font-medium text-gray-700">Technologies:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {contact.company.technologies_used.map((tech, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
