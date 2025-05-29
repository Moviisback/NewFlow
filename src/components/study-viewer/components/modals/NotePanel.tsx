// src/components/study-viewer/components/modals/NotePanel.tsx
import React from 'react';
import { ViewMode, TableOfContentsItem } from '../../types';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface NotePanelProps {
  currentNote: string;
  setCurrentNote: (note: string) => void;
  activeSection: string;
  tableOfContents: TableOfContentsItem[];
  addNote: (sectionId?: string) => void;
  setViewMode: (mode: ViewMode) => void;
}

const NotePanel: React.FC<NotePanelProps> = ({
  currentNote,
  setCurrentNote,
  activeSection,
  tableOfContents,
  addNote,
  setViewMode
}) => {
  return (
    <div className="absolute bottom-4 right-4 left-4 max-w-xl mx-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-lg p-4 z-30">
      <h4 className="text-sm font-medium mb-2 text-gray-800 dark:text-gray-200">
        {activeSection ? 
          `Add Note for: ${tableOfContents.find(t => t.id === activeSection)?.title || 'Current Section'}` 
          : 'Add Note'}
      </h4>
      <Textarea
        value={currentNote}
        onChange={(e) => setCurrentNote(e.target.value)}
        placeholder="Type your notes here..."
        className="w-full h-24 mb-2 text-sm"
      />
      <div className="flex justify-between">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setViewMode('read')}
        >
          Cancel
        </Button>
        <Button 
          onClick={() => {
            addNote(activeSection);
            setViewMode('read');
          }}
          disabled={!currentNote.trim()} 
          size="sm"
        >
          Save Note
        </Button>
      </div>
    </div>
  );
};

export default NotePanel;