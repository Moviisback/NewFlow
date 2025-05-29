// src/components/study-viewer/components/DocumentViewSelector.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText, BookOpen } from 'lucide-react';
import { DocumentViewType } from '../types';

interface DocumentViewSelectorProps {
  currentView: DocumentViewType;
  onViewChange: (view: DocumentViewType) => void;
}

const DocumentViewSelector: React.FC<DocumentViewSelectorProps> = ({
  currentView,
  onViewChange
}) => {
  return (
    <div className="flex items-center bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewChange('summary')}
        className={`h-8 px-3 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
          currentView === 'summary' 
            ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm' 
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
        }`}
      >
        <BookOpen className="h-3.5 w-3.5" />
        <span>Summary</span>
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewChange('original')}
        className={`h-8 px-3 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
          currentView === 'original' 
            ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm' 
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
        }`}
      >
        <FileText className="h-3.5 w-3.5" />
        <span>Original</span>
      </Button>
    </div>
  );
};

export default DocumentViewSelector;