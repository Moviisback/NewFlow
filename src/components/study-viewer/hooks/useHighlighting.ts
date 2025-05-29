// src/components/study-viewer/hooks/useHighlighting.ts
import { useState, useCallback, RefObject, useEffect } from 'react';
import { Highlight } from '../types';

interface UseHighlightingOptions {
  contentRef: RefObject<HTMLDivElement>;
}

export const useHighlighting = ({ contentRef }: UseHighlightingOptions) => {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [highlightColor, setHighlightColor] = useState<'yellow' | 'green' | 'blue' | 'pink'>('yellow');

  // Apply CSS classes for highlight colors
  useEffect(() => {
    // Ensure we have the content element to work with
    if (!contentRef.current) return;
    
    // Create a style element if it doesn't exist
    let styleElement = document.getElementById('highlight-styles');
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'highlight-styles';
      document.head.appendChild(styleElement);
    }
    
    // Define CSS for highlighting styles
    styleElement.textContent = `
      .highlight-container {
        position: relative;
        display: inline;
      }
      
      /* Base highlight styles */
      .text-highlight {
        border-radius: 2px;
        padding: 2px 0;
      }
      
      /* Color variants */
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
      
      /* Dark mode adjustments */
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
      
      /* Highlight active style */
      .highlight-active {
        box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.5);
      }
    `;
    
    // Clean up on unmount
    return () => {
      if (styleElement && document.head.contains(styleElement)) {
        document.head.removeChild(styleElement);
      }
    };
  }, [contentRef]);

  // Text highlighting functionality
  const handleTextHighlight = useCallback(() => {
    if (!contentRef.current) {
      console.warn('Content reference not available for highlighting');
      return;
    }
    
    // Get the current selection
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      console.log('No text selected for highlighting');
      return;
    }
    
    const selectedText = selection.toString().trim();
    if (!selectedText) {
      console.log('Selected text is empty');
      return;
    }

    // Log the selection details
    console.log(`Highlighting text: "${selectedText}" with color: ${highlightColor}`);
    
    try {
      // Get selection range
      const range = selection.getRangeAt(0);
      
      // Create span element to wrap the highlighted text
      const highlightSpan = document.createElement('span');
      highlightSpan.className = `text-highlight ${highlightColor}-highlight`;
      highlightSpan.setAttribute('data-highlight-id', `highlight-${Date.now()}`);
      highlightSpan.setAttribute('data-highlight-color', highlightColor);
      
      // Wrap the selected content with our highlight span
      range.surroundContents(highlightSpan);
      
      // Create a new highlight object
      const newHighlight: Highlight = {
        id: highlightSpan.getAttribute('data-highlight-id') || `highlight-${Date.now()}`,
        text: selectedText,
        sectionId: findSectionForNode(highlightSpan), // Get the section this highlight belongs to
        color: highlightColor,
        timestamp: new Date()
      };
      
      // Update highlights state
      setHighlights(prev => [...prev, newHighlight]);
      
      // Clear selection
      selection.removeAllRanges();
      
      // Provide visual feedback
      highlightSpan.classList.add('highlight-active');
      setTimeout(() => {
        if (highlightSpan && document.body.contains(highlightSpan)) {
          highlightSpan.classList.remove('highlight-active');
        }
      }, 800);
      
      // Debug success message
      console.log('Successfully applied highlight:', newHighlight);
    } catch (error) {
      console.error('Error applying highlight:', error);
      
      // Fallback for complex selections that span multiple DOM elements
      try {
        // Extract the selected content
        const range = selection.getRangeAt(0);
        const extractedContent = range.extractContents();
        
        // Create highlight container
        const highlightSpan = document.createElement('span');
        highlightSpan.className = `text-highlight ${highlightColor}-highlight`;
        highlightSpan.setAttribute('data-highlight-id', `highlight-${Date.now()}`);
        highlightSpan.setAttribute('data-highlight-color', highlightColor);
        
        // Add the extracted content to the highlight span
        highlightSpan.appendChild(extractedContent);
        
        // Insert the highlight span at the current position
        range.insertNode(highlightSpan);
        
        // Create a new highlight object
        const newHighlight: Highlight = {
          id: highlightSpan.getAttribute('data-highlight-id') || `highlight-${Date.now()}`,
          text: selectedText,
          sectionId: findSectionForNode(highlightSpan),
          color: highlightColor,
          timestamp: new Date()
        };
        
        // Update highlights state
        setHighlights(prev => [...prev, newHighlight]);
        
        // Clear selection
        selection.removeAllRanges();
        
        // Provide visual feedback
        highlightSpan.classList.add('highlight-active');
        setTimeout(() => {
          if (highlightSpan && document.body.contains(highlightSpan)) {
            highlightSpan.classList.remove('highlight-active');
          }
        }, 800);
        
        // Debug success message
        console.log('Successfully applied highlight (fallback method):', newHighlight);
      } catch (fallbackError) {
        console.error('Fallback highlighting method also failed:', fallbackError);
      }
    }
  }, [contentRef, highlightColor]);

  // Helper function to find which section a highlighted node belongs to
  const findSectionForNode = (node: Node): string | undefined => {
    if (!contentRef.current) return undefined;
    
    let currentNode: Node | null = node;
    
    // Traverse up the DOM to find the nearest section heading
    while (currentNode && currentNode !== contentRef.current) {
      const prevSibling = currentNode.previousSibling;
      
      if (prevSibling instanceof HTMLElement) {
        const tagName = prevSibling.tagName.toLowerCase();
        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName) && prevSibling.id) {
          return prevSibling.id;
        }
      }
      
      currentNode = currentNode.parentNode;
    }
    
    // If no specific section found, look for the first heading in the document
    const firstHeading = contentRef.current.querySelector('h1, h2, h3, h4, h5, h6');
    return firstHeading?.id;
  };

  // Clean up highlights when unmounting or as requested
  const cleanupHighlights = useCallback(() => {
    if (!contentRef.current) return;
    
    try {
      const highlightElements = contentRef.current.querySelectorAll('.text-highlight');
      highlightElements.forEach(el => {
        if (el.parentNode) {
          const text = el.textContent || '';
          const textNode = document.createTextNode(text);
          el.parentNode.replaceChild(textNode, el);
          
          // Normalize to combine adjacent text nodes for cleaner DOM
          if (el.parentNode.normalize) {
            el.parentNode.normalize();
          }
        }
      });
      
      setHighlights([]);
    } catch (error) {
      console.error('Error cleaning up highlights:', error);
    }
  }, [contentRef]);

  // Clean up highlights when component unmounts
  useEffect(() => {
    return () => {
      cleanupHighlights();
    };
  }, [cleanupHighlights]);

  return {
    highlights,
    setHighlights,
    highlightColor,
    setHighlightColor,
    handleTextHighlight,
    cleanupHighlights
  };
};