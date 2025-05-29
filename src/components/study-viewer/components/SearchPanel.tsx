// src/components/study-viewer/components/SearchPanel.tsx
import React, { useRef, useEffect } from 'react';
import { Search, X, ArrowUp, ArrowDown, Settings, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface SearchPanelProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: number;
  currentSearchIndex: number;
  isSearching: boolean;
  caseSensitive: boolean;
  wholeWord: boolean;
  performSearch: () => void;
  navigateSearchResults: (direction: 'next' | 'prev') => void;
  clearSearchHighlights: () => void;
  toggleCaseSensitive: () => void;
  toggleWholeWord: () => void;
  onClose: () => void;
}

const SearchPanel: React.FC<SearchPanelProps> = ({
  searchQuery,
  setSearchQuery,
  searchResults,
  currentSearchIndex,
  isSearching,
  caseSensitive,
  wholeWord,
  performSearch,
  navigateSearchResults,
  clearSearchHighlights,
  toggleCaseSensitive,
  toggleWholeWord,
  onClose
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when search panel opens
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Trigger search when query changes
  useEffect(() => {
    // Only perform search if we have a query
    if (searchQuery.trim().length > 0) {
      // Set a small delay to avoid searching on every keystroke
      const timer = setTimeout(() => {
        performSearch();
      }, 300);
      
      return () => clearTimeout(timer);
    } else if (searchQuery === '') {
      // Clear highlights when search is emptied
      clearSearchHighlights();
    }
  }, [searchQuery, performSearch, clearSearchHighlights]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close search
      if (e.key === 'Escape') {
        onClose();
      }
      
      // Enter to search or navigate to next result
      if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
          navigateSearchResults('prev');
        } else {
          navigateSearchResults('next');
        }
      }
      
      // F3 to navigate to next result
      if (e.key === 'F3') {
        e.preventDefault();
        if (e.shiftKey) {
          navigateSearchResults('prev');
        } else {
          navigateSearchResults('next');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateSearchResults, onClose]);

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className="absolute top-3 right-4 z-40 bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col w-80">
      <div className="flex items-center p-2 border-b border-gray-200 dark:border-gray-700">
        {/* Search input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>

          <Input
            ref={inputRef}
            type="text"
            placeholder="Search in document..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-8 h-9 text-sm w-full"
            aria-label="Search in document"
            disabled={isSearching}
          />

          {searchQuery && (
            <Button
              size="sm"
              variant="ghost"
              className="absolute inset-y-0 right-0 h-full px-2 text-gray-400 hover:text-gray-600"
              onClick={() => {
                setSearchQuery('');
                clearSearchHighlights();
                inputRef.current?.focus();
              }}
              disabled={isSearching}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear search</span>
            </Button>
          )}
        </div>

        {/* Search options button */}
        <Popover>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mx-1 h-8 w-8 p-0"
                    disabled={isSearching}
                  >
                    <Settings className="h-4 w-4" />
                    <span className="sr-only">Search options</span>
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Search options</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <PopoverContent className="w-56 p-3" align="end">
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Search Options</h3>
              
              <div className="space-y-2">
                <button
                  className="flex items-center w-full text-left text-sm"
                  onClick={toggleCaseSensitive}
                >
                  {caseSensitive ? (
                    <CheckSquare className="h-4 w-4 mr-2 text-indigo-500" />
                  ) : (
                    <Square className="h-4 w-4 mr-2 text-gray-400" />
                  )}
                  <span>Case sensitive</span>
                </button>
                
                <button
                  className="flex items-center w-full text-left text-sm"
                  onClick={toggleWholeWord}
                >
                  {wholeWord ? (
                    <CheckSquare className="h-4 w-4 mr-2 text-indigo-500" />
                  ) : (
                    <Square className="h-4 w-4 mr-2 text-gray-400" />
                  )}
                  <span>Match whole word</span>
                </button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Close button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close search</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Close search (Esc)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Search results and navigation */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {isSearching ? (
            <span>Searching...</span>
          ) : searchQuery ? (
            searchResults > 0 ? (
              <span>{currentSearchIndex} of {searchResults} results</span>
            ) : (
              <span>No results found</span>
            )
          ) : (
            <span>Type to search</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateSearchResults('prev')}
                  disabled={searchResults === 0 || isSearching}
                  className="h-7 w-7 p-0"
                >
                  <ArrowUp className="h-4 w-4" />
                  <span className="sr-only">Previous result</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Previous match (Shift+Enter)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateSearchResults('next')}
                  disabled={searchResults === 0 || isSearching}
                  className="h-7 w-7 p-0"
                >
                  <ArrowDown className="h-4 w-4" />
                  <span className="sr-only">Next result</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Next match (Enter)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
};

export default SearchPanel;