import React from 'react';
import { Database, Users, Target, BarChart3, Star, Check, DollarSign, Briefcase, Award } from 'lucide-react'; // Added icons for pricing
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header with logo and auth buttons */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10"> {/* Added sticky and z-10 */}
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">EnrichX</h1>
          </div>
          <nav className="hidden md:flex space-x-6"> {/* Navigation links */}
            <button
              onClick={() => scrollToSection('hero-section')} // Link to Hero
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection('features-section')} // Link to Features
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('pricing-section')} // Link to Pricing
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Pricing
            </button>
          </nav>
          <div className="flex space-x-3">
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-sm hover:shadow"
            >
              Sign Up
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="hero-section" className="max-w-7xl mx-auto px-6 py-16 md:py-24"> {/* Added ID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
              Unlock the Power of <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Perfect B2B Data</span>
            </h2>
            <p className="text-lg text-gray-600">
              EnrichX delivers verified company data, contact information, and business intelligence to fuel your sales and marketing efforts.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => navigate('/signup')}
                className="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
              >
                Get Started Free
              </button>
              <button
                className="px-6 py-3 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Watch Demo
              </button>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Check className="w-4 h-4 text-green-500" />
              <span>No credit card required for basic access</span>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-2xl transform translate-x-4 translate-y-4"></div>
            <div className="relative bg-white rounded-2xl p-6 shadow-lg">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-blue-700">10M+</div>
                  <div className="text-sm text-gray-600">Verified Contacts</div>
                </div>
                <div className="bg-purple-50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-purple-700">500K+</div>
                  <div className="text-sm text-gray-600">Companies</div>
                </div>
                <div className="bg-green-50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-green-700">95%</div>
                  <div className="text-sm text-gray-600">Email Accuracy</div>
                </div>
                <div className="bg-pink-50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-pink-700">24/7</div>
                  <div className="text-sm text-gray-600">Data Updates</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features-section" className="max-w-7xl mx-auto px-6 py-16"> {/* Added ID */}
        <div className="text-center mb-12">
          <h3 className="text-2xl font-bold text-gray-900">Powerful Features for Modern Sales Teams</h3>
          <p className="text-gray-600 mt-2">Everything you need to supercharge your B2B outreach and prospecting</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Database className="w-6 h-6 text-blue-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Comprehensive Data</h4>
            <p className="text-gray-600">Access to a constantly updated database of companies and contacts with complete profiles and verified information.</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Target className="w-6 h-6 text-purple-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Targeted Prospecting</h4>
            <p className="text-gray-600">Find companies matching your ideal customer profile with advanced filtering and segmentation capabilities.</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
              <Star className="w-6 h-6 text-pink-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Smart Enrichment</h4>
            <p className="text-gray-600">Automatically enrich your CRM and marketing tools with real-time data updates and missing information.</p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing-section" className="max-w-7xl mx-auto px-6 py-16 bg-white rounded-2xl shadow-xl"> {/* Added ID and styling */}
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold text-gray-900">Simple, Transparent Pricing</h3>
          <p className="text-gray-600 mt-2 text-lg">Choose the plan that fits your business needs</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Free Plan */}
          <div className="flex flex-col p-8 bg-gray-50 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <DollarSign className="w-8 h-8 text-green-600" />
              <h4 className="text-2xl font-bold text-gray-900">Free</h4>
            </div>
            <p className="text-gray-600 mb-6">Perfect for individuals and small teams getting started.</p>
            <div className="text-4xl font-bold text-gray-900 mb-1">
              $0<span className="text-lg font-medium text-gray-600">/month</span>
            </div>
            <p className="text-sm text-gray-500 mb-6">Includes basic features.</p>
            <ul className="space-y-3 text-gray-600 flex-grow"> {/* flex-grow to push button down */}
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                <span>Limited contact searches</span>
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                <span>Basic company data</span>
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                <span>Email support</span>
              </li>
            </ul>
            <button
              onClick={() => navigate('/signup')}
              className="mt-8 w-full px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg text-center"
            >
              Get Started Free
            </button>
          </div>

          {/* Pro Plan */}
          <div className="flex flex-col p-8 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-300 shadow-lg relative overflow-hidden"> {/* Added gradient and border */}
             <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-bl-lg">Popular</div> {/* Popular tag */}
            <div className="flex items-center space-x-3 mb-4">
              <Briefcase className="w-8 h-8 text-blue-700" />
              <h4 className="text-2xl font-bold text-gray-900">Pro</h4>
            </div>
            <p className="text-gray-700 mb-6">Ideal for growing teams needing more data and features.</p>
            <div className="text-4xl font-bold text-gray-900 mb-1">
              $99<span className="text-lg font-medium text-gray-600">/month</span>
            </div>
            <p className="text-sm text-gray-500 mb-6">Billed annually. Monthly options available.</p>
             <ul className="space-y-3 text-gray-700 flex-grow"> {/* flex-grow to push button down */}
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                <span>Unlimited contact searches</span>
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                <span>Advanced company data</span>
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                <span>CRM integrations</span>
              </li>
               <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                <span>Priority email support</span>
              </li>
            </ul>
            <button
              onClick={() => navigate('/signup')} // Or navigate to a specific Pro signup flow
              className="mt-8 w-full px-6 py-3 text-sm font-medium text-blue-700 bg-white border border-blue-700 rounded-lg hover:bg-blue-100 transition-colors shadow-md hover:shadow-lg text-center"
            >
              Start Pro Trial
            </button>
          </div>

          {/* Enterprise Plan */}
          <div className="flex flex-col p-8 bg-gray-50 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <Award className="w-8 h-8 text-purple-600" />
              <h4 className="text-2xl font-bold text-gray-900">Enterprise</h4>
            </div>
            <p className="text-gray-600 mb-6">Custom solutions for large organizations with specific needs.</p>
            <div className="text-4xl font-bold text-gray-900 mb-1">
              Custom
            </div>
            <p className="text-sm text-gray-500 mb-6">Tailored to your requirements.</p>
             <ul className="space-y-3 text-gray-600 flex-grow"> {/* flex-grow to push button down */}
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                <span>Everything in Pro</span>
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                <span>Dedicated account manager</span>
              </li>
              <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                <span>Custom data integrations</span>
              </li>
               <li className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                <span>SLA and uptime guarantees</span>
              </li>
            </ul>
            <button
              onClick={() => navigate('/contact')} // Assuming a contact page exists or will be created
              className="mt-8 w-full px-6 py-3 text-sm font-medium text-purple-700 bg-white border border-purple-700 rounded-lg hover:bg-purple-100 transition-colors shadow-md hover:shadow-lg text-center"
            >
              Contact Sales
            </button>
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-purple-600 rounded-md flex items-center justify-center">
              <Database className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900">EnrichX</span>
          </div>
          <div className="text-sm text-gray-500">
            © 2025 EnrichX. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
