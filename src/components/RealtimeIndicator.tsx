import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

interface RealtimeIndicatorProps {
  isConnected: boolean;
  lastUpdate?: Date | null;
}

export default function RealtimeIndicator({ isConnected, lastUpdate }: RealtimeIndicatorProps) {
  return (
    <div className="flex items-center space-x-2">
      <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
        isConnected 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800'
      }`}>
        {isConnected ? (
          <>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <Wifi className="w-3 h-3" />
            <span>Live</span>
          </>
        ) : (
          <>
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <WifiOff className="w-3 h-3" />
            <span>Offline</span>
          </>
        )}
      </div>
      {lastUpdate && (
        <span className="text-xs text-gray-500">
          Updated: {lastUpdate.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}