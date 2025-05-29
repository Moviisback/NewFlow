import React from 'react';
import { BookOpen } from 'lucide-react';

const AppHeader = () => {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-md bg-gradient-to-r from-indigo-500 to-purple-600">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">Study Materials</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
              Personalized Study Resources
            </p>
          </div>
        </div>

        {/* Search bar removed */}

        {/* Right Actions */}
        <div className="flex items-center space-x-3">
          {/* All right-side elements removed */}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;