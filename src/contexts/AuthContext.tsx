import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, subscriptionTier?: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for existing session
    const savedUser = localStorage.getItem('enrichx_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string, subscriptionTier?: string) => {
    setIsLoading(true);
    
    // Mock authentication - replace with real API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockUser: User = {
      id: '1',
      email,
      name: email === 'admin@enrichx.com' ? 'Admin User' : 'John Doe',
      role: email === 'admin@enrichx.com' ? 'admin' : 'subscriber',
      subscription_tier: subscriptionTier || 'free',
      credits_remaining: subscriptionTier === 'enterprise' ? 1000 : subscriptionTier === 'pro' ? 500 : 100,
      credits_monthly_limit: subscriptionTier === 'enterprise' ? 1000 : subscriptionTier === 'pro' ? 500 : 100,
      subscription_status: 'active',
      created_at: new Date(),
      last_login: new Date()
    };
    
    setUser(mockUser);
    localStorage.setItem('enrichx_user', JSON.stringify(mockUser));
    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('enrichx_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
