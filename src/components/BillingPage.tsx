import React from 'react';
import { CreditCard, Download, Calendar, TrendingUp, Zap, Star, Check, Building2, Users, BarChart3 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SubscriptionPlan } from '../types';

export default function BillingPage() {
  const { user } = useAuth();

  const plans: SubscriptionPlan[] = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      credits_per_month: 50,
      features: [
        '50 contact views per month',
        'Basic search filters',
        'Export up to 10 contacts',
        'Email support'
      ]
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 49,
      credits_per_month: 2000,
      popular: true,
      features: [
        '2,000 contact views per month',
        'Advanced search filters',
        'Unlimited exports',
        'Save up to 50 lists',
        'Email & chat support',
        'API access'
      ]
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 199,
      credits_per_month: 10000,
      features: [
        '10,000+ contact views per month',
        'Custom integrations',
        'Dedicated account manager',
        'Custom data fields',
        'SSO integration',
        'Advanced analytics',
        'SLA guarantee'
      ]
    }
  ];

  const usageData = [
    { month: 'Jan', credits: 420 },
    { month: 'Feb', credits: 380 },
    { month: 'Mar', credits: 450 },
    { month: 'Apr', credits: 490 },
    { month: 'May', credits: 350 },
  ];

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysUntilBillingCycle = () => {
    if (!user?.billing_cycle_end) return 0;
    const now = new Date();
    const cycleEnd = new Date(user.billing_cycle_end);
    const diffTime = cycleEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getSubscriptionColor = (tier: string) => {
    switch (tier) {
      case 'enterprise': return 'from-purple-500 to-purple-600';
      case 'pro': return 'from-blue-500 to-blue-600';
      case 'free': return 'from-green-500 to-green-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getExportLimits = () => {
    switch (user?.subscription_tier) {
      case 'enterprise':
        return { companies: 20000, contacts: 10000 };
      case 'pro':
        return { companies: 5000, contacts: 1000 };
      case 'free':
      default:
        return { companies: 1000, contacts: 50 };
    }
  };

  const exportLimits = getExportLimits();

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Billing & Usage</h1>
        <p className="text-gray-600">Manage your subscription and monitor usage</p>
      </div>

      {/* Current Plan & Usage Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Current Plan */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Current Plan</h3>
            <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize bg-gradient-to-r ${getSubscriptionColor(user?.subscription_tier || 'free')} text-white`}>
              {user?.subscription_tier}
            </span>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Monthly Credits</span>
              <span className="font-semibold">{user?.credits_monthly_limit?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status</span>
              <span className={`font-medium capitalize ${
                user?.subscription_status === 'active' ? 'text-green-600' : 
                user?.subscription_status === 'past_due' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {user?.subscription_status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Next Billing</span>
              <span className="font-medium">
                {user?.billing_cycle_end ? formatDate(new Date(user.billing_cycle_end)) : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Usage This Month */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Usage This Month</h3>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Credits Used</span>
                <span className="font-semibold">
                  {((user?.credits_monthly_limit || 0) - (user?.credits_remaining || 0)).toLocaleString()} / {user?.credits_monthly_limit?.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full bg-gradient-to-r ${getSubscriptionColor(user?.subscription_tier || 'free')}`}
                  style={{ 
                    width: `${(((user?.credits_monthly_limit || 0) - (user?.credits_remaining || 0)) / (user?.credits_monthly_limit || 1)) * 100}%` 
                  }}
                />
              </div>
            </div>
            <div className="text-sm text-gray-600">
              Resets on the {user?.billing_cycle_end ? new Date(user.billing_cycle_end).getDate() : 15}th of each month
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <CreditCard className="w-4 h-4 mr-2" />
              Upgrade Plan
            </button>
            <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4 mr-2" />
              Download Invoice
            </button>
            <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              <Calendar className="w-4 h-4 mr-2" />
              Billing History
            </button>
          </div>
        </div>
      </div>

      {/* Export Usage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Companies Export Usage */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Companies Exported</h3>
                <p className="text-sm text-gray-600">This month</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                {user?.exports_this_month?.companies?.toLocaleString() || '0'}
              </div>
              <div className="text-sm text-gray-500">
                of {exportLimits.companies.toLocaleString()}
              </div>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${Math.min(((user?.exports_this_month?.companies || 0) / exportLimits.companies) * 100, 100)}%` 
              }}
            />
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {(((user?.exports_this_month?.companies || 0) / exportLimits.companies) * 100).toFixed(1)}% of monthly limit used
          </div>
        </div>

        {/* Contacts Export Usage */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Contacts Exported</h3>
                <p className="text-sm text-gray-600">This month</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-600">
                {user?.exports_this_month?.contacts?.toLocaleString() || '0'}
              </div>
              <div className="text-sm text-gray-500">
                of {exportLimits.contacts.toLocaleString()}
              </div>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${Math.min(((user?.exports_this_month?.contacts || 0) / exportLimits.contacts) * 100, 100)}%` 
              }}
            />
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {(((user?.exports_this_month?.contacts || 0) / exportLimits.contacts) * 100).toFixed(1)}% of monthly limit used
          </div>
        </div>
      </div>

      {/* Usage Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Usage History</h3>
        <div className="h-64 flex items-end justify-between space-x-4">
          {usageData.map((data, index) => (
            <div key={data.month} className="flex-1 flex flex-col items-center">
              <div 
                className="w-full bg-gradient-to-t from-blue-500 to-purple-500 rounded-t-lg transition-all duration-300 hover:from-blue-600 hover:to-purple-600"
                style={{ height: `${(data.credits / 500) * 100}%` }}
              />
              <div className="mt-2 text-sm text-gray-600">{data.month}</div>
              <div className="text-xs text-gray-500">{data.credits}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Stats</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 mb-2">
              {user?.credits_remaining?.toLocaleString() || '0'}
            </div>
            <div className="text-sm text-gray-600">Credits Remaining</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-2 capitalize">
              {user?.subscription_tier || 'Free'}
            </div>
            <div className="text-sm text-gray-600">Current Plan</div>
          </div>
          
          <div className="text-center">
            <div className={`text-2xl font-bold mb-2 capitalize ${
              user?.subscription_status === 'active' ? 'text-green-600' : 
              user?.subscription_status === 'past_due' ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {user?.subscription_status || 'Unknown'}
            </div>
            <div className="text-sm text-gray-600">Account Status</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 mb-2">
              {getDaysUntilBillingCycle()}
            </div>
            <div className="text-sm text-gray-600">Days Until Renewal</div>
          </div>
        </div>
      </div>

      {/* Available Plans */}
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">Available Plans</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div 
              key={plan.id} 
              className={`relative bg-white rounded-xl shadow-sm border-2 p-6 ${
                plan.popular 
                  ? 'border-blue-500 ring-2 ring-blue-200' 
                  : 'border-gray-200'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-600 text-white">
                    <Star className="w-3 h-3 mr-1" />
                    Most Popular
                  </span>
                </div>
              )}
              
              <div className="text-center mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">{plan.name}</h4>
                <div className="mb-2">
                  <span className="text-3xl font-bold text-gray-900">${plan.price}</span>
                  <span className="text-gray-600">/month</span>
                </div>
                <p className="text-sm text-gray-600">
                  {plan.credits_per_month.toLocaleString()} credits/month
                </p>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <Check className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button 
                className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                  user?.subscription_tier === plan.id
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : plan.popular
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
                disabled={user?.subscription_tier === plan.id}
              >
                {user?.subscription_tier === plan.id ? 'Current Plan' : 'Upgrade'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Method */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h3>
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">•••• •••• •••• 4242</p>
              <p className="text-sm text-gray-600">Expires 12/25</p>
            </div>
          </div>
          <button className="text-blue-600 hover:text-blue-700 font-medium">
            Update
          </button>
        </div>
      </div>
    </div>
  );
}