import React, { useState } from 'react';
import { Database, Mail, Lock, Eye, EyeOff, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface LoginPageProps {
  isSignup?: boolean;
}

export default function LoginPage({ isSignup: initialIsSignup = false }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(initialIsSignup);
  const [showPassword, setShowPassword] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState('pro');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password, isSignUp ? subscriptionTier : undefined);
      navigate(isSignUp ? '/upload' : '/search');
    } catch (error) {
      console.error('Authentication failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-4">
            <Database className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to EnrichX</h1>
          <p className="text-gray-600">
            {isSignUp ? 'Create your account to get started' : 'Sign in to access your dashboard'}
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
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
            {isSignUp && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Subscription Tier
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {['free', 'pro', 'enterprise'].map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setSubscriptionTier(tier)}
                      className={`px-4 py-3 rounded-lg text-sm font-medium capitalize transition-all ${
                        subscriptionTier === tier
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      {tier} plan
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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
                navigate(isSignUp ? '/login' : '/signup');
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>

          {/* Demo Credentials */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-600 mb-2 font-medium">Demo Credentials:</p>
            <div className="space-y-1 text-xs text-gray-500">
              <p><strong>Admin:</strong> admin@enrichx.com / admin123</p>
              <p><strong>User:</strong> user@enrichx.com / user123</p>
            </div>
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