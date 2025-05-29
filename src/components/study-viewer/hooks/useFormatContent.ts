// src/components/study-viewer/hooks/useFormatContent.ts
import { useState, useEffect } from 'react';
import { formatContent, formatOriginalContent } from '../utils/formatContent';

/**
 * Custom hook for formatting content for display in the study viewer
 * Supports both summary and original content with appropriate formatting
 * 
 * @param content The raw content to format
 * @param isOriginal Whether this is original document content (vs summary)
 * @returns Object containing the formatted content
 */
export const useFormatContent = (content: string, isOriginal: boolean = false) => {
  const [formattedContent, setFormattedContent] = useState<string>('');
  
  // Debug logging to help identify content formatting issues
  useEffect(() => {
    console.log(`useFormatContent - Formatting ${isOriginal ? 'original' : 'summary'} content`);
    console.log(`Content length: ${content?.length || 0}`);
    console.log(`Content type: ${typeof content}`);
  }, [content, isOriginal]);
  
  // Process and format the content when it changes
  useEffect(() => {
    if (!content) {
      setFormattedContent(isOriginal 
        ? '<p class="text-gray-500 dark:text-gray-400">No original content available.</p>'
        : '<p class="text-gray-500 dark:text-gray-400">No summary content available.</p>'
      );
      return;
    }
    
    if (isOriginal) {
      // Format as original document content
      setFormattedContent(formatOriginalContent(content));
    } else {
      // Format as summary content
      setFormattedContent(formatContent(content));
    }
  }, [content, isOriginal]);
  
  return { formattedContent };
};

export default useFormatContent;