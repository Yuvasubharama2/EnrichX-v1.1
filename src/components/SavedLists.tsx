import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Download, Users, Calendar, Edit3, Building2, Heart, Star } from 'lucide-react';
import { SavedList } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface SavedListWithCompanies extends SavedList {
  companies?: any[];
}

export default function SavedLists() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [lists, setLists] = useState<SavedListWithCompanies[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);

  useEffect(() => {
    loadLists();
    loadFavorites();
  }, [user]);

  const loadLists = () => {
    // Load lists from localStorage for now
    const saved = localStorage.getItem(`lists_${user?.id}`);
    if (saved) {
      setLists(JSON.parse(saved));
    }
  };

  const loadFavorites = () => {
    // Load favorites from localStorage
    const savedFavorites = localStorage.getItem(`favorites_${user?.id}`);
    if (savedFavorites) {
      const favoriteIds = JSON.parse(savedFavorites);
      // Mock favorite companies data
      const mockFavorites = favoriteIds.map((id: string, index: number) => ({
        company_id: id,
        company_name: `Favorite Company ${index + 1}`,
        industry: 'Technology',
        location_city: 'San Francisco',
        size_range: '201-500',
        added_at: new Date()
      }));
      setFavorites(mockFavorites);
    }
  };

  const saveLists = (newLists: SavedListWithCompanies[]) => {
    localStorage.setItem(`lists_${user?.id}`, JSON.stringify(newLists));
    setLists(newLists);
  };

  const handleCreateList = () => {
    const newList: SavedListWithCompanies = {
      id: Date.now().toString(),
      user_id: user?.id || '',
      name: newListName,
      description: newListDescription,
      contact_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
      companies: []
    };

    const updatedLists = [...lists, newList];
    saveLists(updatedLists);
    
    setShowCreateModal(false);
    setNewListName('');
    setNewListDescription('');
  };

  const handleDeleteList = (listId: string) => {
    if (confirm('Are you sure you want to delete this list?')) {
      const updatedLists = lists.filter(list => list.id !== listId);
      saveLists(updatedLists);
    }
  };

  const handleExportList = (list: SavedListWithCompanies) => {
    // Mock export functionality
    const csvContent = [
      ['Company Name', 'Industry', 'Location', 'Size', 'Date Added'].join(','),
      ...(list.companies || []).map((company: any) => [
        company.company_name,
        company.industry,
        company.location_city,
        company.size_range,
        new Date(company.added_at).toLocaleDateString()
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${list.name.replace(/\s+/g, '_')}_export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportFavorites = () => {
    const csvContent = [
      ['Company Name', 'Industry', 'Location', 'Size', 'Date Added'].join(','),
      ...favorites.map((company: any) => [
        company.company_name,
        company.industry,
        company.location_city,
        company.size_range,
        new Date(company.added_at).toLocaleDateString()
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'favorites_export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLists = lists.filter(list =>
    list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    list.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Saved Lists & Favorites</h1>
            <p className="text-gray-600 mt-1">
              Organize and manage your contact and company collections
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

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search your lists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Favorites Section */}
      {favorites.length > 0 && (
        <div className="mb-8">
          <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Heart className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Favorite Companies</h2>
                  <p className="text-sm text-gray-600">{favorites.length} companies marked as favorites</p>
                </div>
              </div>
              <button
                onClick={handleExportFavorites}
                className="flex items-center px-4 py-2 text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Favorites
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {favorites.slice(0, 6).map((company) => (
                <div key={company.company_id} className="bg-white rounded-lg p-4 border border-red-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">{company.company_name}</h4>
                      <p className="text-xs text-gray-500">{company.industry}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {favorites.length > 6 && (
              <div className="mt-4 text-center">
                <span className="text-sm text-gray-600">
                  +{favorites.length - 6} more favorites
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lists Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLists.map((list) => (
          <div key={list.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{list.name}</h3>
                </div>
                <p className="text-gray-600 text-sm line-clamp-2">{list.description}</p>
              </div>
              <div className="flex items-center space-x-1 ml-4">
                <button 
                  onClick={() => {
                    setNewListName(list.name);
                    setNewListDescription(list.description || '');
                    setShowCreateModal(true);
                  }}
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
                <Building2 className="w-4 h-4 mr-2" />
                <span className="text-sm">{list.companies?.length || 0} companies</span>
              </div>
              <div className="flex items-center text-gray-500">
                <Calendar className="w-4 h-4 mr-1" />
                <span className="text-xs">
                  {list.updated_at.toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Sample companies preview */}
            {list.companies && list.companies.length > 0 && (
              <div className="mb-4">
                <div className="space-y-2">
                  {list.companies.slice(0, 2).map((company: any, index: number) => (
                    <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                      <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                        <Building2 className="w-3 h-3 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{company.company_name}</p>
                        <p className="text-xs text-gray-500">{company.industry}</p>
                      </div>
                    </div>
                  ))}
                  {list.companies.length > 2 && (
                    <p className="text-xs text-gray-500 text-center">
                      +{list.companies.length - 2} more companies
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <button className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">
                View Companies
              </button>
              <button 
                onClick={() => handleExportList(list)}
                className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Download className="w-4 h-4 mr-1" />
                Export
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredLists.length === 0 && favorites.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No lists or favorites found</h3>
          <p className="text-gray-600 mb-6">
            {searchQuery ? 'Try adjusting your search terms' : 'Create your first list or add some favorites to get started'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Your First List
            </button>
          )}
        </div>
      )}

      {/* Create List Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowCreateModal(false)} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <Plus className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">Create New List</h3>
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
                  onClick={handleCreateList}
                  disabled={!newListName.trim()}
                  className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create List
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewListName('');
                    setNewListDescription('');
                  }}
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