// src/components/study-viewer/FullscreenStudyViewer.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Download, BookOpen, Maximize, X, Search, Keyboard, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ViewMode, TextDensity, SidebarTab, DocumentViewType } from './types';

// Import components
import ControlPanel from './components/ControlPanel';
import TableOfContents from './components/TableOfContents';
import InfoSidebar from './components/InfoSidebar';
import MainContent from './components/MainContent';
import SearchPanel from './components/SearchPanel';
import KeyboardShortcutsModal from './components/modals/KeyboardShortcutsModal';
import QuickQuizModal from './components/modals/QuickQuizModal';
import DefinitionPanel from './components/modals/DefinitionPanel';
import NotePanel from './components/modals/NotePanel';
import DocumentViewSelector from './components/DocumentViewSelector';
import TextDocumentViewer from './components/TextDocumentViewer';

// Import hooks
import { useSearch } from './hooks/useSearch';
import { useScrollTracking } from './hooks/useScrollTracking';
import { useHighlighting } from './hooks/useHighlighting';
import { useBookmarksAndNotes } from './hooks/useBookmarksAndNotes';
import { useFormatContent } from './hooks/useFormatContent';
import { registerKeyboardShortcuts } from './utils/shortcuts';

// Add interface extensions for browser-prefixed fullscreen methods
interface HTMLElementWithFullscreen extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
}

interface DocumentWithFullscreen extends Document {
  webkitExitFullscreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
  webkitFullscreenElement?: Element;
  msFullscreenElement?: Element;
}

// Full-width divider replacement component
interface FullWidthDividerReplacementProps {
  toggleFullscreen: () => void;
  showSearch: () => void;
  readingProgress: number;
  showKeyboardShortcuts: () => void;
  toggleRightSidebar: () => void;
  documentView: DocumentViewType;
  onViewChange: (view: DocumentViewType) => void;
}

