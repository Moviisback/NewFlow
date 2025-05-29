// src/components/study-viewer/components/modals/DefinitionPanel.tsx
import React from 'react';
import { X, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DefinitionPanelProps {
  isOpen: boolean;
  term: string;
  definition: string;
  onClose: () => void;
}

const DefinitionPanel: React.FC<DefinitionPanelProps> = ({
  isOpen,
  term,
  definition,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed bottom-5 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-xl border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-indigo-700 dark:text-indigo-400">
            {term}
          </h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
          {definition}
        </p>
        <div className="flex justify-between items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs text-indigo-600 dark:text-indigo-400"
          >
            <Lightbulb className="h-3 w-3 mr-1" />
            See examples
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs"
          >
            Add to flashcards
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DefinitionPanel;