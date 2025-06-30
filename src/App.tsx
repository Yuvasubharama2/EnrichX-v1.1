import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import AdminLayout from './components/AdminLayout';
import UserLayout from './components/UserLayout';
import Dashboard from './components/Dashboard';
import CSVUpload from './components/CSVUpload';
import AdminCompaniesPage from './components/AdminCompaniesPage';
import AdminContactsPage from './components/AdminContactsPage';
import AdminUsersPage from './components/AdminUsersPage';
import UserDashboard from './components/UserDashboard';
import UserCompaniesPage from './components/UserCompaniesPage';
import SavedLists from './components/SavedLists';
import FavoritesPage from './components/FavoritesPage';
import BillingPage from './components/BillingPage';
import ProfilePage from './components/ProfilePage';
import ExportHistoryPage from './components/ExportHistoryPage';
import LandingPage from './components/LandingPage';

function AdminApp() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [uploadType, setUploadType] = useState<'companies' | 'contacts'>('companies');

  const handleNavigateToCompanies = () => {
    setActiveTab('companies');
  };

  const handleNavigateToContacts = () => {
    setActiveTab('contacts');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'upload':
        return (
          <CSVUpload 
            uploadType={uploadType} 
            onUploadTypeChange={setUploadType}
            onNavigateToCompanies={handleNavigateToCompanies}
            onNavigateToContacts={handleNavigateToContacts}
          />
        );
      case 'companies':
        return <AdminCompaniesPage />;
      case 'contacts':
        return <AdminContactsPage />;
      case 'users':
        return <AdminUsersPage />;
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
      case 'companies':
        return <UserCompaniesPage />;
      case 'lists':
        return <SavedLists />;
      case 'favorites':
        return <FavoritesPage />;
      case 'exports':
        return <ExportHistoryPage />;
      case 'profile':
        return <ProfilePage />;
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

// Protected Route Component
function ProtectedRoute({ children, requireAdmin = false }: { children: React.ReactNode; requireAdmin?: boolean }) {
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
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/search" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<LoginPage isSignup={true} />} />
        
        {/* Admin Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute requireAdmin>
            <AdminApp />
          </ProtectedRoute>
        } />
        
        {/* User Routes */}
        <Route path="/search" element={
          <ProtectedRoute>
            <UserApp />
          </ProtectedRoute>
        } />
        
        {/* Catch all route - redirect based on user role */}
        <Route path="*" element={<AuthRedirect />} />
      </Routes>
    </AuthProvider>
  );
}

// Component to handle redirects based on authentication state
function AuthRedirect() {
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
    return <Navigate to="/" replace />;
  }

  // Redirect based on user role
  if (user.role === 'admin') {
    return <Navigate to="/dashboard" replace />;
  } else {
    return <Navigate to="/search" replace />;
  }
}

export default App;