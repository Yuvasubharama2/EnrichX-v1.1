import React, { useState, useEffect } from 'react';
import { Building2, Users, Upload, TrendingUp, Calendar, FileText, Activity, BarChart3, PieChart, Zap, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

interface DashboardStats {
  totalCompanies: number;
  totalContacts: number;
  monthlyUploads: number;
  dataQualityScore: number;
  companiesChange: number;
  contactsChange: number;
  uploadsChange: number;
  qualityChange: number;
}

interface RecentUpload {
  id: string;
  type: 'Companies' | 'Contacts';
  fileName: string;
  recordsProcessed: number;
  status: 'completed' | 'processing' | 'failed';
  uploadedAt: string;
}

interface DataQualityMetrics {
  completeProfiles: number;
  validEmails: number;
  enrichedData: number;
}

interface ActivityData {
  timestamp: string;
  action: string;
  details: string;
  user: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCompanies: 0,
    totalContacts: 0,
    monthlyUploads: 0,
    dataQualityScore: 0,
    companiesChange: 0,
    contactsChange: 0,
    uploadsChange: 0,
    qualityChange: 0
  });
  
  const [recentUploads, setRecentUploads] = useState<RecentUpload[]>([]);
  const [dataQuality, setDataQuality] = useState<DataQualityMetrics>({
    completeProfiles: 94,
    validEmails: 87,
    enrichedData: 91
  });
  const [recentActivity, setRecentActivity] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    fetchDashboardData();
    
    // Set up realtime subscriptions
    const companiesSubscription = supabase
      .channel('companies-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'companies' },
        (payload) => {
          console.log('Companies change detected:', payload);
          fetchDashboardData();
          addActivityLog('Company data updated', `${payload.eventType} operation on companies table`);
        }
      )
      .subscribe();

    const contactsSubscription = supabase
      .channel('contacts-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'contacts' },
        (payload) => {
          console.log('Contacts change detected:', payload);
          fetchDashboardData();
          addActivityLog('Contact data updated', `${payload.eventType} operation on contacts table`);
        }
      )
      .subscribe();

    // Auto-refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      fetchDashboardData();
    }, 30000);

    return () => {
      companiesSubscription.unsubscribe();
      contactsSubscription.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch companies count
      const { count: companiesCount } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true });

      // Fetch contacts count
      const { count: contactsCount } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true });

      // Calculate monthly uploads (mock data for now)
      const currentMonth = new Date().getMonth();
      const monthlyUploads = Math.floor(Math.random() * 50) + 15;

      // Calculate data quality score
      const qualityScore = Math.floor(
        (dataQuality.completeProfiles + dataQuality.validEmails + dataQuality.enrichedData) / 3
      );

      setStats({
        totalCompanies: companiesCount || 0,
        totalContacts: contactsCount || 0,
        monthlyUploads,
        dataQualityScore: qualityScore,
        companiesChange: Math.floor(Math.random() * 20) + 5,
        contactsChange: Math.floor(Math.random() * 15) + 3,
        uploadsChange: Math.floor(Math.random() * 30) + 10,
        qualityChange: Math.floor(Math.random() * 5) + 1
      });

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addActivityLog = (action: string, details: string) => {
    const newActivity: ActivityData = {
      timestamp: new Date().toISOString(),
      action,
      details,
      user: 'Admin User'
    };
    
    setRecentActivity(prev => [newActivity, ...prev.slice(0, 9)]);
  };

  const mockRecentUploads: RecentUpload[] = [
    {
      id: '1',
      type: 'Companies',
      fileName: 'tech_companies_q4.csv',
      recordsProcessed: 1247,
      status: 'completed',
      uploadedAt: '2 hours ago',
    },
    {
      id: '2',
      type: 'Contacts',
      fileName: 'sales_contacts_update.csv',
      recordsProcessed: 892,
      status: 'completed',
      uploadedAt: '1 day ago',
    },
    {
      id: '3',
      type: 'Companies',
      fileName: 'fintech_startups.csv',
      recordsProcessed: 456,
      status: 'processing',
      uploadedAt: '2 days ago',
    },
  ];

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const statsCards = [
    {
      name: 'Total Companies',
      value: formatNumber(stats.totalCompanies),
      change: `+${stats.companiesChange}%`,
      changeType: 'positive',
      icon: Building2,
      color: 'blue'
    },
    {
      name: 'Total Contacts',
      value: formatNumber(stats.totalContacts),
      change: `+${stats.contactsChange}%`,
      changeType: 'positive',
      icon: Users,
      color: 'green'
    },
    {
      name: 'Monthly Uploads',
      value: stats.monthlyUploads.toString(),
      change: `+${stats.uploadsChange}%`,
      changeType: 'positive',
      icon: Upload,
      color: 'purple'
    },
    {
      name: 'Data Quality Score',
      value: `${stats.dataQualityScore}%`,
      change: `+${stats.qualityChange}%`,
      changeType: 'positive',
      icon: TrendingUp,
      color: 'orange'
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Realtime Indicator */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Real-time overview of your data platform</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Live</span>
          </div>
          <button
            onClick={fetchDashboardData}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <span className="text-xs text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.name} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex-shrink-0">
                  <div className={`w-12 h-12 bg-${item.color}-50 rounded-xl flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 text-${item.color}-600`} />
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-green-600">{item.change}</span>
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-500">{item.name}</h3>
                <p className="text-3xl font-bold text-gray-900 mt-1">{item.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity Feed */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-blue-600" />
                Recent Activity
              </h3>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                      <p className="text-xs text-gray-500">{activity.details}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Activity className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Data Quality Metrics */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
              Data Quality Metrics
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Complete Profiles</span>
                  <span className="text-sm font-bold text-green-600">{dataQuality.completeProfiles}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${dataQuality.completeProfiles}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Valid Emails</span>
                  <span className="text-sm font-bold text-blue-600">{dataQuality.validEmails}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${dataQuality.validEmails}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Enriched Data</span>
                  <span className="text-sm font-bold text-purple-600">{dataQuality.enrichedData}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${dataQuality.enrichedData}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Uploads */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Upload className="w-5 h-5 mr-2 text-orange-600" />
              Recent Uploads
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {mockRecentUploads.map((upload) => (
                <div key={upload.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4 text-gray-600" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{upload.fileName}</p>
                      <p className="text-xs text-gray-500">
                        {upload.recordsProcessed} {upload.type.toLowerCase()} • {upload.uploadedAt}
                      </p>
                    </div>
                  </div>
                  <div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        upload.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : upload.status === 'processing'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {upload.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Performance Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Usage Trends */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
              Usage Trends (Last 7 Days)
            </h3>
          </div>
          <div className="p-6">
            <div className="h-64 flex items-end justify-between space-x-2">
              {[65, 78, 82, 94, 87, 91, 96].map((value, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg transition-all duration-500 hover:from-blue-600 hover:to-blue-500"
                    style={{ height: `${(value / 100) * 200}px` }}
                  />
                  <div className="mt-2 text-xs text-gray-600">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}
                  </div>
                  <div className="text-xs text-gray-500">{value}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Zap className="w-5 h-5 mr-2 text-yellow-600" />
              Quick Actions
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-4">
              <button className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg hover:from-blue-100 hover:to-purple-100 transition-all group">
                <div className="flex items-center space-x-3">
                  <Upload className="w-5 h-5 text-blue-600" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-blue-900">Upload CSV Data</p>
                    <p className="text-xs text-blue-700">Import companies or contacts</p>
                  </div>
                </div>
                <div className="w-6 h-6 border-2 border-blue-400 rounded-full flex items-center justify-center group-hover:border-blue-600 transition-colors">
                  <div className="w-2 h-2 bg-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
              </button>
              
              <button className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-all group">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-gray-600" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">Download Templates</p>
                    <p className="text-xs text-gray-700">Get CSV templates for imports</p>
                  </div>
                </div>
                <div className="w-6 h-6 border-2 border-gray-400 rounded-full flex items-center justify-center group-hover:border-gray-600 transition-colors">
                  <div className="w-2 h-2 bg-gray-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
              </button>
              
              <button className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-all group">
                <div className="flex items-center space-x-3">
                  <BarChart3 className="w-5 h-5 text-gray-600" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">Analytics Report</p>
                    <p className="text-xs text-gray-700">View detailed analytics</p>
                  </div>
                </div>
                <div className="w-6 h-6 border-2 border-gray-400 rounded-full flex items-center justify-center group-hover:border-gray-600 transition-colors">
                  <div className="w-2 h-2 bg-gray-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-green-600" />
            System Status
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <div className="w-6 h-6 bg-green-500 rounded-full"></div>
              </div>
              <h4 className="text-sm font-medium text-gray-900">Database</h4>
              <p className="text-xs text-green-600 mt-1">Operational</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <div className="w-6 h-6 bg-green-500 rounded-full"></div>
              </div>
              <h4 className="text-sm font-medium text-gray-900">API</h4>
              <p className="text-xs text-green-600 mt-1">Operational</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <div className="w-6 h-6 bg-green-500 rounded-full"></div>
              </div>
              <h4 className="text-sm font-medium text-gray-900">Upload Service</h4>
              <p className="text-xs text-green-600 mt-1">Operational</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <div className="w-6 h-6 bg-yellow-500 rounded-full"></div>
              </div>
              <h4 className="text-sm font-medium text-gray-900">Email Service</h4>
              <p className="text-xs text-yellow-600 mt-1">Degraded</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}