import React from 'react';
import { BookOpen, Upload } from 'lucide-react';
import { EnhancedEmptyLibraryProps } from './types';

const EmptyLibrary: React.FC<EnhancedEmptyLibraryProps> = ({ onUpload }) => (
  <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 py-16 text-center shadow-sm mt-8">
    <div className="mb-5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 p-5">
      <BookOpen size={48} className="text-indigo-400 dark:text-indigo-300" />
    </div>
    <h3 className="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-100">Your Library is Empty</h3>
    <p className="mb-6 max-w-sm text-gray-500 dark:text-gray-400 px-4">
      Upload documents to generate summaries and study materials. They'll appear here once created.
    </p>
    <button
      className="flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-blue-600 dark:from-indigo-600 dark:to-blue-700 px-6 py-3 text-base font-medium text-white shadow-md transition hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
      onClick={onUpload}
    >
      <Upload size={18} />
      Upload Your First Document
    </button>
  </div>
);

export default EmptyLibrary;