const FullWidthDividerReplacement: React.FC<FullWidthDividerReplacementProps> = ({
  toggleFullscreen,
  showSearch,
  readingProgress,
  showKeyboardShortcuts,
  toggleRightSidebar,
  documentView,
  onViewChange
}) => {
  return (
    <div className="w-full bg-indigo-100 dark:bg-indigo-900/30 border-t border-b border-indigo-200 dark:border-indigo-800 py-2 px-4 flex items-center justify-between">
      {/* Left side - Reading progress and View Selector */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
            Progress: {Math.round(readingProgress)}%
          </div>
          <div className="w-48 h-2 bg-indigo-200 dark:bg-indigo-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 dark:bg-indigo-400 transition-all duration-300"
              style={{ width: `${readingProgress}%` }}
            />
          </div>
        </div>
        
        {/* View Selector */}
        <DocumentViewSelector 
          currentView={documentView}
          onViewChange={onViewChange}
        />
      </div>
      
      {/* Right side - Quick actions */}
      <div className="flex items-center gap-2">
        <Button 
          size="sm" 
          onClick={toggleFullscreen}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-7"
        >
          Enter Fullscreen (F)
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={showSearch}
          className="h-7 w-7 p-0 rounded-full bg-white dark:bg-gray-800 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-gray-700"
          title="Search in document (Ctrl+F)"
        >
          <Search className="h-3.5 w-3.5" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={showKeyboardShortcuts}
          className="h-7 w-7 p-0 rounded-full bg-white dark:bg-gray-800 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-gray-700"
          title="Keyboard shortcuts (?)"
        >
          <Keyboard className="h-3.5 w-3.5" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleRightSidebar}
          className="h-7 w-7 p-0 rounded-full bg-white dark:bg-gray-800 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-gray-700"
          title="Show information panel"
        >
          <Info className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

// Extended props type to include original content
interface ExtendedStudyViewerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  date?: string;
  summary: string;
  originalContent: string; // Original document content
  isValidated?: boolean;
  format?: string;
  tableOfContents: any[];
  keyInformation: any[];
  onDownload: () => void;
  onViewInLibrary?: () => void;
  onEditSettings?: () => void;
}

const FullscreenStudyViewer: React.FC<ExtendedStudyViewerProps> = ({ 
  isOpen, 
  onClose, 
  title,
  date,
  summary,
  originalContent, // Original document content
  isValidated = false,
  format,
  tableOfContents,
  keyInformation,
  onDownload,
  onViewInLibrary
}) => {
  // Component state
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('read');
  const [fontSize, setFontSize] = useState<number>(16);
  const [textDensity, setTextDensity] = useState<TextDensity>('comfortable');
  const [rightSidebarTab, setRightSidebarTab] = useState<SidebarTab>('info');
  const [showControlPanel, setShowControlPanel] = useState<boolean>(true);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState<boolean>(false);
  const [showQuickQuiz, setShowQuickQuiz] = useState<boolean>(false);
  const [showDefinitionPanel, setShowDefinitionPanel] = useState<boolean>(false);
  const [activeDefinition, setActiveDefinition] = useState<{term: string, definition: string} | null>(null);
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Document view state
  const [documentView, setDocumentView] = useState<DocumentViewType>('summary');
  
  // Store scroll positions for each view
  const [summaryScrollPosition, setSummaryScrollPosition] = useState<number>(0);
  const [originalScrollPosition, setOriginalScrollPosition] = useState<number>(0);
  
  // DOM References
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const searchPanelRef = useRef<HTMLDivElement>(null);
  const controlPanelWrapperRef = useRef<HTMLDivElement>(null);
  const footerControlsWrapperRef = useRef<HTMLDivElement>(null);

  // Format both summary and original content
  const { formattedContent: formattedSummary } = useFormatContent(summary || '');
  const { formattedContent: formattedOriginal } = useFormatContent(originalContent || '', true); // Pass true for isOriginal
  
  // Add debug logging for the download function
  useEffect(() => {
    console.log("FullscreenStudyViewer - Download function available:", !!onDownload);
    
    // Test the download function if it exists
    if (onDownload) {
      try {
        // Just log the function is available, don't call it
        console.log("Download function is properly defined in props");
      } catch (error) {
        console.error("Error inspecting download function:", error);
      }
    }
  }, [onDownload]);
  
  // Add debug logging to track content state
  useEffect(() => {
    console.log("Document view changed to:", documentView);
    console.log("Summary content present:", !!summary);
    console.log("Original content present:", !!originalContent);
    console.log("Summary length:", summary?.length || 0);
    console.log("Original content length:", originalContent?.length || 0);
    console.log("Formatted summary length:", formattedSummary?.length || 0);
    console.log("Formatted original length:", formattedOriginal?.length || 0);
  }, [documentView, summary, originalContent, formattedSummary, formattedOriginal]);

  // DEFINE TOGGLE FUNCTIONS EARLY - before they are used by any hooks or components
  // Toggle fullscreen function with proper browser support
  const toggleFullscreen = useCallback(() => {
    // Cast document to our extended interface
    const doc = document as DocumentWithFullscreen;
    
    if (!doc.fullscreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
      // Enter fullscreen - cast container to our extended interface
      const container = containerRef.current as HTMLElementWithFullscreen | null;
      
      if (container) {
        if (container.requestFullscreen) {
          container.requestFullscreen()
            .catch(err => console.error("Error entering fullscreen:", err));
        } else if (container.webkitRequestFullscreen) { // Safari
          container.webkitRequestFullscreen();
        } else if (container.msRequestFullscreen) { // IE11
          container.msRequestFullscreen();
        }
      }
    } else {
      // Exit fullscreen
      if (doc.exitFullscreen) {
        doc.exitFullscreen()
          .catch(err => console.error("Error exiting fullscreen:", err));
      } else if (doc.webkitExitFullscreen) { // Safari
        doc.webkitExitFullscreen();
      } else if (doc.msExitFullscreen) { // IE11
        doc.msExitFullscreen();
      }
    }
  }, []);
  
  // Toggle search panel
  const toggleSearch = useCallback(() => {
    setShowSearch(prev => {
      const isOpening = !prev;
      if (isOpening) {
        document.body.classList.add('using-study-search');
        setTimeout(() => {
          const input = searchPanelRef.current?.querySelector('input');
          if (input) input.focus();
        }, 50);
      } else {
        document.body.classList.remove('using-study-search');
      }
      return isOpening;
    });
  }, []);
  
  // Custom hooks
  const { 
    searchQuery, setSearchQuery, searchResults, currentSearchIndex,
    isSearching, caseSensitive, wholeWord, performSearch, 
    navigateSearchResults, clearSearchHighlights, toggleCaseSensitive, toggleWholeWord
  } = useSearch({ contentRef });
  
  // Use the scroll tracking hook
  const {
    activeSection, readingProgress, showScrollToTop,
    handleScroll, scrollToSection, scrollToTop
  } = useScrollTracking({ 
    contentRef: mainScrollRef, 
    tableOfContents, 
    viewMode 
  });
  
  // Enhanced scroll handler to save positions for different views
  const handleEnhancedScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    // Save the scroll position for the current view
    const scrollTop = e.currentTarget.scrollTop;
    
    if (documentView === 'summary') {
      setSummaryScrollPosition(scrollTop);
    } else {
      setOriginalScrollPosition(scrollTop);
    }
    
    // Call the original scroll handler for other functionality
    handleScroll(e);
  }, [documentView, handleScroll]);
  
  // Handle switching between summary and original views
  const handleViewChange = useCallback((view: DocumentViewType) => {
    console.log(`Switching view from ${documentView} to ${view}`);
    
    // Save the current scroll position
    if (mainScrollRef.current) {
      const currentScrollTop = mainScrollRef.current.scrollTop;
      
      if (documentView === 'summary') {
        setSummaryScrollPosition(currentScrollTop);
      } else {
        setOriginalScrollPosition(currentScrollTop);
      }
    }
    
    // Clear any search highlights when switching views
    clearSearchHighlights();
    setSearchQuery('');
    
    // Change the view
    setDocumentView(view);
    
    // Scroll to the saved position for the new view after rendering
    setTimeout(() => {
      if (mainScrollRef.current) {
        const targetScrollTop = view === 'summary' 
          ? summaryScrollPosition 
          : originalScrollPosition;
        
        mainScrollRef.current.scrollTop = targetScrollTop;
      }
    }, 50);
  }, [documentView, summaryScrollPosition, originalScrollPosition, clearSearchHighlights, setSearchQuery]);
  
  const {
    highlights, setHighlights, highlightColor, setHighlightColor,
    handleTextHighlight, cleanupHighlights
  } = useHighlighting({ contentRef });
  
  const {
    bookmarks, userNotes, currentNote, setCurrentNote,
    addNote, toggleBookmark, initializeEventHandlers, highlightKeyConceptInContent
  } = useBookmarksAndNotes(tableOfContents);

  // Replace the divider with our custom component
  useEffect(() => {
    // Find the divh-2 element in the DOM
    const dividerElement = document.querySelector('.divh-2');
    let root: any = null;
    
    if (dividerElement && document.getElementById('divider-replacement-container') === null) {
      // Create a container for our React component
      const dividerContainer = document.createElement('div');
      dividerContainer.id = 'divider-replacement-container';
      dividerContainer.style.width = '100%';
      
      // Clear and append
      dividerElement.innerHTML = '';
      dividerElement.appendChild(dividerContainer);
      
      // Use legacy ReactDOM.render for React 17 and below
      try {
        ReactDOM.render(
          <FullWidthDividerReplacement
            toggleFullscreen={toggleFullscreen}
            showSearch={toggleSearch}
            readingProgress={readingProgress}
            showKeyboardShortcuts={() => setShowKeyboardShortcuts(true)}
            toggleRightSidebar={() => setShowRightSidebar(!showRightSidebar)}
            documentView={documentView}
            onViewChange={handleViewChange}
          />,
          dividerContainer
        );
      } catch (error) {
        console.error("Error rendering divider replacement:", error);
      }
    }
    
    // Update content when reading progress changes
    const updateDivider = () => {
      const container = document.getElementById('divider-replacement-container');
      if (container) {
        try {
          ReactDOM.render(
            <FullWidthDividerReplacement
              toggleFullscreen={toggleFullscreen}
              showSearch={toggleSearch}
              readingProgress={readingProgress}
              showKeyboardShortcuts={() => setShowKeyboardShortcuts(true)}
              toggleRightSidebar={() => setShowRightSidebar(!showRightSidebar)}
              documentView={documentView}
              onViewChange={handleViewChange}
            />,
            container
          );
        } catch (error) {
          console.error("Error updating divider replacement:", error);
        }
      }
    };
    
    updateDivider();
    
    // Cleanup on unmount
    return () => {
      const container = document.getElementById('divider-replacement-container');
      if (container) {
        try {
          ReactDOM.unmountComponentAtNode(container);
        } catch (error) {
          console.error("Error unmounting divider replacement:", error);
        }
      }
    };
  }, [
    toggleFullscreen, 
    toggleSearch, 
    readingProgress, 
    showRightSidebar, 
    setShowRightSidebar,
    setShowKeyboardShortcuts,
    documentView,
    handleViewChange
  ]);

  // Listen for fullscreen change events
  useEffect(() => {
    const doc = document as DocumentWithFullscreen;
    
    const handleFullscreenChange = () => {
      setIsFullscreen(
        !!doc.fullscreenElement || 
        !!doc.webkitFullscreenElement || 
        !!doc.msFullscreenElement
      );
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Clean up fullscreen on unmount
  useEffect(() => {
    return () => {
      const doc = document as DocumentWithFullscreen;
      
      if (doc.fullscreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement) {
        if (doc.exitFullscreen) {
          doc.exitFullscreen().catch(err => 
            console.error("Error exiting fullscreen on unmount:", err)
          );
        } else if (doc.webkitExitFullscreen) {
          doc.webkitExitFullscreen();
        } else if (doc.msExitFullscreen) {
          doc.msExitFullscreen();
        }
      }
    };
  }, []);

  // --- HEIGHT CALCULATION FOR MAIN CONTENT ---
  useEffect(() => {
    const scrollElement = mainScrollRef.current;
    if (!scrollElement) return;

    const calculateAndSetHeight = () => {
      if (!mainScrollRef.current) return;

      let cpHeight = 0;
      if (controlPanelWrapperRef.current && showControlPanel) {
        cpHeight = controlPanelWrapperRef.current.offsetHeight;
      } else if (controlPanelWrapperRef.current && !showControlPanel) {
        // If CP is hidden but wrapper exists, use its height
        cpHeight = controlPanelWrapperRef.current.offsetHeight;
      }

      let footerHeight = 0;
      if (footerControlsWrapperRef.current) {
        footerHeight = footerControlsWrapperRef.current.offsetHeight;
      }
      
      // Calculate height based on available space
      const newHeightStyle = isFullscreen
        ? `calc(100vh - ${cpHeight}px - ${footerHeight}px)` 
        : '500px';
      
      scrollElement.style.height = newHeightStyle;
      scrollElement.style.overflowY = 'auto';
      scrollElement.style.overflowX = 'hidden';
    };
    
    calculateAndSetHeight();
    const timeoutId = setTimeout(calculateAndSetHeight, 100);
    
    // Recalculate on window resize
    window.addEventListener('resize', calculateAndSetHeight);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', calculateAndSetHeight);
    };
  }, [isFullscreen, showControlPanel, showLeftSidebar, showRightSidebar]);

  // Handle Ctrl+F to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        const activeElement = document.activeElement as HTMLElement;
        if (!searchPanelRef.current?.contains(activeElement) && 
            activeElement?.tagName !== 'INPUT' && 
            activeElement?.tagName !== 'TEXTAREA') {
            e.preventDefault();
            toggleSearch();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSearch]);

  // Listen for definition panel triggers
  useEffect(() => {
    const handleShowDefinition = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.term && detail?.definition) { 
        setActiveDefinition(detail); 
        setShowDefinitionPanel(true); 
      }
    };
    document.addEventListener('showDefinition', handleShowDefinition);
    return () => document.removeEventListener('showDefinition', handleShowDefinition);
  }, []);

  // Initialize bookmark and notes event handlers
  useEffect(() => { 
    if (initializeEventHandlers) 
      return initializeEventHandlers(); 
  }, [initializeEventHandlers]);

  // UI state toggle functions
  const toggleDarkMode = useCallback(() => setIsDarkMode(prev => !prev), []);
  useEffect(() => { 
    if (containerRef.current) {
      containerRef.current.classList.toggle('dark', isDarkMode);
    }
  }, [isDarkMode]);
  
  const toggleTextDensity = useCallback(() => {
    setTextDensity(prev => prev === 'comfortable' ? 'compact' : 'comfortable');
  }, []);
  
  const enterFocusMode = useCallback(() => { 
    setViewMode('focus'); 
    setShowLeftSidebar(false); 
    setShowRightSidebar(false); 
    setShowControlPanel(false); 
  }, []);
  
  const exitFocusMode = useCallback(() => { 
    setViewMode('read'); 
    setShowControlPanel(true); 
  }, []);
  
  const toggleQuickQuiz = useCallback(() => setShowQuickQuiz(prev => !prev), []);

  // Handle Escape key for closing various UI elements
  const handleEscape = useCallback(() => {
    if (showSearch) { 
      toggleSearch(); 
      return; 
    }
    if (viewMode === 'focus') { 
      exitFocusMode(); 
      return; 
    }
    
    const doc = document as DocumentWithFullscreen;
    if (doc.fullscreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement) { 
      toggleFullscreen(); 
      return; 
    }
    
    // If none of the above, just close the viewer
    onClose();
  }, [showSearch, toggleSearch, viewMode, exitFocusMode, toggleFullscreen, onClose]);

  // Safe download handler that wraps the provided onDownload function with error handling
  const handleDownload = useCallback(() => {
    if (!onDownload) {
      console.warn("Download function not available");
      return;
    }
    
    console.log("Download button clicked");
    try {
      onDownload();
      console.log("Download function executed successfully");
    } catch (error) {
      console.error("Error in download function:", error);
    }
  }, [onDownload]);

  // Register keyboard shortcuts
  useEffect(() => {
    const cleanup = registerKeyboardShortcuts({
      search: toggleSearch,
      toggleDarkMode,
      toggleBookmark: () => {
        if (activeSection) {
          const activeTitle = tableOfContents.find(item => item.id === activeSection)?.title || '';
          toggleBookmark(activeSection, activeTitle);
        }
      },
      download: handleDownload, // Use our safe wrapper
      toggleLeftSidebar: () => setShowLeftSidebar(prev => !prev),
      toggleRightSidebar: () => setShowRightSidebar(prev => !prev),
      toggleHighlightMode: () => setViewMode(prev => prev === 'highlight' ? 'read' : 'highlight'),
      toggleNoteMode: () => setViewMode(prev => prev === 'note' ? 'read' : 'note'),
      toggleFullscreen: toggleFullscreen,
      toggleFocusMode: () => viewMode === 'focus' ? exitFocusMode() : enterFocusMode(),
      showKeyboardShortcuts: () => setShowKeyboardShortcuts(prev => !prev),
      toggleQuickQuiz,
      handleEscape
    });
    return cleanup;
  }, [
    activeSection, viewMode, tableOfContents, handleDownload, toggleFullscreen,
    toggleSearch, toggleDarkMode, toggleBookmark, handleEscape, toggleQuickQuiz, 
    enterFocusMode, exitFocusMode
  ]);
  
  // Final cleanup
  useEffect(() => {
    return () => {
      document.body.classList.remove('using-study-search');
      if (clearSearchHighlights) clearSearchHighlights();
    };
  }, [clearSearchHighlights]);

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 overflow-hidden ${isDarkMode ? 'dark' : ''}`} 
      ref={containerRef}
    >
      <div className="bg-white dark:bg-gray-900 w-full h-full max-w-full max-h-full shadow-2xl flex flex-col">
        <div ref={controlPanelWrapperRef}>
          <ControlPanel 
            title={title} 
            format={format} 
            viewMode={viewMode} 
            setViewMode={setViewMode}
            showLeftSidebar={showLeftSidebar} 
            setShowLeftSidebar={setShowLeftSidebar}
            showRightSidebar={showRightSidebar} 
            setShowRightSidebar={setShowRightSidebar}
            onClose={onClose}
            isFullscreen={isFullscreen} 
            toggleFullscreen={toggleFullscreen}
            isDarkMode={isDarkMode} 
            toggleDarkMode={toggleDarkMode}
            toggleSearch={toggleSearch}
            fontSize={fontSize} 
            setFontSize={setFontSize}
            textDensity={textDensity} 
            toggleTextDensity={toggleTextDensity}
            highlightColor={highlightColor} 
            setHighlightColor={setHighlightColor}
            showKeyboardShortcuts={() => setShowKeyboardShortcuts(true)}
            toggleQuickQuiz={toggleQuickQuiz}
            enterFocusMode={enterFocusMode} 
            exitFocusMode={exitFocusMode}
            showControlPanel={showControlPanel} 
            setShowControlPanel={setShowControlPanel}
            readingProgress={readingProgress}
            extraControls={
              <DocumentViewSelector 
                currentView={documentView}
                onViewChange={handleViewChange}
              />
            }
          />
        </div>
        
        <div className="flex flex-1 overflow-hidden">
          {/* Table of Contents sidebar */}
          {showLeftSidebar && (
            <TableOfContents 
              tableOfContents={tableOfContents}
              activeSection={activeSection}
              scrollToSection={scrollToSection}
              bookmarks={bookmarks}
              setShowLeftSidebar={setShowLeftSidebar}
            />
          )}
          
          {/* Main content area */}
          <div className="flex-1 overflow-hidden relative">
            {documentView === 'summary' ? (
              <MainContent 
                summary={formattedSummary}
                viewMode={viewMode}
                fontSize={fontSize}
                textDensity={textDensity}
                highlightColor={highlightColor}
                handleTextHighlight={handleTextHighlight}
                contentRef={contentRef}
                mainScrollRef={mainScrollRef}
                handleScroll={handleEnhancedScroll}
                readingProgress={readingProgress}
                isFullscreen={isFullscreen}
                showScrollToTop={showScrollToTop}
                scrollToTop={scrollToTop}
                activeSection={activeSection}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                searchResults={searchResults}
                currentSearchIndex={currentSearchIndex}
                performSearch={performSearch}
                navigateSearchResults={navigateSearchResults}
              />
            ) : (
              <div 
                ref={mainScrollRef}
                className="overflow-y-auto overflow-x-hidden study-main-content"
                style={{ 
                  height: isFullscreen ? 'calc(100vh - 120px)' : '500px',
                }}
                onScroll={handleScroll}
              >
                <TextDocumentViewer
                  documentContent={originalContent}
                  documentName={title}
                  fontSize={fontSize}
                  textDensity={textDensity}
                  onDownload={onDownload}
                />
              </div>
            )}
          </div>
          
          {/* Right Sidebar for Info/Bookmarks/Notes */}
          {showRightSidebar && (
            <InfoSidebar 
              keyInformation={keyInformation}
              bookmarks={bookmarks}
              userNotes={userNotes}
              highlights={highlights}
              rightSidebarTab={rightSidebarTab}
              setRightSidebarTab={setRightSidebarTab}
              scrollToSection={scrollToSection}
              highlightKeyConceptInContent={highlightKeyConceptInContent}
              readingProgress={readingProgress}
              tableOfContents={tableOfContents}
              setViewMode={setViewMode}
              setShowRightSidebar={setShowRightSidebar}
              toggleQuickQuiz={toggleQuickQuiz}
            />
          )}
          
          {/* Search Panel */}
                      {showSearch && (
            <div className="search-panel" ref={searchPanelRef}>
              <SearchPanel
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                searchResults={searchResults}
                currentSearchIndex={currentSearchIndex}
                isSearching={isSearching}
                caseSensitive={caseSensitive}
                wholeWord={wholeWord}
                performSearch={performSearch}
                navigateSearchResults={navigateSearchResults}
                clearSearchHighlights={clearSearchHighlights}
                toggleCaseSensitive={toggleCaseSensitive}
                toggleWholeWord={toggleWholeWord}
                onClose={toggleSearch}
              />
            </div>
          )}
        </div>
        
        {/* Footer Controls */}
        <div ref={footerControlsWrapperRef} className="border-t border-gray-200 dark:border-gray-700 p-3 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
          {/* Left side - Document info */}
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {date && <span className="mr-3">Created: {date}</span>}
            {/* Display current view */}
            <span className="font-medium text-indigo-600 dark:text-indigo-400 mr-3">
              Viewing: {documentView === 'summary' ? 'Summary' : 'Original Document'}
            </span>
            <span className="hidden sm:inline-block">
              Press ESC to {isFullscreen ? 'exit fullscreen' : (viewMode === 'focus' ? 'exit focus mode' : (showSearch ? 'close search' : 'close viewer'))}
            </span>
          </div>
          
          {/* Right side - Actions */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleDownload}
              disabled={!onDownload}
              className="text-xs flex items-center gap-1"
            >
              <Download className="h-3 w-3" />
              <span className="hidden sm:inline">Download</span>
            </Button>
            
            {onViewInLibrary && (
              <Button 
                variant="default"
                size="sm"
                onClick={onViewInLibrary}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs flex items-center gap-1"
              >
                <BookOpen className="h-3 w-3" />
                <span className="hidden sm:inline">Save to Library</span>
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Note Panel (in Note view mode) */}
      {viewMode === 'note' && (
        <NotePanel 
          currentNote={currentNote}
          setCurrentNote={setCurrentNote}
          activeSection={activeSection}
          tableOfContents={tableOfContents}
          addNote={addNote}
          setViewMode={setViewMode}
        />
      )}
      
      {/* Modals */}
      {showKeyboardShortcuts && (
        <KeyboardShortcutsModal 
          isOpen={showKeyboardShortcuts}
          onClose={() => setShowKeyboardShortcuts(false)}
        />
      )}
      
      {showQuickQuiz && (
        <QuickQuizModal 
          isOpen={showQuickQuiz}
          onClose={() => setShowQuickQuiz(false)}
        />
      )}
      
      {showDefinitionPanel && activeDefinition && (
        <DefinitionPanel 
          isOpen={showDefinitionPanel}
          term={activeDefinition.term}
          definition={activeDefinition.definition}
          onClose={() => setShowDefinitionPanel(false)}
        />
      )}
      
      {/* Enhanced CSS to fix layout issues */}
      <style jsx global>{`
        /* Fix layout and prevent white container splitting */
        .study-main-content {
          flex: 1 !important;
          overflow-y: auto !important;
          display: flex !important;
          flex-direction: column !important;
          position: relative !important;
        }
        
        /* Ensure content fills available space */
        .study-content {
          width: 100% !important;
          height: 100% !important;
          position: relative !important;
          z-index: 1 !important;
        }
        
        /* Style for divider replacement */
        .divh-2 {
          width: 100% !important;
          position: relative !important;
          z-index: 10 !important;
          min-height: 40px !important;
          display: flex !important;
          align-items: center !important;
        }
        
        /* Search highlight styles */
        mark.search-highlight {
          background-color: rgba(255, 232, 99, 0.5) !important;
          color: inherit !important;
          border-radius: 2px;
          padding: 0;
          box-shadow: 0 0 0 1px rgba(255, 232, 99, 0.25);
        }
        
        .dark mark.search-highlight {
          background-color: rgba(255, 213, 79, 0.4) !important;
          box-shadow: 0 0 0 1px rgba(255, 213, 79, 0.3);
        }
        
        mark.search-highlight.current-match {
          background-color: rgba(255, 145, 0, 0.7) !important;
          box-shadow: 0 0 0 2px rgba(255, 145, 0, 0.3);
          position: relative;
          z-index: 5;
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
        
        /* Better positioning for search panel */
        .search-panel {
          position: absolute;
          top: 12px;
          right: 12px;
          z-index: 50;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          border-radius: 8px;
          overflow: hidden;
          background-color: white !important;
        }
        
        .dark .search-panel {
          background-color: #1f2937 !important;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }
        
        /* Ensure divider container has good styles */
        #divider-replacement-container {
          width: 100% !important;
          height: 100% !important;
        }
        
        /* Document content styles */
        .document-content {
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
        }
        
        .document-content h1, 
        .document-content h2, 
        .document-content h3 {
          margin-top: 1.5em;
          margin-bottom: 0.75em;
          font-weight: 600;
        }
        
        .document-content h1 {
          font-size: 1.5em;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 0.5em;
        }
        
        .document-content h2 {
          font-size: 1.25em;
        }
        
        .document-content h3 {
          font-size: 1.125em;
        }
        
        .document-content p {
          margin-bottom: 1em;
        }
        
        .document-content code {
          font-family: Menlo, Monaco, Consolas, 'Courier New', monospace;
          font-size: 0.9em;
          padding: 0.2em 0.4em;
          background-color: #f3f4f6;
          border-radius: 0.25em;
        }
        
        .dark .document-content code {
          background-color: #1f2937;
        }
      `}</style>
    </div>
  );
};

export default FullscreenStudyViewer;