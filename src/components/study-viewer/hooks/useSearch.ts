// src/components/study-viewer/hooks/useSearch.ts
import { useState, useCallback, RefObject, useRef, useEffect } from 'react';

interface UseSearchOptions {
  contentRef: RefObject<HTMLDivElement>;
}

// Define search result type
interface SearchResult {
  node: Node;
  startOffset: number;
  endOffset: number;
  text: string;
}

/**
 * A Chrome-inspired search hook that performs asynchronous searching
 * with efficient DOM traversal and virtual result set
 */
export const useSearch = ({ contentRef }: UseSearchOptions) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<number>(0);
  const [currentSearchIndex, setCurrentSearchIndex] = useState<number>(0);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  
  // Store matched search results for navigation
  const resultSetRef = useRef<SearchResult[]>([]);
  
  // For cancelling in-progress searches
  const searchCancelRef = useRef<AbortController | null>(null);
  
  // For worker communication
  const searchWorkerRef = useRef<Worker | null>(null);
  
  // Search options
  const [caseSensitive, setCaseSensitive] = useState<boolean>(false);
  const [wholeWord, setWholeWord] = useState<boolean>(false);

  // Initialize search worker on mount
  useEffect(() => {
    // Clean up function
    return () => {
      // Cancel any in-progress searches
      if (searchCancelRef.current) {
        searchCancelRef.current.abort();
      }
      
      // Clear result highlights
      clearSearchHighlights();
    };
  }, []);

  // Clear all search highlighting
  const clearSearchHighlights = useCallback(() => {
    // Skip if no content to work with
    if (!contentRef.current) return;
    
    try {
      // Find all highlighted matches
      const existingHighlights = contentRef.current.querySelectorAll('mark.search-highlight');
      
      // For each highlight, replace it with its text content
      existingHighlights.forEach(el => {
        const text = el.textContent || '';
        
        // Only perform replacement if we have a parent node
        if (el.parentNode) {
          const textNode = document.createTextNode(text);
          el.parentNode.replaceChild(textNode, el);
          
          // Normalize to combine adjacent text nodes for cleaner DOM
          if (el.parentNode.normalize) {
            el.parentNode.normalize();
          }
        }
      });
      
      // Reset result set
      resultSetRef.current = [];
      setSearchResults(0);
      setCurrentSearchIndex(0);
    } catch (error) {
      console.error('Error clearing search highlights:', error);
    }
  }, [contentRef]);

  // Escape special regex characters for safe regex usage
  const escapeRegExp = (string: string): string => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // Create a worker-like promise-based search function
  const createSearchTask = (
    searchText: string, 
    rootNode: Node, 
    options: { caseSensitive: boolean, wholeWord: boolean }
  ): Promise<SearchResult[]> => {
    return new Promise((resolve, reject) => {
      // Create abort controller for cancellation
      const abortController = new AbortController();
      searchCancelRef.current = abortController;
      
      // Signal to check for cancellation
      const signal = abortController.signal;
      
      // Use requestIdleCallback to prevent UI blocking
      requestIdleCallback((deadline) => {
        try {
          // Start the search
          const results: SearchResult[] = [];
          
          // Create regex pattern based on options
          const pattern = options.wholeWord 
            ? new RegExp(`\\b${escapeRegExp(searchText)}\\b`, options.caseSensitive ? 'g' : 'gi')
            : new RegExp(escapeRegExp(searchText), options.caseSensitive ? 'g' : 'gi');
          
          // Create text iterator (similar to Chrome's TextIterator)
          const walker = document.createTreeWalker(
            rootNode,
            NodeFilter.SHOW_TEXT,
            {
              acceptNode: (node) => {
                // Skip script, style, and other non-content nodes
                const parent = node.parentNode;
                if (!parent || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.nodeName)) {
                  return NodeFilter.FILTER_REJECT;
                }
                
                // Skip empty text nodes
                if (!node.textContent || node.textContent.trim() === '') {
                  return NodeFilter.FILTER_REJECT;
                }
                
                return NodeFilter.FILTER_ACCEPT;
              }
            }
          );
          
          // Batch processing to prevent UI blocking
          const processNextBatch = (deadline: IdleDeadline) => {
            // Check for cancellation
            if (signal.aborted) {
              return reject(new Error('Search cancelled'));
            }
            
            let timeRemaining = deadline.timeRemaining();
            let node: Node | null;
            
            // Process nodes until we run out of time
            while (timeRemaining > 0 && (node = walker.nextNode())) {
              // Check for cancellation inside the loop
              if (signal.aborted) {
                return reject(new Error('Search cancelled'));
              }
              
              const text = node.textContent || '';
              
              // Reset regex for each text node
              pattern.lastIndex = 0;
              
              // Find all matches in this text node
              let match;
              while ((match = pattern.exec(text))) {
                results.push({
                  node,
                  startOffset: match.index,
                  endOffset: match.index + match[0].length,
                  text: match[0]
                });
              }
              
              // Update time remaining
              timeRemaining = deadline.timeRemaining();
            }
            
            // If we've processed all nodes, resolve
            if (!walker.nextNode()) {
              resolve(results);
            } else {
              // Otherwise, schedule next batch
              requestIdleCallback(processNextBatch);
            }
          };
          
          // Start processing
          requestIdleCallback(processNextBatch);
        } catch (error) {
          reject(error);
        }
      });
    });
  };

  // Apply search results to DOM
  const applySearchResults = useCallback((results: SearchResult[]) => {
    // Skip if no results or no content ref
    if (results.length === 0 || !contentRef.current) return;
    
    // Clear existing highlights first
    clearSearchHighlights();
    
    // Apply new highlights
    let markedCount = 0;
    const highlights: HTMLElement[] = [];
    
    // Process each result
    results.forEach((result) => {
      try {
        // Skip if node is no longer in the DOM
        if (!document.body.contains(result.node as Node)) {
          return;
        }
        
        // Create a range around the match
        const range = document.createRange();
        range.setStart(result.node, result.startOffset);
        range.setEnd(result.node, result.endOffset);
        
        // Create a highlight element
        const mark = document.createElement('mark');
        mark.className = 'search-highlight';
        mark.dataset.searchIndex = String(markedCount++);
        
        // Wrap the range with the highlight
        range.surroundContents(mark);
        
        // Add to our highlight collection
        highlights.push(mark);
      } catch (error) {
        console.error('Error highlighting search result:', error);
      }
    });
    
    // Update state
    resultSetRef.current = results;
    setSearchResults(highlights.length);
    
    // Navigate to first result if we have any
    if (highlights.length > 0) {
      setCurrentSearchIndex(1); // 1-based for display
      navigateToHighlight(highlights[0]);
    }
  }, [contentRef, clearSearchHighlights]);
  
  // Perform search with asynchronous, cancellable execution
  const performSearch = useCallback(async () => {
    // Cancel any in-progress search
    if (searchCancelRef.current) {
      searchCancelRef.current.abort();
    }
    
    // Clear current results
    clearSearchHighlights();
    
    // Skip empty searches or when there's no content
    if (!searchQuery.trim() || !contentRef.current) {
      return;
    }

    setIsSearching(true);
    
    try {
      // Create and execute search task
      const results = await createSearchTask(
        searchQuery, 
        contentRef.current, 
        { caseSensitive, wholeWord }
      );
      
      // Apply results to DOM
      applySearchResults(results);
      
      console.log(`Search completed: found ${results.length} matches`);
    } catch (error) {
      // Handle error (including cancellation)
      if ((error as Error).message !== 'Search cancelled') {
        console.error('Error performing search:', error);
      }
    } finally {
      // Always update UI state
      setIsSearching(false);
    }
  }, [searchQuery, contentRef, clearSearchHighlights, caseSensitive, wholeWord, applySearchResults]);

  // Navigate to a specific highlighted result
  const navigateToHighlight = useCallback((highlight: HTMLElement) => {
    // Skip if element is no longer in DOM
    if (!highlight || !document.body.contains(highlight)) {
      console.log("Highlight element is no longer in the DOM");
      return;
    }
    
    try {
      // Remove current highlight marker from all matches
      const currentHighlights = document.querySelectorAll('mark.search-highlight');
      currentHighlights.forEach(node => {
        if (node && document.body.contains(node)) {
          node.classList.remove('current-match');
        }
      });
      
      // Mark this as the active result
      highlight.classList.add('current-match');
      
      // Scroll the highlight into view with appropriate positioning
      highlight.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
      
      // Add a pulse effect for better visibility
      highlight.classList.add('pulse-effect');
      setTimeout(() => {
        if (highlight && document.body.contains(highlight)) {
          highlight.classList.remove('pulse-effect');
        }
      }, 1200);
    } catch (error) {
      console.error('Error navigating to highlight:', error);
    }
  }, []);

  // Navigate between search results (next/previous)
  const navigateSearchResults = useCallback((direction: 'next' | 'prev') => {
    // Get all highlight elements
    const highlightElements = document.querySelectorAll('mark.search-highlight');
    const highlights = Array.from(highlightElements) as HTMLElement[];
    
    if (highlights.length === 0 || searchResults === 0) {
      return;
    }
    
    // Calculate the new index based on direction
    let newIndex;
    if (direction === 'next') {
      newIndex = currentSearchIndex === searchResults ? 1 : currentSearchIndex + 1;
    } else {
      newIndex = currentSearchIndex === 1 ? searchResults : currentSearchIndex - 1;
    }
    
    // Find the highlight element with the corresponding index
    const nextHighlight = highlights.find(el => el.dataset.searchIndex === String(newIndex - 1));
    
    // Verify the highlight element exists in the DOM
    if (!nextHighlight || !document.body.contains(nextHighlight)) {
      console.warn('Highlight element no longer in DOM, refreshing search');
      performSearch(); // Re-run search to rebuild highlights
      return;
    }
    
    // Update state and navigate
    setCurrentSearchIndex(newIndex);
    navigateToHighlight(nextHighlight);
  }, [searchResults, currentSearchIndex, navigateToHighlight, performSearch]);

  // Toggle case sensitivity
  const toggleCaseSensitive = useCallback(() => {
    setCaseSensitive(prev => !prev);
  }, []);

  // Toggle whole word matching
  const toggleWholeWord = useCallback(() => {
    setWholeWord(prev => !prev);
  }, []);

  // Re-search when options change
  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch();
    }
  }, [caseSensitive, wholeWord, performSearch]);

  return {
    // State
    searchQuery,
    setSearchQuery,
    searchResults,
    currentSearchIndex,
    isSearching,
    caseSensitive,
    wholeWord,
    
    // Actions
    performSearch,
    navigateSearchResults,
    clearSearchHighlights,
    toggleCaseSensitive,
    toggleWholeWord
  };
};