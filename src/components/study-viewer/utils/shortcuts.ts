// src/components/study-viewer/utils/shortcuts.ts

// Define keyboard shortcut definitions for documentation and reference
export const KEYBOARD_SHORTCUTS = {
  navigation: [
    { key: 'T', description: 'Toggle Table of Contents', ctrlKey: false },
    { key: 'I', description: 'Toggle Info Sidebar', ctrlKey: false },
    { key: 'F', description: 'Toggle Fullscreen', ctrlKey: false },
    { key: 'F', description: 'Search', ctrlKey: true },
    { key: 'Z', description: 'Toggle Focus Mode', ctrlKey: false },
    { key: 'Q', description: 'Show Quick Quiz', ctrlKey: false },
  ],
  tools: [
    { key: 'H', description: 'Toggle Highlight Mode', ctrlKey: false },
    { key: 'N', description: 'Toggle Note Mode', ctrlKey: false },
    { key: 'B', description: 'Bookmark Active Section', ctrlKey: true },
    { key: 'D', description: 'Toggle Dark Mode', ctrlKey: true },
  ],
  other: [
    { key: '?', description: 'Show Keyboard Shortcuts', ctrlKey: false },
    { key: 'S', description: 'Download Document', ctrlKey: true },
    { key: 'Esc', description: 'Exit Current Mode/View', ctrlKey: false },
  ],
};

/**
 * Register keyboard event handlers for the study viewer
 * @param handlers Object containing handler functions for each shortcut
 * @returns Cleanup function to remove event listeners
 */
export const registerKeyboardShortcuts = (handlers: Record<string, (e: KeyboardEvent) => void>): () => void => {
  const handleKeyDown = (event: KeyboardEvent) => {
    // Ignore keyboard shortcuts when input fields are focused
    if (
      event.target instanceof HTMLInputElement || 
      event.target instanceof HTMLTextAreaElement
    ) {
      return;
    }
    
    // Common shortcuts
    if (event.ctrlKey || event.metaKey) {
      // Ctrl/Cmd + F for search
      if (event.key === 'f' && handlers.search) {
        event.preventDefault();
        handlers.search(event);
      }
      
      // Ctrl/Cmd + D for dark mode toggle
      if (event.key === 'd' && handlers.toggleDarkMode) {
        event.preventDefault();
        handlers.toggleDarkMode(event);
      }
      
      // Ctrl/Cmd + B for bookmark
      if (event.key === 'b' && handlers.toggleBookmark) {
        event.preventDefault();
        handlers.toggleBookmark(event);
      }
      
      // Ctrl/Cmd + S for save/download
      if (event.key === 's' && handlers.download) {
        event.preventDefault();
        handlers.download(event);
      }
    } else {
      // Simple shortcuts
      
      // T to toggle left sidebar (TOC)
      if (event.key === 't' && handlers.toggleLeftSidebar) {
        handlers.toggleLeftSidebar(event);
      }
      
      // I to toggle right sidebar (Info)
      if (event.key === 'i' && handlers.toggleRightSidebar) {
        handlers.toggleRightSidebar(event);
      }
      
      // H to toggle highlight mode
      if (event.key === 'h' && handlers.toggleHighlightMode) {
        handlers.toggleHighlightMode(event);
      }
      
      // N to toggle note mode
      if (event.key === 'n' && handlers.toggleNoteMode) {
        handlers.toggleNoteMode(event);
      }
      
      // F to toggle fullscreen
      if (event.key === 'f' && handlers.toggleFullscreen) {
        handlers.toggleFullscreen(event);
      }

      // Z to toggle focus mode
      if (event.key === 'z' && handlers.toggleFocusMode) {
        handlers.toggleFocusMode(event);
      }
      
      // ? to show keyboard shortcuts
      if (event.key === '?' && handlers.showKeyboardShortcuts) {
        handlers.showKeyboardShortcuts(event);
      }

      // Q to toggle quiz mode
      if (event.key === 'q' && handlers.toggleQuickQuiz) {
        handlers.toggleQuickQuiz(event);
      }
      
      // Escape to exit modes/fullscreen
      if (event.key === 'Escape' && handlers.handleEscape) {
        handlers.handleEscape(event);
      }
    }
  };

  // Add event listener
  window.addEventListener('keydown', handleKeyDown);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
};