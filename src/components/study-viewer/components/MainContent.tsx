// src/components/study-viewer/components/MainContent.tsx
import React, { useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MainContentProps } from '../types';

const MainContent: React.FC<MainContentProps> = ({
  summary,
  viewMode,
  fontSize,
  textDensity,
  highlightColor,
  handleTextHighlight,
  contentRef,
  mainScrollRef,
  handleScroll,
  readingProgress,
  isFullscreen,
  showScrollToTop,
  scrollToTop,
  activeSection,
  // Search props
  searchQuery,
  setSearchQuery,
  searchResults,
  currentSearchIndex,
  performSearch,
  navigateSearchResults
}) => {
  // Add event listener for text highlighting
  useEffect(() => {
    const handleMouseUp = () => {
      if (viewMode === 'highlight') {
        handleTextHighlight();
      }
    };
    
    // Add event listener to content area
    if (contentRef.current) {
      contentRef.current.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      // Clean up event listener
      if (contentRef.current) {
        contentRef.current.removeEventListener('mouseup', handleMouseUp);
      }
    };
  }, [viewMode, handleTextHighlight, contentRef]);

  // Add listener for active section to handle focus mode
  useEffect(() => {
    if (viewMode === 'focus' && activeSection && contentRef.current) {
      // Remove focus from all paragraphs
      const allParagraphs = contentRef.current.querySelectorAll('p');
      allParagraphs.forEach(p => p.classList.remove('focus-active'));
      
      // Find paragraphs in the active section
      const activeElement = document.getElementById(activeSection);
      if (activeElement) {
        // Find the first paragraph after the heading
        let currentElement = activeElement.nextElementSibling;
        while (currentElement && currentElement.tagName !== 'H1' && currentElement.tagName !== 'H2' && currentElement.tagName !== 'H3') {
          if (currentElement.tagName === 'P') {
            currentElement.classList.add('focus-active');
            currentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            break;
          }
          currentElement = currentElement.nextElementSibling;
        }
      }
    }
  }, [viewMode, activeSection]);

  // Detect if content is binary and should have special styling
  const contentIsBinary = summary.includes('Binary Document') || summary.includes('PDF Document');

  return (
    <div className="relative flex-1 z-10">
      {/* Main scrollable content */}
      <div 
        ref={mainScrollRef}
        className={`overflow-y-auto overflow-x-hidden study-main-content ${isFullscreen ? 'h-[calc(100vh-120px)]' : 'h-[500px]'} relative`}
        onScroll={handleScroll}
        data-active-section={activeSection}
      >
        <div 
          ref={contentRef}
          className={`px-8 py-6 mx-auto ${contentIsBinary ? 'max-w-full' : (textDensity === 'comfortable' ? 'max-w-3xl' : 'max-w-4xl')} relative`}
          style={{ 
            fontSize: `${fontSize}px`,
            lineHeight: textDensity === 'comfortable' ? '1.8' : '1.5',
          }}
        >
          {/* Use dangerouslySetInnerHTML for formatted content */}
          <div className="study-content relative z-10" dangerouslySetInnerHTML={{ __html: summary }} />
        </div>
      </div>
      
      {/* Highlight Mode Indicator */}
      {viewMode === 'highlight' && (
        <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 shadow-md rounded-lg px-3 py-2 text-sm flex items-center gap-2 border border-gray-200 dark:border-gray-700 z-20">
          <span className={`w-3 h-3 rounded-full ${
            highlightColor === 'yellow' ? 'bg-yellow-300' :
            highlightColor === 'green' ? 'bg-green-300' :
            highlightColor === 'blue' ? 'bg-blue-300' :
            'bg-pink-300'
          }`} />
          <span className="text-gray-700 dark:text-gray-300">
            Highlight Mode: Select text to highlight
          </span>
        </div>
      )}
      
      {/* Focus Mode Indicator */}
      {viewMode === 'focus' && (
        <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 shadow-md rounded-lg px-3 py-2 text-sm flex items-center gap-2 border border-gray-200 dark:border-gray-700 z-20">
          <span className="text-gray-700 dark:text-gray-300">
            Focus Mode: Press ESC to exit
          </span>
        </div>
      )}
      
      {/* Search Results Count Indicator - Only shown when we have search results but the search panel is closed */}
      {searchResults > 0 && (
        <div className="absolute top-4 left-4 bg-white dark:bg-gray-800 shadow-md rounded-lg px-3 py-2 text-xs flex items-center gap-2 border border-gray-200 dark:border-gray-700 z-20">
          <span className="text-gray-700 dark:text-gray-300">
            {currentSearchIndex} of {searchResults} matches
          </span>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigateSearchResults('prev')}
              className="h-5 w-5 p-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"/>
              </svg>
              <span className="sr-only">Previous match</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigateSearchResults('next')}
              className="h-5 w-5 p-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6"/>
              </svg>
              <span className="sr-only">Next match</span>
            </Button>
          </div>
        </div>
      )}
      
      {/* Scroll to top button */}
      {showScrollToTop && (
        <Button
          variant="outline"
          size="sm"
          onClick={scrollToTop}
          className="absolute bottom-6 right-6 h-10 w-10 p-0 rounded-full bg-gray-100 dark:bg-gray-700 shadow-md hover:bg-gray-200 dark:hover:bg-gray-600 z-20"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      )}
      
      {/* Add CSS for highlights and styling */}
      <style jsx global>{`
        /* Custom highlight styles */
        .yellow-highlight {
          background-color: rgba(254, 240, 138, 0.5) !important;
        }
        
        .green-highlight {
          background-color: rgba(187, 247, 208, 0.5) !important;
        }
        
        .blue-highlight {
          background-color: rgba(191, 219, 254, 0.5) !important;
        }
        
        .pink-highlight {
          background-color: rgba(251, 207, 232, 0.5) !important;
        }
        
        /* Dark mode highlight adjustments */
        .dark .yellow-highlight {
          background-color: rgba(254, 240, 138, 0.3) !important;
        }
        
        .dark .green-highlight {
          background-color: rgba(187, 247, 208, 0.3) !important;
        }
        
        .dark .blue-highlight {
          background-color: rgba(191, 219, 254, 0.3) !important;
        }
        
        .dark .pink-highlight {
          background-color: rgba(251, 207, 232, 0.3) !important;
        }
        
        /* Search highlight styles */
        mark.search-highlight {
          background-color: rgba(255, 255, 0, 0.4) !important;
          padding: 0 2px;
          border-radius: 2px;
          color: inherit !important;
          position: relative;
          display: inline;
          z-index: 15;
        }
        
        .dark mark.search-highlight {
          background-color: rgba(234, 179, 8, 0.4) !important;
          color: white !important;
        }
        
        /* Current search match */
        mark.current-match {
          background-color: rgba(245, 158, 11, 0.7) !important;
          box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.4);
          position: relative;
          z-index: 15;
        }
        
        /* Pulse effect for search matches */
        .pulse-effect {
          animation: pulse-highlight 1.2s cubic-bezier(0.4, 0, 0.6, 1) 1;
        }
        
        @keyframes pulse-highlight {
          0%, 100% { 
            box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.4);
          }
          50% { 
            box-shadow: 0 0 0 6px rgba(245, 158, 11, 0.4);
          }
        }
        
        /* Highlight mode cursor */
        ${viewMode === 'highlight' ? `
          .study-content {
            cursor: text;
          }
        ` : ''}
        
        /* Focus mode */
        ${viewMode === 'focus' ? `
          .study-content p {
            opacity: 0.5;
            transition: opacity 0.3s ease;
          }
          
          .study-content p.focus-active {
            opacity: 1;
            background-color: rgba(255, 255, 255, 0.9);
            border-radius: 0.5rem;
            padding: 1rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            position: relative;
            z-index: 10;
          }
          
          .dark .study-content p.focus-active {
            background-color: rgba(30, 41, 59, 0.9);
          }
        ` : ''}
        
        /* Fix sidebar text in dark mode */
        .dark .text-gray-700 {
          color: #e5e7eb;
        }
        
        /* Make sure links are visible in dark mode */
        .dark a {
          color: #93c5fd;
        }
        
        /* Fix for white overlay */
        .document-overlay,
        .content-mask,
        .page-overlay,
        .white-mask,
        .backdrop-element {
          display: none !important; /* Force hide any potential overlay */
        }
        
        /* Ensure content has priority */
        .study-content {
          position: relative;
          z-index: 10;
        }
        
        /* Ensure proper stacking context */
        .study-main-content {
          position: relative;
          z-index: 5;
        }
      `}</style>
    </div>
  );
};

export default MainContent;