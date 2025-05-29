// components/common/EnhancedTabs.tsx
import React from 'react';
import { BookOpen, Upload } from 'lucide-react';
import { EnhancedTabsProps } from '../documents/types';

const EnhancedTabs: React.FC<EnhancedTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="mb-8 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex space-x-1">
          <button
            className={`group relative px-4 py-3 text-sm sm:text-base ${activeTab === 'library'
                ? 'text-indigo-600 font-semibold' 
                : 'text-gray-500 hover:text-gray-700 font-medium'
              }`}
            onClick={() => onTabChange('library')}
          >
            <div className="flex items-center gap-2">
              <BookOpen size={18} />
              <span>My Library</span>
            </div>
            {activeTab === 'library' && (
              <div className="absolute inset-x-0 bottom-[-1px] h-0.5 bg-indigo-600"></div>
            )}
          </button>
          <button
            className={`group relative px-4 py-3 text-sm sm:text-base ${activeTab === 'upload'
                ? 'text-indigo-600 font-semibold'
                : 'text-gray-500 hover:text-gray-700 font-medium'
              }`}
            onClick={() => onTabChange('upload')}
          >
            <div className="flex items-center gap-2">
              <Upload size={18} />
              <span>New Document</span>
            </div>
            {activeTab === 'upload' && (
              <div className="absolute inset-x-0 bottom-[-1px] h-0.5 bg-indigo-600"></div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedTabs;