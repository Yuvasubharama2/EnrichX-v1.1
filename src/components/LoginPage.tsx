import React, { useState } from 'react';
import { Database, Mail, Lock, Eye, EyeOff, Check, Settings, User, Building2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Logo from './Logo';

interface LoginPageProps {
  isSignup?: boolean;
}

export default function LoginPage({ isSignup: initialIsSignup = false }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isSignUp, setIsSignUp] = useState(initialIsSignup);
  const [showPassword, setShowPassword] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState('pro');
  const [showDashboardChoice, setShowDashboardChoice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError(null);
    
    try {
      const result = await login(email, password, isSignUp ? { 
        subscriptionTier, 
        name: name || email.split('@')[0], 
        companyName 
      } : undefined);
      
      // Check if this is admin login (not signup) and show dashboard choice
      if (email === 'admin@enrichx.com' && !isSignUp && result?.role === 'admin') {
        setShowDashboardChoice(true);
      } else if (result?.role === 'admin') {
        // Admin signup or other admin login - go to admin dashboard
        navigate('/dashboard');
      } else {
        // Regular user - go to search dashboard
        navigate('/search');
      }
    } catch (error: any) {
      console.error('Authentication failed:', error);
      setError(error.message || 'Authentication failed. Please try again.');
    }
  };

  const handleDashboardChoice = (choice: 'admin' | 'user') => {
    setShowDashboardChoice(false);
    if (choice === 'admin') {
      navigate('/dashboard');
    } else {
      navigate('/search');
    }
  };

  if (showDashboardChoice) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <Logo size="xl" showText={true} className="justify-center mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Choose Dashboard</h1>
            <p className="text-gray-600">
              Select which dashboard you'd like to access
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <div className="space-y-4">
              <button
                onClick={() => handleDashboardChoice('admin')}
                className="w-full flex items-center justify-between p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl hover:from-blue-100 hover:to-purple-100 transition-all duration-200 group"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <Settings className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-gray-900">Admin Dashboard</h3>
                    <p className="text-sm text-gray-600">Manage data, uploads, and system settings</p>
                  </div>
                </div>
                <div className="w-6 h-6 border-2 border-blue-400 rounded-full flex items-center justify-center group-hover:border-blue-600 transition-colors">
                  <div className="w-2 h-2 bg-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
              </button>

              <button
                onClick={() => handleDashboardChoice('user')}
                className="w-full flex items-center justify-between p-6 bg-gray-50 border-2 border-gray-200 rounded-xl hover:bg-gray-100 transition-all duration-200 group"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-600 rounded-lg flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-gray-900">User Dashboard</h3>
                    <p className="text-sm text-gray-600">Search contacts and manage lists</p>
                  </div>
                </div>
                <div className="w-6 h-6 border-2 border-gray-400 rounded-full flex items-center justify-center group-hover:border-gray-600 transition-colors">
                  <div className="w-2 h-2 bg-gray-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
              </button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                You can switch between dashboards anytime from the navigation
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <Logo size="xl" showText={true} className="justify-center mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to EnrichX</h1>
          <p className="text-gray-600">
            {isSignUp ? 'Create your account to get started' : 'Sign in to access your dashboard'}
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {isSignUp && (
              <>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Building2 className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="companyName"
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter your company name"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                {isSignUp ? 'Create Password' : 'Password'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Subscription Tier Selection */}
            {isSignUp && email !== 'admin@enrichx.com' && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Subscription Plan
                </label>
                <div className="space-y-3">
                  {[
                    { id: 'free', name: 'Free', credits: 50, price: '$0' },
                    { id: 'pro', name: 'Pro', credits: 2000, price: '$49' },
                    { id: 'enterprise', name: 'Enterprise', credits: 10000, price: '$199' }
                  ].map((tier) => (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setSubscriptionTier(tier.id)}
                      className={`w-full p-4 rounded-lg text-left border-2 transition-all ${
                        subscriptionTier === tier.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900">{tier.name}</h4>
                          <p className="text-sm text-gray-600">{tier.credits.toLocaleString()} credits/month</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{tier.price}</p>
                          <p className="text-xs text-gray-500">/month</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-10"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                isSignUp ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                navigate(isSignUp ? '/login' : '/signup');
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 text-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
            <div>
              <div className="font-medium text-gray-900">10M+</div>
              <div>Verified Contacts</div>
            </div>
            <div>
              <div className="font-medium text-gray-900">500K+</div>
              <div>Companies</div>
            </div>
            <div>
              <div className="font-medium text-gray-900">95%</div>
              <div>Email Accuracy</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}