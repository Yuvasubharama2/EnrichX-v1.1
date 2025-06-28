import React from 'react';
import { Building2, Users, Upload, TrendingUp, Calendar, FileText } from 'lucide-react';

export default function Dashboard() {
  const stats = [
    {
      name: 'Total Companies',
      value: '2,847',
      change: '+12%',
      changeType: 'positive',
      icon: Building2,
    },
    {
      name: 'Total Contacts',
      value: '14,329',
      change: '+8%',
      changeType: 'positive',
      icon: Users,
    },
    {
      name: 'Monthly Uploads',
      value: '23',
      change: '+23%',
      changeType: 'positive',
      icon: Upload,
    },
    {
      name: 'Data Quality Score',
      value: '94%',
      change: '+2%',
      changeType: 'positive',
      icon: TrendingUp,
    },
  ];

  const recentUploads = [
    {
      id: 1,
      type: 'Companies',
      fileName: 'tech_companies_q4.csv',
      recordsProcessed: 1247,
      status: 'completed',
      uploadedAt: '2 hours ago',
    },
    {
      id: 2,
      type: 'Contacts',
      fileName: 'sales_contacts_update.csv',
      recordsProcessed: 892,
      status: 'completed',
      uploadedAt: '1 day ago',
    },
    {
      id: 3,
      type: 'Companies',
      fileName: 'fintech_startups.csv',
      recordsProcessed: 456,
      status: 'processing',
      uploadedAt: '2 days ago',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.name} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <div className="ml-4 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{item.name}</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">{item.value}</div>
                      <div
                        className={`ml-2 flex items-baseline text-sm font-semibold ${
                          item.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {item.change}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Uploads */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Uploads</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentUploads.map((upload) => (
                <div key={upload.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center">
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

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              <button className="w-full flex items-center px-4 py-3 text-left bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                <Upload className="w-5 h-5 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Upload CSV Data</p>
                  <p className="text-xs text-blue-700">Import companies or contacts</p>
                </div>
              </button>
              
              <button className="w-full flex items-center px-4 py-3 text-left bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <FileText className="w-5 h-5 text-gray-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Download Templates</p>
                  <p className="text-xs text-gray-700">Get CSV templates for data imports</p>
                </div>
              </button>
              
              <button className="w-full flex items-center px-4 py-3 text-left bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <TrendingUp className="w-5 h-5 text-gray-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Data Quality Report</p>
                  <p className="text-xs text-gray-700">Review data completeness and accuracy</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Data Quality Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Data Quality Overview</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">94%</div>
              <div className="text-sm text-gray-600 mt-1">Complete Profiles</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '94%' }}></div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">87%</div>
              <div className="text-sm text-gray-600 mt-1">Valid Emails</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '87%' }}></div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">91%</div>
              <div className="text-sm text-gray-600 mt-1">Enriched Data</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div className="bg-purple-600 h-2 rounded-full" style={{ width: '91%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
