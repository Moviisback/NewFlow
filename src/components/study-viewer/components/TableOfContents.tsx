// src/components/study-viewer/components/TableOfContents.tsx
import React, { useEffect, useRef } from 'react';
import { TableOfContentsProps } from '../types';
import { Button } from '@/components/ui/button';
import { ChevronLeft, BookmarkCheck, BookmarkPlus } from 'lucide-react';

const TableOfContents: React.FC<TableOfContentsProps> = ({
  tableOfContents,
  activeSection,
  scrollToSection,
  bookmarks,
  setShowLeftSidebar
}) => {
  const tocRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLButtonElement | null>(null);

  // Scroll to active section in TOC when activeSection changes
  useEffect(() => {
    if (activeSection && tocRef.current) {
      const activeButton = tocRef.current.querySelector(`[data-section-id="${activeSection}"]`) as HTMLButtonElement;
      if (activeButton) {
        activeItemRef.current = activeButton;
        
        // Scroll the active item into view if it's not already visible
        const container = tocRef.current;
        const itemTop = activeButton.offsetTop;
        const itemBottom = itemTop + activeButton.offsetHeight;
        const containerTop = container.scrollTop;
        const containerBottom = containerTop + container.clientHeight;
        
        if (itemTop < containerTop) {
          // Item is above the visible area
          container.scrollTo({
            top: itemTop - 20,
            behavior: 'smooth'
          });
        } else if (itemBottom > containerBottom) {
          // Item is below the visible area
          container.scrollTo({
            top: itemBottom - container.clientHeight + 20,
            behavior: 'smooth'
          });
        }
      }
    }
  }, [activeSection]);

  // Add active section debug logging
  useEffect(() => {
    console.log('TOC activeSection:', activeSection);
  }, [activeSection]);

  // Handle bookmarking a section
  const handleToggleBookmark = (e: React.MouseEvent, sectionId: string, title: string) => {
    e.stopPropagation(); // Prevent scrolling to section when clicking bookmark
    console.log(`Toggle bookmark for section ${sectionId} (${title})`);
    
    // Dispatch a custom event to be handled by the bookmark handler
    const event = new CustomEvent('toggleBookmark', { 
      detail: { id: sectionId, title }
    });
    document.dispatchEvent(event);
  };

  return (
    <div className="w-64 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden flex flex-col">
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Table of Contents</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowLeftSidebar(false)}
          className="h-6 w-6 p-0 rounded-full"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3" ref={tocRef}>
        {tableOfContents.length > 0 ? (
          <div className="space-y-1">
            {tableOfContents.map((item) => {
              const isActive = activeSection === item.id;
              const isBookmarked = bookmarks.some(b => b.sectionId === item.id);
              
              return (
                <div
                  key={item.id}
                  className={`w-full text-left px-2 py-1 rounded-md text-sm transition-colors ${
                    isActive 
                      ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-semibold' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  style={{ 
                    paddingLeft: `${(item.level - 1) * 0.75 + 0.5}rem`,
                    fontSize: item.level === 1 ? '0.9rem' : '0.8rem',
                    fontWeight: item.level === 1 ? 500 : 400
                  }}
                >
                  {/* Show bookmark status and section title */}
                  <div className="flex items-center gap-2">
                    {/* Bookmark icon as span with onClick */}
                    <span 
                      onClick={(e) => handleToggleBookmark(e, item.id, item.title)}
                      className={`h-3 w-3 flex-shrink-0 transition-colors cursor-pointer ${
                        isBookmarked ? 'text-indigo-500' : 'text-gray-400 hover:text-indigo-400'
                      }`}
                      aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
                    >
                      {isBookmarked ? 
                        <BookmarkCheck className="h-3 w-3" /> : 
                        <BookmarkPlus className="h-3 w-3" />
                      }
                    </span>
                    
                    {/* Section title with onClick */}
                    <span 
                      className="truncate cursor-pointer"
                      onClick={() => scrollToSection(item.id)}
                      data-section-id={item.id}
                    >
                      {item.title}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">
            No table of contents available.
          </p>
        )}
      </div>
      
      {/* Add styling for section highlighting */}
      <style jsx global>{`
        .highlight-active-section {
          animation: pulse-highlight 2s ease-in-out;
        }
        
        @keyframes pulse-highlight {
          0%, 100% { background-color: transparent; }
          30% { background-color: rgba(99, 102, 241, 0.3); }
        }
      `}</style>
    </div>
  );
};

export default TableOfContents;