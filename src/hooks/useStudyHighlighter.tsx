// hooks/useStudyHighlighter.tsx
import { useState, useEffect, useCallback, useRef } from 'react';

type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink';

export interface Highlight {
  id: string;
  text: string;
  color: HighlightColor;
  timestamp: Date;
  sectionId?: string;
  note?: string;
}

interface StudyHighlighterOptions {
  containerRef: React.RefObject<HTMLElement>;
  onHighlightCreated?: (highlight: Highlight) => void;
  onHighlightRemoved?: (highlightId: string) => void;
  initialHighlights?: Highlight[];
  autoSave?: boolean;
  storageKey?: string;
}

interface UseStudyHighlighterReturn {
  highlights: Highlight[];
  activeColor: HighlightColor;
  setActiveColor: (color: HighlightColor) => void;
  isHighlightMode: boolean;
  setHighlightMode: (mode: boolean) => void;
  addHighlight: (text: string, color: HighlightColor, sectionId?: string) => void;
  removeHighlight: (id: string) => void;
  addNoteToHighlight: (id: string, note: string) => void;
  clearAllHighlights: () => void;
  getHighlightsForSection: (sectionId: string) => Highlight[];
}

/**
 * A hook for adding interactive text highlighting functionality to study materials
 */
export function useStudyHighlighter({
  containerRef,
  onHighlightCreated,
  onHighlightRemoved,
  initialHighlights = [],
  autoSave = true,
  storageKey = 'study-highlights'
}: StudyHighlighterOptions): UseStudyHighlighterReturn {
  // State
  const [highlights, setHighlights] = useState<Highlight[]>(initialHighlights);
  const [activeColor, setActiveColor] = useState<HighlightColor>('yellow');
  const [isHighlightMode, setHighlightMode] = useState<boolean>(false);
  
  // Refs for event handling
  const highlightsRef = useRef<Highlight[]>(initialHighlights);
  const isHighlightModeRef = useRef<boolean>(false);
  const activeColorRef = useRef<HighlightColor>('yellow');
  
  // Update refs when state changes
  useEffect(() => {
    highlightsRef.current = highlights;
    isHighlightModeRef.current = isHighlightMode;
    activeColorRef.current = activeColor;
  }, [highlights, isHighlightMode, activeColor]);

  // Load highlights from localStorage on mount
  useEffect(() => {
    if (autoSave) {
      try {
        const savedHighlights = localStorage.getItem(storageKey);
        if (savedHighlights) {
          const parsed = JSON.parse(savedHighlights);
          
          // Convert timestamp strings back to Date objects
          const processedHighlights = parsed.map((h: any) => ({
            ...h,
            timestamp: new Date(h.timestamp)
          }));
          
          setHighlights(processedHighlights);
          highlightsRef.current = processedHighlights;
        }
      } catch (error) {
        console.error('Error loading highlights from storage:', error);
      }
    }
  }, [autoSave, storageKey]);

  // Save highlights to localStorage when they change
  useEffect(() => {
    if (autoSave) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(highlights));
      } catch (error) {
        console.error('Error saving highlights to storage:', error);
      }
    }
  }, [highlights, autoSave, storageKey]);

  // Add a new highlight
  const addHighlight = useCallback((text: string, color: HighlightColor, sectionId?: string) => {
    const newHighlight: Highlight = {
      id: `highlight-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      text,
      color,
      timestamp: new Date(),
      sectionId
    };
    
    setHighlights(prev => [...prev, newHighlight]);
    
    if (onHighlightCreated) {
      onHighlightCreated(newHighlight);
    }
    
    return newHighlight;
  }, [onHighlightCreated]);

  // Remove a highlight
  const removeHighlight = useCallback((id: string) => {
    setHighlights(prev => prev.filter(h => h.id !== id));
    
    if (onHighlightRemoved) {
      onHighlightRemoved(id);
    }
  }, [onHighlightRemoved]);

  // Add a note to a highlight
  const addNoteToHighlight = useCallback((id: string, note: string) => {
    setHighlights(prev => prev.map(h => 
      h.id === id ? { ...h, note } : h
    ));
  }, []);

  // Clear all highlights
  const clearAllHighlights = useCallback(() => {
    setHighlights([]);
  }, []);

  // Get highlights for a specific section
  const getHighlightsForSection = useCallback((sectionId: string) => {
    return highlightsRef.current.filter(h => h.sectionId === sectionId);
  }, []);

  // Core functionality to handle text selection and highlighting
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Get the CSS color value based on highlight color
    const getHighlightColorValue = (color: HighlightColor): string => {
      const colors = {
        yellow: 'rgba(254, 240, 138, 0.5)', // yellow-200 at 50% opacity
        green: 'rgba(187, 247, 208, 0.5)',  // green-200 at 50% opacity
        blue: 'rgba(191, 219, 254, 0.5)',   // blue-200 at 50% opacity
        pink: 'rgba(251, 207, 232, 0.5)'    // pink-200 at 50% opacity
      };
      
      return colors[color];
    };
    
    // Apply highlight to selected text
    const handleTextHighlight = () => {
      if (!isHighlightModeRef.current || !containerRef.current) return;
      
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;
      
      const selectedText = selection.toString().trim();
      if (!selectedText) return;
      
      // Get selection range
      const range = selection.getRangeAt(0);
      
      // Find section ID if possible
      let sectionId: string | undefined;
      let currentNode: Node | null = range.startContainer;
      
      // Try to find the closest section ID by traversing up the DOM
      while (currentNode && currentNode !== containerRef.current) {
        if (currentNode.nodeType === Node.ELEMENT_NODE) {
          const element = currentNode as HTMLElement;
          if (element.id && element.id.startsWith('section-')) {
            sectionId = element.id;
            break;
          }
        }
        currentNode = currentNode.parentNode;
      }
      
      // Apply highlighter-style highlighting to the selection
      const span = document.createElement('span');
      span.className = `textmarker-highlight ${activeColorRef.current}-highlight`;
      span.style.backgroundColor = getHighlightColorValue(activeColorRef.current);
      span.style.padding = '0 2px';
      span.style.borderRadius = '2px';
      
      // Create highlight data
      let newHighlight: Highlight | null = null;
      
      try {
        // Wrap selected text in highlight span
        range.surroundContents(span);
        
        // Save highlight data
        newHighlight = addHighlight(selectedText, activeColorRef.current, sectionId);
        
        // Store highlight ID in the DOM element
        span.dataset.highlightId = newHighlight.id;
        
        // Add click handler to the span for highlight management
        span.addEventListener('click', (e) => {
          if (e.ctrlKey || e.metaKey) {
            // Ctrl/Cmd + click to remove highlight
            const id = span.dataset.highlightId;
            if (id) {
              removeHighlight(id);
              
              // Unwrap the highlight span
              const parent = span.parentNode;
              if (parent) {
                while (span.firstChild) {
                  parent.insertBefore(span.firstChild, span);
                }
                parent.removeChild(span);
              }
              
              e.preventDefault();
              e.stopPropagation();
            }
          }
        });
        
        // Clear selection after highlighting
        selection.removeAllRanges();
      } catch (e) {
        console.error('Error highlighting text:', e);
        
        // For cases where surroundContents fails (when selection spans multiple elements)
        try {
          // Extract contents and delete them
          const extractedContent = range.extractContents();
          
          // Wrap in highlight span
          span.appendChild(extractedContent);
          
          // Insert the highlighted content back
          range.insertNode(span);
          
          // Save highlight data
          newHighlight = addHighlight(selectedText, activeColorRef.current, sectionId);
          
          // Store highlight ID in the DOM element
          span.dataset.highlightId = newHighlight.id;
          
          // Add click handler for removing highlights
          span.addEventListener('click', (e) => {
            if (e.ctrlKey || e.metaKey) {
              const id = span.dataset.highlightId;
              if (id) {
                removeHighlight(id);
                
                // Unwrap the highlight span
                const parent = span.parentNode;
                if (parent) {
                  while (span.firstChild) {
                    parent.insertBefore(span.firstChild, span);
                  }
                  parent.removeChild(span);
                }
                
                e.preventDefault();
                e.stopPropagation();
              }
            }
          });
          
          // Clear selection after highlighting
          selection.removeAllRanges();
        } catch (innerError) {
          console.error('Failed alternate highlighting method:', innerError);
          
          // If both methods fail, at least save the highlight in our state
          if (!newHighlight) {
            addHighlight(selectedText, activeColorRef.current, sectionId);
          }
        }
      }
    };
    
    // Add mouseup event for text highlighting
    const handleMouseUp = () => {
      if (isHighlightModeRef.current) {
        handleTextHighlight();
      }
    };
    
    // Add event listener to content area
    containerRef.current.addEventListener('mouseup', handleMouseUp);
    
    // Clean up
    return () => {
      if (containerRef.current) {
        containerRef.current.removeEventListener('mouseup', handleMouseUp);
      }
    };
  }, [containerRef, addHighlight, removeHighlight]);

  // Apply existing highlights to the DOM
  useEffect(() => {
    if (!containerRef.current || highlights.length === 0) return;
    
    // Re-apply existing highlights when the content changes
    // This is a bit complex and would need to work with the specific 
    // content structure, so we're providing a simplified implementation
    
    // A full implementation would need to:
    // 1. Search for text matches in the DOM
    // 2. Check if they're already highlighted
    // 3. Apply highlights to matches that aren't already highlighted
    
    // This requires more context about the specific DOM structure
    // and text content organization to implement correctly
    
  }, [containerRef, highlights]);

  return {
    highlights,
    activeColor,
    setActiveColor,
    isHighlightMode,
    setHighlightMode,
    addHighlight,
    removeHighlight,
    addNoteToHighlight,
    clearAllHighlights,
    getHighlightsForSection
  };
}

export default useStudyHighlighter;