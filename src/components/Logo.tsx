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
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-12',
    xl: 'h-16'
  };

  const getContainerClasses = () => {
    switch (variant) {
      case 'white':
        return 'filter brightness-0 invert';
      case 'dark':
        return '';
      default:
        return '';
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Logo Image */}
      <img
        src="/image.png"
        alt="EnrichX Logo"
        className={`${sizeClasses[size]} ${getContainerClasses()} object-contain`}
      />
    </div>
  );
}