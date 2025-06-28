import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom'; // Removed BrowserRouter import
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import AdminLayout from './components/AdminLayout';
import UserLayout from './components/UserLayout';
import Dashboard from './components/Dashboard';
import CSVUpload from './components/CSVUpload';
import UserDashboard from './components/UserDashboard';
import SavedLists from './components/SavedLists';
import BillingPage from './components/BillingPage';
import LandingPage from './components/LandingPage';

function AdminApp() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [uploadType, setUploadType] = useState<'companies' | 'contacts'>('companies');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'upload':
        return <CSVUpload uploadType={uploadType} onUploadTypeChange={setUploadType} />;
      case 'companies':
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Companies Management</h3>
            <p className="text-gray-600">Company data management interface coming soon...</p>
          </div>
        );
      case 'contacts':
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Contacts Management</h3>
            <p className="text-gray-600">Contact data management interface coming soon...</p>
          </div>
        );
      case 'settings':
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Settings</h3>
            <p className="text-gray-600">Admin settings and configuration options coming soon...</p>
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </AdminLayout>
  );
}

function UserApp() {
  const [activeTab, setActiveTab] = useState('search');

  const renderContent = () => {
    switch (activeTab) {
      case 'search':
        return <UserDashboard />;
      case 'lists':
        return <SavedLists />;
      case 'favorites':
        return (
          <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Favorites</h3>
              <p className="text-gray-600">Your favorite contacts will appear here...</p>
            </div>
          </div>
        );
      case 'exports':
        return (
          <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Export History</h3>
              <p className="text-gray-600">Your export history will appear here...</p>
            </div>
          </div>
        );
      case 'profile':
        return (
          <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Profile Settings</h3>
              <p className="text-gray-600">Profile management coming soon...</p>
            </div>
          </div>
        );
      case 'billing':
        return <BillingPage />;
      case 'settings':
        return (
          <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Account Settings</h3>
              <p className="text-gray-600">Account settings coming soon...</p>
            </div>
          </div>
        );
      default:
        return <UserDashboard />;
    }
  };

  return (
    <UserLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </UserLayout>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  return user.role === 'admin' ? <AdminApp /> : <UserApp />;
}

function App() {
  return (
    // Removed BrowserRouter wrapper here
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<LoginPage isSignup={true} />} />
        {/* The AppContent component will render the appropriate layout (Admin or User) */}
        <Route path="/*" element={<AppContent />} />
      </Routes>
    </AuthProvider>
    // Removed BrowserRouter wrapper here
  );
}

export default App;
