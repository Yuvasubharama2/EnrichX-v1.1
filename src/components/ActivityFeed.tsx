import React, { useState, useEffect } from 'react';
import { Activity, User, Upload, Database, Settings, Clock } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'upload' | 'user' | 'system' | 'data';
  title: string;
  description: string;
  timestamp: Date;
  user?: string;
  metadata?: Record<string, any>;
}

interface ActivityFeedProps {
  maxItems?: number;
  realtime?: boolean;
}

export default function ActivityFeed({ maxItems = 10, realtime = true }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize with mock data
    const mockActivities: ActivityItem[] = [
      {
        id: '1',
        type: 'upload',
        title: 'CSV Upload Completed',
        description: 'Successfully imported 1,247 companies from tech_companies_q4.csv',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        user: 'Admin User',
        metadata: { recordCount: 1247, fileName: 'tech_companies_q4.csv' }
      },
      {
        id: '2',
        type: 'data',
        title: 'Data Quality Check',
        description: 'Automated data quality scan completed with 94% score',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        user: 'System',
        metadata: { qualityScore: 94 }
      },
      {
        id: '3',
        type: 'user',
        title: 'New User Registration',
        description: 'User john.doe@company.com registered with Pro plan',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        user: 'System',
        metadata: { plan: 'Pro', email: 'john.doe@company.com' }
      },
      {
        id: '4',
        type: 'upload',
        title: 'Contact Import Started',
        description: 'Processing 892 contacts from sales_contacts_update.csv',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        user: 'Admin User',
        metadata: { recordCount: 892, fileName: 'sales_contacts_update.csv' }
      },
      {
        id: '5',
        type: 'system',
        title: 'System Maintenance',
        description: 'Scheduled database optimization completed successfully',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        user: 'System',
        metadata: { duration: '45 minutes' }
      }
    ];

    setActivities(mockActivities.slice(0, maxItems));
    setLoading(false);

    // Simulate realtime updates
    if (realtime) {
      const interval = setInterval(() => {
        const newActivity: ActivityItem = {
          id: Date.now().toString(),
          type: ['upload', 'data', 'user', 'system'][Math.floor(Math.random() * 4)] as any,
          title: 'Real-time Update',
          description: 'New activity detected in the system',
          timestamp: new Date(),
          user: 'System'
        };

        setActivities(prev => [newActivity, ...prev.slice(0, maxItems - 1)]);
      }, 30000); // Every 30 seconds

      return () => clearInterval(interval);
    }
  }, [maxItems, realtime]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'upload':
        return Upload;
      case 'user':
        return User;
      case 'system':
        return Settings;
      case 'data':
        return Database;
      default:
        return Activity;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'upload':
        return 'text-blue-600 bg-blue-100';
      case 'user':
        return 'text-green-600 bg-green-100';
      case 'system':
        return 'text-orange-600 bg-orange-100';
      case 'data':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - timestamp.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-start space-x-3 animate-pulse">
            <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
            <div className="flex-1">
              <div className="w-3/4 h-4 bg-gray-200 rounded mb-2"></div>
              <div className="w-1/2 h-3 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-96 overflow-y-auto">
      {activities.map((activity) => {
        const Icon = getActivityIcon(activity.type);
        const colorClasses = getActivityColor(activity.type);
        
        return (
          <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <div className={`w-8 h-8 ${colorClasses} rounded-full flex items-center justify-center flex-shrink-0`}>
              <Icon className="w-4 h-4" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-900 truncate">
                  {activity.title}
                </h4>
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>{formatTimeAgo(activity.timestamp)}</span>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
              
              {activity.user && (
                <p className="text-xs text-gray-500 mt-1">by {activity.user}</p>
              )}
              
              {activity.metadata && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {Object.entries(activity.metadata).map(([key, value]) => (
                    <span
                      key={key}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700"
                    >
                      {key}: {value}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
      
      {activities.length === 0 && (
        <div className="text-center py-8">
          <Activity className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No recent activity</p>
        </div>
      )}
    </div>
  );
}