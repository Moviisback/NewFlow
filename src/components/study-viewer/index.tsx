// src/components/study-viewer/index.tsx
import React from 'react';
import FullscreenStudyViewer from './FullscreenStudyViewer';
import type { 
  FullscreenStudyViewerProps, 
  TableOfContentsItem,
  SidebarItem,
  Bookmark,
  UserNote,
  Highlight,
  ViewMode
} from './types';

// Re-export types for external use
export type {
  FullscreenStudyViewerProps,
  TableOfContentsItem,
  SidebarItem,
  Bookmark,
  UserNote,
  Highlight,
  ViewMode
};

// Main component export
export default FullscreenStudyViewer;

// Utility function: Extract table of contents from formatted content
export const extractTableOfContents = (html: string): TableOfContentsItem[] => {
  const toc: TableOfContentsItem[] = [];
  
  // Use a regular expression to find heading elements with IDs
  const headingPattern = /<h([1-6])[^>]*id="([^"]+)"[^>]*>.*?<span class="flex-1">(.*?)<\/span>/g;
  
  let match;
  while ((match = headingPattern.exec(html)) !== null) {
    const level = parseInt(match[1], 10);
    const id = match[2];
    const title = match[3];
    
    toc.push({
      level,
      id,
      title
    });
  }
  
  return toc;
};

// Utility function: Extract key information from formatted content
export const extractKeyInformation = (html: string): SidebarItem[] => {
  const keyInfo: SidebarItem[] = [];
  
  // Extract learning objectives
  const objectivesPattern = /\[LEARNING_OBJECTIVES\]([\s\S]*?)(?=\[|\n\s*\n|$)/i;
  const objectivesMatch = html.match(objectivesPattern);
  if (objectivesMatch && objectivesMatch[1]) {
    keyInfo.push({
      type: 'objectives',
      content: objectivesMatch[1].trim()
    });
  }
  
  // Extract definitions
  const definitionPattern = /\[DEFINITION\]([\s\S]*?)\[\/DEFINITION\]/gi;
  let defMatch;
  while ((defMatch = definitionPattern.exec(html)) !== null) {
    if (defMatch && defMatch[1]) {
      const defContent = defMatch[1].trim();
      const titleMatch = defContent.match(/\*\*(.*?)\*\*/);
      const title = titleMatch ? titleMatch[1] : 'Definition';
      
      keyInfo.push({
        type: 'definition',
        title: title,
        content: defContent
      });
    }
  }
  
  // Extract key concepts
  const conceptPattern = /\*\*([\w\s-]+)\*\*:\s*((?:[^*]|(?:\*(?!\*)))+)/g;
  let conceptMatch;
  while ((conceptMatch = conceptPattern.exec(html)) !== null) {
    if (conceptMatch && conceptMatch[1] && conceptMatch[2]) {
      keyInfo.push({
        type: 'concept',
        title: conceptMatch[1].trim(),
        content: conceptMatch[2].trim()
      });
    }
  }
  
  return keyInfo;
};