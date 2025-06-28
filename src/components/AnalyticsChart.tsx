import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface DataPoint {
  label: string;
  value: number;
  change?: number;
}

interface AnalyticsChartProps {
  title: string;
  data: DataPoint[];
  type: 'bar' | 'line' | 'area';
  color?: string;
  height?: number;
}

export default function AnalyticsChart({ 
  title, 
  data, 
  type = 'bar', 
  color = 'blue',
  height = 200 
}: AnalyticsChartProps) {
  const maxValue = Math.max(...data.map(d => d.value));
  
  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'from-blue-500 to-blue-600',
      green: 'from-green-500 to-green-600',
      purple: 'from-purple-500 to-purple-600',
      orange: 'from-orange-500 to-orange-600',
      red: 'from-red-500 to-red-600'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const renderBarChart = () => (
    <div className="flex items-end justify-between space-x-2" style={{ height }}>
      {data.map((point, index) => (
        <div key={index} className="flex-1 flex flex-col items-center group">
          <div className="relative w-full">
            <div 
              className={`w-full bg-gradient-to-t ${getColorClasses(color)} rounded-t-lg transition-all duration-500 hover:opacity-80 cursor-pointer`}
              style={{ height: `${(point.value / maxValue) * (height - 60)}px` }}
              title={`${point.label}: ${point.value}`}
            />
            {point.change !== undefined && (
              <div className={`absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium ${
                point.change >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {point.change >= 0 ? '+' : ''}{point.change}%
              </div>
            )}
          </div>
          <div className="mt-2 text-xs text-gray-600 text-center">{point.label}</div>
          <div className="text-xs text-gray-500 font-medium">{point.value}</div>
        </div>
      ))}
    </div>
  );

  const renderLineChart = () => (
    <div className="relative" style={{ height }}>
      <svg className="w-full h-full" viewBox={`0 0 ${data.length * 50} ${height}`}>
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={`var(--${color}-500)`} stopOpacity="0.3" />
            <stop offset="100%" stopColor={`var(--${color}-500)`} stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Area fill */}
        <path
          d={`M 0 ${height} ${data.map((point, index) => 
            `L ${index * 50 + 25} ${height - (point.value / maxValue) * (height - 40)}`
          ).join(' ')} L ${(data.length - 1) * 50 + 25} ${height} Z`}
          fill={`url(#gradient-${color})`}
        />
        
        {/* Line */}
        <path
          d={`M 25 ${height - (data[0].value / maxValue) * (height - 40)} ${data.slice(1).map((point, index) => 
            `L ${(index + 1) * 50 + 25} ${height - (point.value / maxValue) * (height - 40)}`
          ).join(' ')}`}
          stroke={`var(--${color}-500)`}
          strokeWidth="3"
          fill="none"
          className="drop-shadow-sm"
        />
        
        {/* Data points */}
        {data.map((point, index) => (
          <circle
            key={index}
            cx={index * 50 + 25}
            cy={height - (point.value / maxValue) * (height - 40)}
            r="4"
            fill={`var(--${color}-600)`}
            className="drop-shadow-sm hover:r-6 transition-all cursor-pointer"
          />
        ))}
      </svg>
      
      {/* Labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-4">
        {data.map((point, index) => (
          <div key={index} className="text-xs text-gray-600 text-center">
            <div>{point.label}</div>
            <div className="font-medium">{point.value}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-4 h-4 text-green-500" />
          <span className="text-sm text-green-600 font-medium">+12.5%</span>
        </div>
      </div>
      
      {type === 'bar' && renderBarChart()}
      {(type === 'line' || type === 'area') && renderLineChart()}
    </div>
  );
}