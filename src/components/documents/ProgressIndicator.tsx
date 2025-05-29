
import React from 'react';

interface ProgressIndicatorProps {
  percent?: number;
  size?: "small" | "large";
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ 
  percent = 0,
  size = "small"
}) => {
  // Ensure percent is between 0 and 100
  const normalizedPercent = Math.min(100, Math.max(0, percent));
  
  // Determine size classes
  const sizeClasses = size === "large" 
    ? "w-24 h-2 rounded-full" 
    : "w-16 h-1.5 rounded-full";

  return (
    <div className={`bg-gray-200 dark:bg-gray-700 ${sizeClasses} overflow-hidden`}>
      <div 
        className="h-full bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 transition-all duration-500 ease-out"
        style={{ width: `${normalizedPercent}%` }}
      />
    </div>
  );
};

export default ProgressIndicator;