// src/components/study-viewer/components/modals/KeyboardShortcutsModal.tsx
import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Keyboard Shortcuts</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">Navigation</h3>
            <ul className="space-y-2">
              <li className="flex justify-between">
                <span className="text-gray-700 dark:text-gray-300">Toggle Table of Contents</span>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">T</kbd>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-700 dark:text-gray-300">Toggle Info Sidebar</span>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">I</kbd>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-700 dark:text-gray-300">Toggle Fullscreen</span>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">F</kbd>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-700 dark:text-gray-300">Search</span>
                <span className="flex items-center">
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded mr-1 text-gray-700 dark:text-gray-300">Ctrl</kbd>+
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded ml-1 text-gray-700 dark:text-gray-300">F</kbd>
                </span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-700 dark:text-gray-300">Toggle Focus Mode</span>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">Z</kbd>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-700 dark:text-gray-300">Show Quick Quiz</span>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">Q</kbd>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">Tools</h3>
            <ul className="space-y-2">
              <li className="flex justify-between">
                <span className="text-gray-700 dark:text-gray-300">Toggle Highlight Mode</span>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">H</kbd>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-700 dark:text-gray-300">Toggle Note Mode</span>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">N</kbd>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-700 dark:text-gray-300">Bookmark Active Section</span>
                <span className="flex items-center">
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded mr-1 text-gray-700 dark:text-gray-300">Ctrl</kbd>+
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded ml-1 text-gray-700 dark:text-gray-300">B</kbd>
                </span>
              </li>
              <li className="flex justify-between">
                <span className="text-gray-700 dark:text-gray-300">Toggle Dark Mode</span>
                <span className="flex items-center">
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded mr-1 text-gray-700 dark:text-gray-300">Ctrl</kbd>+
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded ml-1 text-gray-700 dark:text-gray-300">D</kbd>
                </span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-4">
          <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">Other</h3>
          <ul className="space-y-2">
            <li className="flex justify-between">
              <span className="text-gray-700 dark:text-gray-300">Show Keyboard Shortcuts</span>
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">?</kbd>
            </li>
            <li className="flex justify-between">
              <span className="text-gray-700 dark:text-gray-300">Download Document</span>
              <span className="flex items-center">
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded mr-1 text-gray-700 dark:text-gray-300">Ctrl</kbd>+
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded ml-1 text-gray-700 dark:text-gray-300">S</kbd>
              </span>
            </li>
            <li className="flex justify-between">
              <span className="text-gray-700 dark:text-gray-300">Exit Current Mode/View</span>
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">Esc</kbd>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;