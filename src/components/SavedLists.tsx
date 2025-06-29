import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Download, Users, Calendar, Edit3, Building2, Star, Check, X } from 'lucide-react';
import { SavedList } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface SavedListWithItems extends SavedList {
  companies?: any[];
  contacts?: any[];
}

export default function SavedLists() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'companies' | 'contacts'>('companies');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingList, setEditingList] = useState<SavedListWithItems | null>(null);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [companyLists, setCompanyLists] = useState<SavedListWithItems[]>([]);
  const [contactLists, setContactLists] = useState<SavedListWithItems[]>([]);

  useEffect(() => {
    loadLists();
  }, [user]);

  const loadLists = () => {
    // Load company lists from localStorage
    const savedCompanyLists = localStorage.getItem(`company_lists_${user?.id}`);
    if (savedCompanyLists) {
      const parsedLists = JSON.parse(savedCompanyLists).map((list: any) => ({
        ...list,
        created_at: new Date(list.created_at),
        updated_at: new Date(list.updated_at)
      }));
      setCompanyLists(parsedLists);
    } else {
      // Create some sample company lists
      const sampleCompanyLists = [
        {
          id: '1',
          user_id: user?.id || '',
          name: 'Tech Startups',
          description: 'Promising technology startups in Silicon Valley',
          contact_count: 15,
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          companies: [
            { company_id: '1', company_name: 'TechCorp Inc.', industry: 'Software', location_city: 'San Francisco', size_range: '201-500' },
            { company_id: '2', company_name: 'InnovateLabs', industry: 'AI/ML', location_city: 'Palo Alto', size_range: '51-200' },
            { company_id: '3', company_name: 'DataFlow Systems', industry: 'Data Analytics', location_city: 'Mountain View', size_range: '101-500' }
          ]
        },
        {
          id: '2',
          user_id: user?.id || '',
          name: 'Fortune 500 Companies',
          description: 'Large enterprise companies for partnership opportunities',
          contact_count: 8,
          created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          companies: [
            { company_id: '4', company_name: 'Global Corp', industry: 'Manufacturing', location_city: 'New York', size_range: '10000+' },
            { company_id: '5', company_name: 'MegaTech Solutions', industry: 'Technology', location_city: 'Seattle', size_range: '5001-10000' }
          ]
        }
      ];
      setCompanyLists(sampleCompanyLists);
      localStorage.setItem(`company_lists_${user?.id}`, JSON.stringify(sampleCompanyLists));
    }

    // Load contact lists from localStorage
    const savedContactLists = localStorage.getItem(`contact_lists_${user?.id}`);
    if (savedContactLists) {
      const parsedLists = JSON.parse(savedContactLists).map((list: any) => ({
        ...list,
        created_at: new Date(list.created_at),
        updated_at: new Date(list.updated_at)
      }));
      setContactLists(parsedLists);
    } else {
      // Create some sample contact lists
      const sampleContactLists = [
        {
          id: '1',
          user_id: user?.id || '',
          name: 'Engineering Leaders',
          description: 'CTOs, VPs of Engineering, and Tech Directors',
          contact_count: 12,
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          contacts: [
            { contact_id: '1', name: 'Sarah Johnson', job_title: 'VP of Engineering', company_name: 'TechCorp Inc.', email: 'sarah@techcorp.com' },
            { contact_id: '2', name: 'Michael Chen', job_title: 'CTO', company_name: 'InnovateLabs', email: 'michael@innovatelabs.com' },
            { contact_id: '3', name: 'Emily Rodriguez', job_title: 'Engineering Director', company_name: 'DataFlow Systems', email: 'emily@dataflow.com' }
          ]
        },
        {
          id: '2',
          user_id: user?.id || '',
          name: 'Sales Prospects',
          description: 'Potential customers for Q1 outreach campaign',
          contact_count: 25,
          created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          contacts: [
            { contact_id: '4', name: 'David Kim', job_title: 'Head of Sales', company_name: 'Global Corp', email: 'david@globalcorp.com' },
            { contact_id: '5', name: 'Lisa Wang', job_title: 'Sales Director', company_name: 'MegaTech Solutions', email: 'lisa@megatech.com' }
          ]
        }
      ];
      setContactLists(sampleContactLists);
      localStorage.setItem(`contact_lists_${user?.id}`, JSON.stringify(sampleContactLists));
    }
  };

  const saveCompanyLists = (newLists: SavedListWithItems[]) => {
    localStorage.setItem(`company_lists_${user?.id}`, JSON.stringify(newLists));
    setCompanyLists(newLists);
  };

  const saveContactLists = (newLists: SavedListWithItems[]) => {
    localStorage.setItem(`contact_lists_${user?.id}`, JSON.stringify(newLists));
    setContactLists(newLists);
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
        ['Company Name', 'Industry', 'Location', 'Size', 'Date Added'].join(','),
        ...list.companies.map((company: any) => [
          company.company_name,
          company.industry,
          company.location_city,
          company.size_range,
          new Date().toLocaleDateString()
        ].map(field => `"${field}"`).join(','))
      ].join('\n');
      filename = `${list.name.replace(/\s+/g, '_')}_companies_export.csv`;
    } else if (activeTab === 'contacts' && list.contacts) {
      csvContent = [
        ['Name', 'Job Title', 'Company', 'Email', 'Date Added'].join(','),
        ...list.contacts.map((contact: any) => [
          contact.name,
          contact.job_title,
          contact.company_name || '',
          contact.email || '',
          new Date().toLocaleDateString()
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

  const currentLists = activeTab === 'companies' ? companyLists : contactLists;
  const filteredLists = currentLists.filter(list =>
    list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    list.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              <button className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">
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