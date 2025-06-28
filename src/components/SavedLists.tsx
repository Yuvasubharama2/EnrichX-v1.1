import React, { useState } from 'react';
import { Plus, Search, Trash2, Download, Users, Calendar, Edit3 } from 'lucide-react';
import { SavedList } from '../types';

export default function SavedLists() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');

  // Mock data
  const mockLists: SavedList[] = [
    {
      id: '1',
      user_id: '1',
      name: 'VP Engineering Prospects',
      description: 'Senior engineering leaders at Series B+ companies',
      contact_count: 47,
      created_at: new Date('2024-01-15'),
      updated_at: new Date('2024-01-20')
    },
    {
      id: '2',
      user_id: '1',
      name: 'Fintech Sales Leaders',
      description: 'Sales directors and VPs in financial technology',
      contact_count: 23,
      created_at: new Date('2024-01-10'),
      updated_at: new Date('2024-01-18')
    },
    {
      id: '3',
      user_id: '1',
      name: 'Healthcare CTOs',
      description: 'Technology executives in healthcare and biotech',
      contact_count: 15,
      created_at: new Date('2024-01-05'),
      updated_at: new Date('2024-01-15')
    }
  ];

  const handleCreateList = () => {
    // Mock create functionality
    console.log('Creating list:', { name: newListName, description: newListDescription });
    setShowCreateModal(false);
    setNewListName('');
    setNewListDescription('');
  };

  const filteredLists = mockLists.filter(list =>
    list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    list.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Saved Lists</h1>
            <p className="text-gray-600 mt-1">
              Organize and manage your contact collections
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

      {/* Lists Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLists.map((list) => (
          <div key={list.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{list.name}</h3>
                <p className="text-gray-600 text-sm line-clamp-2">{list.description}</p>
              </div>
              <div className="flex items-center space-x-1 ml-4">
                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
                  <Edit3 className="w-4 h-4" />
                </button>
                <button className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center text-gray-600">
                <Users className="w-4 h-4 mr-2" />
                <span className="text-sm">{list.contact_count} contacts</span>
              </div>
              <div className="flex items-center text-gray-500">
                <Calendar className="w-4 h-4 mr-1" />
                <span className="text-xs">
                  {list.updated_at.toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">
                View Contacts
              </button>
              <button className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
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
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No lists found</h3>
          <p className="text-gray-600 mb-6">
            {searchQuery ? 'Try adjusting your search terms' : 'Create your first list to get started'}
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
                <h3 className="text-lg font-medium text-gray-900 mb-4">Create New List</h3>
                
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
                  onClick={() => setShowCreateModal(false)}
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
