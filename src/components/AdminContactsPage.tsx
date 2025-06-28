import React, { useState, useEffect } from 'react';
import { Users, Search, Building2, Mail, Phone, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type Contact = Database['public']['Tables']['contacts']['Row'] & {
  company?: Database['public']['Tables']['companies']['Row'];
};
type SubscriptionTier = Database['public']['Enums']['subscription_tier'];

export default function AdminContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          *,
          company:companies(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
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

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.job_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.company?.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <span className="text-sm text-gray-600">
            Total: {contacts.length} contacts
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search contacts by name, title, email, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Visibility by Tier
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredContacts.map((contact) => (
                <tr key={contact.contact_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-purple-600 font-semibold text-sm">
                          {contact.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {contact.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {contact.job_title}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Building2 className="w-4 h-4 text-gray-400 mr-2" />
                      <div className="text-sm text-gray-900">
                        {contact.company?.company_name || 'Unknown Company'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      {contact.email && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail className="w-4 h-4 mr-2" />
                          {contact.email}
                          {contact.email_score && (
                            <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                              {contact.email_score}%
                            </span>
                          )}
                        </div>
                      )}
                      {contact.phone_number && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="w-4 h-4 mr-2" />
                          {contact.phone_number}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {contact.location_city}, {contact.location_state}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center justify-center space-x-4">
                      {tiers.map((tier) => {
                        const isVisible = contact.visible_to_tiers?.includes(tier) || false;
                        const isUpdating = updating === contact.contact_id;
                        
                        return (
                          <div key={tier} className="flex items-center space-x-2">
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
              {searchQuery ? 'Try adjusting your search terms' : 'Upload some contact data to get started'}
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