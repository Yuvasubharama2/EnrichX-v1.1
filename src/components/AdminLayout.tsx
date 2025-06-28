import React, { useState } from 'react';
import {
  Database,
  Upload,
  Users,
  Building2,
  Settings,
  LogOut,
  Menu,
  X,
  User
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function AdminLayout({ children, activeTab, onTabChange }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: Database },
    { id: 'companies', name: 'Companies', icon: Building2 },
    { id: 'contacts', name: 'Contacts', icon: Users },
    { id: 'upload', name: 'CSV Upload', icon: Upload },
    { id: 'settings', name: 'Settings', icon: Settings },
  ];

  return (
    // Changed outermost div to use flex for horizontal layout on large screens
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      {/* Adjusted lg classes for flex layout: static, fixed width, prevent shrinking */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 lg:translate-x-0 lg:static lg:w-64 lg:flex-shrink-0 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">EnrichX</h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation - Added flex-auto to make it grow */}
        <nav className="mt-6 px-4 flex-auto">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => onTabChange(item.id)}
                    className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                      activeTab === item.id
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom section - Removed absolute positioning */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">Admin User</p>
              <p className="text-xs text-gray-500 truncate">admin@enrichx.com</p>
            </div>
          </div>
          <button className="w-full flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <LogOut className="w-4 h-4 mr-3" />
            <span className="text-sm">Sign out</span>
          </button>
        </div>
      </div>

      {/* Main content area - Now a flex item that grows to fill space */}
      {/* Removed lg:pl-64 as the sidebar sibling handles the spacing */}
      <div className="flex flex-col flex-grow">
        {/* Top header */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Page Title - Placeholder */}
            <h2 className="text-xl font-semibold text-gray-800">
              {navigation.find(item => item.id === activeTab)?.name || 'Dashboard'}
            </h2>

            {/* User/Profile section - Placeholder */}
            <div className="flex items-center space-x-4">
              {/* Add user avatar/dropdown here */}
              <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        {/* Added flex-grow to make content area fill remaining vertical space */}
        <main className="p-6 flex-grow">
          {children}
        </main>
      </div>
    </div>
  );
}
