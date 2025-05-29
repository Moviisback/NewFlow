// src/components/study-viewer/hooks/useBookmarksAndNotes.ts
import { useState, useCallback } from 'react';
import { Bookmark, UserNote, TableOfContentsItem } from '../types';

export const useBookmarksAndNotes = (tableOfContents: TableOfContentsItem[]) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [userNotes, setUserNotes] = useState<UserNote[]>([]);
  const [currentNote, setCurrentNote] = useState<string>('');

  // Toggle a bookmark (add/remove)
  const toggleBookmark = useCallback((sectionId: string, title: string) => {
    setBookmarks(prev => {
      const exists = prev.some(b => b.sectionId === sectionId);
    
      if (exists) {
        return prev.filter(b => b.sectionId !== sectionId);
      } else {
        const newBookmark: Bookmark = {
          id: `bookmark-${Date.now()}`,
          sectionId,
          title,
          createdAt: new Date()
        };
        return [...prev, newBookmark];
      }
    });
  }, []);

  // Handle adding a note
  const addNote = useCallback((sectionId?: string) => {
    if (!currentNote.trim()) return;
    
    const newNote: UserNote = {
      id: `note-${Date.now()}`,
      text: currentNote,
      sectionId: sectionId,
      timestamp: new Date()
    };
    
    setUserNotes(prev => [...prev, newNote]);
    setCurrentNote('');
  }, [currentNote]);

  // Setup event handlers for DOM events
  const initializeEventHandlers = useCallback(() => {
    const handleToggleBookmark = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.id && detail.title) {
        toggleBookmark(detail.id, detail.title);
      }
    };
    
    document.addEventListener('toggleBookmark', handleToggleBookmark);
    
    // Return a cleanup function
    return () => {
      document.removeEventListener('toggleBookmark', handleToggleBookmark);
    };
  }, [toggleBookmark]);

  // Highlight key concept in content
  const highlightKeyConceptInContent = useCallback((conceptTitle: string) => {
    if (!conceptTitle.trim()) return;
    
    // We'll use document.querySelector to access the content div
    const content = document.querySelector('.study-content');
    if (!content) return;
    
    // Clear any previous concept highlights
    const existingHighlights = content.querySelectorAll('mark.concept-highlight');
    existingHighlights.forEach(el => {
      const text = el.textContent || '';
      const textNode = document.createTextNode(text);
      el.parentNode?.replaceChild(textNode, el);
    });
    
    // Find the concept in the content using TreeWalker
    const walker = document.createTreeWalker(
      content,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          if (node.textContent && node.textContent.toLowerCase().includes(conceptTitle.toLowerCase())) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_REJECT;
        }
      }
    );
    
    // Keep track if we found and highlighted anything
    let foundMatch = false;
    let firstMatch: Element | null = null;
    
    // Process each text node
    let currentNode;
    while (currentNode = walker.nextNode()) {
      const text = currentNode.textContent || '';
      const lowercaseText = text.toLowerCase();
      const lowercaseQuery = conceptTitle.toLowerCase();
      
      // Find matching position in text (case-insensitive)
      const matchIndex = lowercaseText.indexOf(lowercaseQuery);
      
      if (matchIndex !== -1) {
        // Extract the actual case-preserving text that matched
        const actualMatch = text.substring(matchIndex, matchIndex + conceptTitle.length);
        
        // Create a document fragment for the replacement
        const fragment = document.createDocumentFragment();
        
        // Add text before the match
        if (matchIndex > 0) {
          fragment.appendChild(document.createTextNode(text.substring(0, matchIndex)));
        }
        
        // Create the highlighted match
        const mark = document.createElement('mark');
        mark.textContent = actualMatch;
        mark.className = 'concept-highlight bg-amber-200 dark:bg-amber-800';
        fragment.appendChild(mark);
        
        if (!firstMatch) {
          firstMatch = mark;
        }
        
        // Add text after the match
        if (matchIndex + conceptTitle.length < text.length) {
          fragment.appendChild(document.createTextNode(text.substring(matchIndex + conceptTitle.length)));
        }
        
        // Replace the text node with our fragment
        currentNode.parentNode?.replaceChild(fragment, currentNode);
        foundMatch = true;
        
        // Only highlight the first occurrence
        break;
      }
    }
    
    // Scroll to the first instance if found
    if (foundMatch && firstMatch) {
      // Type assertion to fix TypeScript error
      (firstMatch as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  return {
    bookmarks,
    setBookmarks,
    userNotes,
    setUserNotes,
    currentNote,
    setCurrentNote,
    addNote,
    toggleBookmark,
    initializeEventHandlers,
    highlightKeyConceptInContent
  };
};