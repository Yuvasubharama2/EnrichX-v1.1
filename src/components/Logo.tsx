import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'white' | 'dark';
  showText?: boolean;
  className?: string;
}

export default function Logo({ 
  size = 'md', 
  variant = 'default', 
  showText = true,
  className = '' 
}: LogoProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  const getLogoColors = () => {
    switch (variant) {
      case 'white':
        return 'from-white to-gray-100';
      case 'dark':
        return 'from-gray-800 to-gray-900';
      default:
        return 'from-blue-600 to-purple-600';
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'white':
        return 'text-white';
      case 'dark':
        return 'text-gray-900';
      default:
        return 'text-gray-900';
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Logo Icon */}
      <div className={`${sizeClasses[size]} bg-gradient-to-br ${getLogoColors()} rounded-lg flex items-center justify-center shadow-sm`}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`${size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-5 h-5' : size === 'lg' ? 'w-6 h-6' : 'w-8 h-8'} ${variant === 'default' ? 'text-white' : variant === 'white' ? 'text-gray-800' : 'text-white'}`}
        >
          {/* Custom EnrichX Logo Design */}
          <path
            d="M3 4h18v2H3V4zm0 4h18v2H3V8zm0 4h18v2H3v-2zm0 4h18v2H3v-2z"
            fill="currentColor"
            opacity="0.3"
          />
          <path
            d="M7 6h10l-2 2H9l-2-2zm0 4h10l-2 2H9l-2-2zm0 4h10l-2 2H9l-2-2z"
            fill="currentColor"
          />
          <circle cx="19" cy="7" r="2" fill="currentColor" />
          <circle cx="19" cy="12" r="2" fill="currentColor" />
          <circle cx="19" cy="17" r="2" fill="currentColor" />
        </svg>
      </div>
      
      {/* Logo Text */}
      {showText && (
        <span className={`${textSizeClasses[size]} font-bold ${getTextColor()}`}>
          EnrichX
        </span>
      )}
    </div>
  );
}