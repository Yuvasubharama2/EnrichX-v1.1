import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Download, Users, Calendar, Edit3, Building2, Star, Check, X, Eye, ArrowLeft, Mail } from 'lucide-react';
import { SavedList } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface SavedListWithItems extends SavedList {
  companies?: any[];
  contacts?: any[];
}

export default function SavedLists() {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'companies' | 'contacts'>('companies');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingList, setEditingList] = useState<SavedListWithItems | null>(null);
  const [viewingList, setViewingList] = useState<SavedListWithItems | null>(null);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [companyLists, setCompanyLists] = useState<SavedListWithItems[]>([]);
  const [contactLists, setContactLists] = useState<SavedListWithItems[]>([]);
  const [revealedEmails, setRevealedEmails] = useState<string[]>([]);

  useEffect(() => {
    loadLists();
    loadRevealedEmails();
  }, [user]);

  const loadLists = () => {
    // Load company lists from localStorage with real-time sync
    const savedCompanyLists = localStorage.getItem(`company_lists_${user?.id}`);
    if (savedCompanyLists) {
      const parsedLists = JSON.parse(savedCompanyLists).map((list: any) => ({
        ...list,
        created_at: new Date(list.created_at),
        updated_at: new Date(list.updated_at)
      }));
      setCompanyLists(parsedLists);
    }

    // Load contact lists from localStorage with real-time sync
    const savedContactLists = localStorage.getItem(`contact_lists_${user?.id}`);
    if (savedContactLists) {
      const parsedLists = JSON.parse(savedContactLists).map((list: any) => ({
        ...list,
        created_at: new Date(list.created_at),
        updated_at: new Date(list.updated_at)
      }));
      setContactLists(parsedLists);
    }

    // Set up real-time sync for saved lists
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `company_lists_${user?.id}` && e.newValue) {
        const parsedLists = JSON.parse(e.newValue).map((list: any) => ({
          ...list,
          created_at: new Date(list.created_at),
          updated_at: new Date(list.updated_at)
        }));
        setCompanyLists(parsedLists);
      }
      if (e.key === `contact_lists_${user?.id}` && e.newValue) {
        const parsedLists = JSON.parse(e.newValue).map((list: any) => ({
          ...list,
          created_at: new Date(list.created_at),
          updated_at: new Date(list.updated_at)
        }));
        setContactLists(parsedLists);
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
      
      // Update user profile in the profiles table
      const { error } = await supabase
        .from('profiles')
        .update({ credits_remaining: newCredits })
        .eq('user_id', user.id);

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

  const saveCompanyLists = (newLists: SavedListWithItems[]) => {
    localStorage.setItem(`company_lists_${user?.id}`, JSON.stringify(newLists));
    setCompanyLists(newLists);
    
    // Trigger storage event for real-time sync
    window.dispatchEvent(new StorageEvent('storage', {
      key: `company_lists_${user?.id}`,
      newValue: JSON.stringify(newLists)
    }));
  };

  const saveContactLists = (newLists: SavedListWithItems[]) => {
    localStorage.setItem(`contact_lists_${user?.id}`, JSON.stringify(newLists));
    setContactLists(newLists);
    
    // Trigger storage event for real-time sync
    window.dispatchEvent(new StorageEvent('storage', {
      key: `contact_lists_${user?.id}`,
      newValue: JSON.stringify(newLists)
    }));
  };

  const handleCreateList = () => {
    const newList: SavedListWithItems = {
      id: Date.now().toString(),
      user_id: user?.id || '',
      name: newListName,
      description: newListDescription,
      contact_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
      companies: activeTab === 'companies' ? [] : undefined,
      contacts: activeTab === 'contacts' ? [] : undefined
    };

    if (activeTab === 'companies') {
      const updatedLists = [...companyLists, newList];
      saveCompanyLists(updatedLists);
    } else {
      const updatedLists = [...contactLists, newList];
      saveContactLists(updatedLists);
    }
    
    setShowCreateModal(false);
    setNewListName('');
    setNewListDescription('');
  };

  const handleEditList = (list: SavedListWithItems) => {
    setEditingList(list);
    setNewListName(list.name);
    setNewListDescription(list.description || '');
    setShowCreateModal(true);
  };

  const handleUpdateList = () => {
    if (!editingList) return;

    const updatedList = {
      ...editingList,
      name: newListName,
      description: newListDescription,
      updated_at: new Date()
    };

    if (activeTab === 'companies') {
      const updatedLists = companyLists.map(list => 
        list.id === editingList.id ? updatedList : list
      );
      saveCompanyLists(updatedLists);
    } else {
      const updatedLists = contactLists.map(list => 
        list.id === editingList.id ? updatedList : list
      );
      saveContactLists(updatedLists);
    }

    setShowCreateModal(false);
    setEditingList(null);
    setNewListName('');
    setNewListDescription('');
  };

  const handleDeleteList = (listId: string) => {
    if (confirm('Are you sure you want to delete this list?')) {
      if (activeTab === 'companies') {
        const updatedLists = companyLists.filter(list => list.id !== listId);
        saveCompanyLists(updatedLists);
      } else {
        const updatedLists = contactLists.filter(list => list.id !== listId);
        saveContactLists(updatedLists);
      }
    }
  };

  const handleExportList = (list: SavedListWithItems) => {
    let csvContent = '';
    let filename = '';

    if (activeTab === 'companies' && list.companies) {
      csvContent = [
        ['Company Name', 'Industry', 'Location', 'Size', 'Website', 'Date Added'].join(','),
        ...list.companies.map((company: any) => [
          company.company_name,
          company.industry,
          company.location_city,
          company.size_range,
          company.website || '',
          new Date(company.added_at || Date.now()).toLocaleDateString()
        ].map(field => `"${field}"`).join(','))
      ].join('\n');
      filename = `${list.name.replace(/\s+/g, '_')}_companies_export.csv`;
    } else if (activeTab === 'contacts' && list.contacts) {
      csvContent = [
        ['Name', 'Job Title', 'Company', 'Email', 'Phone', 'Date Added'].join(','),
        ...list.contacts.map((contact: any) => [
          contact.name,
          contact.job_title,
          contact.company_name || '',
          // Only include email if it's been revealed
          revealedEmails.includes(contact.contact_id) ? (contact.email || '') : '',
          contact.phone_number || '',
          new Date(contact.added_at || Date.now()).toLocaleDateString()
        ].map(field => `"${field}"`).join(','))
      ].join('\n');
      filename = `${list.name.replace(/\s+/g, '_')}_contacts_export.csv`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleViewList = (list: SavedListWithItems) => {
    setViewingList(list);
  };

  const currentLists = activeTab === 'companies' ? companyLists : contactLists;
  const filteredLists = currentLists.filter(list =>
    list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    list.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // If viewing a specific list, show the list details
  if (viewingList) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <button
              onClick={() => setViewingList(null)}
              className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Lists
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{viewingList.name}</h1>
              {viewingList.description && (
                <p className="text-gray-600 mt-1">{viewingList.description}</p>
              )}
            </div>
            <button
              onClick={() => handleExportList(viewingList)}
              className="flex items-center px-4 py-2 text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Export List
            </button>
          </div>

          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>
              {activeTab === 'companies' 
                ? `${viewingList.companies?.length || 0} companies`
                : `${viewingList.contacts?.length || 0} contacts`
              }
            </span>
            <span>•</span>
            <span>Created {viewingList.created_at.toLocaleDateString()}</span>
            <span>•</span>
            <span>Updated {viewingList.updated_at.toLocaleDateString()}</span>
          </div>
        </div>

        {/* List Content */}
        {activeTab === 'companies' && viewingList.companies ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Industry</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Website</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {viewingList.companies.map((company: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                            <Building2 className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="text-sm font-medium text-gray-900">{company.company_name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{company.industry}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {company.location_city}, {company.location_state}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{company.size_range}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {company.website ? (
                          <a
                            href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Visit
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'contacts' && viewingList.contacts ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {viewingList.contacts.map((contact: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-purple-600 font-semibold text-sm">
                              {contact.name.split(' ').map((n: string) => n[0]).join('')}
                            </span>
                          </div>
                          <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{contact.job_title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{contact.company_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {contact.email ? (
                          <div className="space-y-1">
                            {revealedEmails.includes(contact.contact_id) ? (
                              <div className="flex items-center text-sm text-gray-700">
                                <Mail className="w-4 h-4 mr-2 text-gray-400" />
                                <span>{contact.email}</span>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <div className="flex items-center text-sm text-gray-500">
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
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{contact.phone_number || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {activeTab === 'companies' ? (
                <Building2 className="w-8 h-8 text-gray-400" />
              ) : (
                <Users className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No {activeTab} in this list</h3>
            <p className="text-gray-600">This list is empty. Add some {activeTab} to get started.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Saved Lists</h1>
            <p className="text-gray-600 mt-1">
              Organize and manage your saved companies and contacts
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create List
          </button>
        </div>

        {/* Tab Selector */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 mb-6">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('companies')}
              className={`flex-1 flex items-center justify-center px-6 py-3 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'companies'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Building2 className="w-5 h-5 mr-2" />
              Company Lists
              <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                activeTab === 'companies' 
                  ? 'bg-white bg-opacity-20 text-white' 
                  : 'bg-blue-100 text-blue-600'
              }`}>
                {companyLists.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('contacts')}
              className={`flex-1 flex items-center justify-center px-6 py-3 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'contacts'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Users className="w-5 h-5 mr-2" />
              Contact Lists
              <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                activeTab === 'contacts' 
                  ? 'bg-white bg-opacity-20 text-white' 
                  : 'bg-blue-100 text-blue-600'
              }`}>
                {contactLists.length}
              </span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder={`Search ${activeTab} lists...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Lists Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLists.map((list) => (
          <div key={list.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    activeTab === 'companies' ? 'bg-blue-100' : 'bg-purple-100'
                  }`}>
                    {activeTab === 'companies' ? (
                      <Building2 className={`w-4 h-4 ${activeTab === 'companies' ? 'text-blue-600' : 'text-purple-600'}`} />
                    ) : (
                      <Users className={`w-4 h-4 ${activeTab === 'companies' ? 'text-blue-600' : 'text-purple-600'}`} />
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{list.name}</h3>
                </div>
                <p className="text-gray-600 text-sm line-clamp-2">{list.description}</p>
              </div>
              <div className="flex items-center space-x-1 ml-4">
                <button 
                  onClick={() => handleEditList(list)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDeleteList(list.id)}
                  className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center text-gray-600">
                {activeTab === 'companies' ? (
                  <Building2 className="w-4 h-4 mr-2" />
                ) : (
                  <Users className="w-4 h-4 mr-2" />
                )}
                <span className="text-sm">
                  {activeTab === 'companies' 
                    ? `${list.companies?.length || 0} companies`
                    : `${list.contacts?.length || 0} contacts`
                  }
                </span>
              </div>
              <div className="flex items-center text-gray-500">
                <Calendar className="w-4 h-4 mr-1" />
                <span className="text-xs">
                  {list.updated_at.toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Sample items preview */}
            {((activeTab === 'companies' && list.companies && list.companies.length > 0) ||
              (activeTab === 'contacts' && list.contacts && list.contacts.length > 0)) && (
              <div className="mb-4">
                <div className="space-y-2">
                  {activeTab === 'companies' 
                    ? list.companies?.slice(0, 2).map((company: any, index: number) => (
                        <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                          <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                            <Building2 className="w-3 h-3 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{company.company_name}</p>
                            <p className="text-xs text-gray-500">{company.industry}</p>
                          </div>
                        </div>
                      ))
                    : list.contacts?.slice(0, 2).map((contact: any, index: number) => (
                        <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                          <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-purple-600">
                              {contact.name.split(' ').map((n: string) => n[0]).join('')}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{contact.name}</p>
                            <p className="text-xs text-gray-500">{contact.job_title}</p>
                          </div>
                        </div>
                      ))
                  }
                  {((activeTab === 'companies' && list.companies && list.companies.length > 2) ||
                    (activeTab === 'contacts' && list.contacts && list.contacts.length > 2)) && (
                    <p className="text-xs text-gray-500 text-center">
                      +{(activeTab === 'companies' ? list.companies?.length : list.contacts?.length)! - 2} more {activeTab}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <button 
                onClick={() => handleViewList(list)}
                className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Eye className="w-4 h-4 mr-2" />
                View {activeTab === 'companies' ? 'Companies' : 'Contacts'}
              </button>
              <button 
                onClick={() => handleExportList(list)}
                className={`flex items-center px-3 py-2 text-sm font-medium border rounded-lg transition-colors ${
                  activeTab === 'companies'
                    ? 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100'
                    : 'text-purple-600 bg-purple-50 border-purple-200 hover:bg-purple-100'
                }`}
              >
                <Download className="w-4 h-4 mr-1" />
                Export
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredLists.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            {activeTab === 'companies' ? (
              <Building2 className="w-8 h-8 text-gray-400" />
            ) : (
              <Users className="w-8 h-8 text-gray-400" />
            )}
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No {activeTab} lists found</h3>
          <p className="text-gray-600 mb-6">
            {searchQuery 
              ? 'Try adjusting your search terms' 
              : `Create your first ${activeTab} list to get started`
            }
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Your First {activeTab === 'companies' ? 'Company' : 'Contact'} List
            </button>
          )}
        </div>
      )}

      {/* Create/Edit List Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => {
              setShowCreateModal(false);
              setEditingList(null);
              setNewListName('');
              setNewListDescription('');
            }} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center mb-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                    activeTab === 'companies' ? 'bg-blue-100' : 'bg-purple-100'
                  }`}>
                    {activeTab === 'companies' ? (
                      <Building2 className={`w-5 h-5 ${activeTab === 'companies' ? 'text-blue-600' : 'text-purple-600'}`} />
                    ) : (
                      <Users className={`w-5 h-5 ${activeTab === 'companies' ? 'text-blue-600' : 'text-purple-600'}`} />
                    )}
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {editingList ? 'Edit' : 'Create New'} {activeTab === 'companies' ? 'Company' : 'Contact'} List
                  </h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="listName" className="block text-sm font-medium text-gray-700 mb-2">
                      List Name
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
                  onClick={editingList ? handleUpdateList : handleCreateList}
                  disabled={!newListName.trim()}
                  className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4 mr-2" />
                  {editingList ? 'Update' : 'Create'} List
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingList(null);
                    setNewListName('');
                    setNewListDescription('');
                  }}
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