// src/components/study-viewer/hooks/useScrollTracking.ts
import { useState, useCallback, RefObject, useEffect } from 'react';
import { ViewMode, TableOfContentsItem } from '../types';

interface UseScrollTrackingOptions {
  contentRef: RefObject<HTMLDivElement>;
  tableOfContents: TableOfContentsItem[];
  viewMode: ViewMode;
}

export const useScrollTracking = ({ contentRef, tableOfContents, viewMode }: UseScrollTrackingOptions) => {
  const [activeSection, setActiveSection] = useState<string>('');
  const [readingProgress, setReadingProgress] = useState<number>(0);
  const [lastReadPosition, setLastReadPosition] = useState<number>(0);
  const [isScrollingUp, setIsScrollingUp] = useState<boolean>(false);
  const [showScrollToTop, setShowScrollToTop] = useState<boolean>(false);
  const [focusedElement, setFocusedElement] = useState<string | null>(null);

  // Function to compute which section is active based on scroll position
  const computeActiveSection = useCallback(() => {
    if (!contentRef.current || tableOfContents.length === 0) return;
    
    const scrollContainer = contentRef.current.closest('.study-main-content') as HTMLElement;
    if (!scrollContainer) return;
    
    const scrollTop = scrollContainer.scrollTop;
    const containerHeight = scrollContainer.clientHeight;
    
    // Get all section elements with positions
    const sectionElements: Array<{id: string, top: number, element: HTMLElement}> = [];
    
    tableOfContents.forEach(section => {
      const element = document.getElementById(section.id);
      if (element) {
        const rect = element.getBoundingClientRect();
        const containerRect = scrollContainer.getBoundingClientRect();
        const relativeTop = rect.top - containerRect.top;
        
        sectionElements.push({
          id: section.id,
          top: relativeTop,
          element
        });
      }
    });
    
    // Sort by vertical position
    sectionElements.sort((a, b) => a.top - b.top);
    
    // Find the last section that is above the middle of the viewport
    let active = '';
    const midpoint = containerHeight / 3; // 1/3 from top
    
    for (const section of sectionElements) {
      if (section.top <= midpoint) {
        active = section.id;
      } else {
        break;
      }
    }
    
    // If no section is found, use the first one
    if (!active && sectionElements.length > 0) {
      active = sectionElements[0].id;
    }
    
    // Only update if we have a valid section and it's different
    if (active && active !== activeSection) {
      setActiveSection(active);
      console.log(`Active section changed to: ${active}`);
      
      // Find and highlight the element in the TOC
      const tocItem = document.querySelector(`[data-section-id="${active}"]`) as HTMLElement | null;
      if (tocItem) {
        // Scroll TOC item into view if not visible
        const tocContainer = tocItem.closest('[ref="tocRef"]');
        if (tocContainer) {
          tocItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }
  }, [contentRef, tableOfContents, activeSection]);

  // Track scroll position for navigation and progress
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      const scrollTop = target.scrollTop;
      const scrollHeight = target.scrollHeight;
      const clientHeight = target.clientHeight;
      
      // Calculate reading progress
      const progress = Math.min(100, Math.max(0, (scrollTop / (scrollHeight - clientHeight)) * 100));
      setReadingProgress(progress);
      
      // Store last position
      setLastReadPosition(scrollTop);
      
      // Show scroll-to-top button when scrolled down
      setShowScrollToTop(scrollTop > 300);
      
      // Determine scroll direction
      const lastScrollTop = parseInt(target.dataset.lastScrollTop || '0');
      setIsScrollingUp(scrollTop < lastScrollTop);
      target.dataset.lastScrollTop = scrollTop.toString();
      
      // Compute active section
      setTimeout(() => computeActiveSection(), 100);
      
      // Focus mode highlight
      if (viewMode === 'focus' && contentRef.current) {
        const paragraphs = Array.from(contentRef.current.querySelectorAll('p'));
        let bestElement: Element | null = null;
        let bestVisibility = 0;

        paragraphs.forEach(paraElement => {
          const para = paraElement as HTMLElement; // Explicit cast to HTMLElement
          const rect = para.getBoundingClientRect();
          const containerRect = target.getBoundingClientRect();
          
          // Calculate visibility percentage
          const visibleTop = Math.max(0, rect.top - containerRect.top);
          const visibleBottom = Math.min(containerRect.height, rect.bottom - containerRect.top);
          const visibleHeight = Math.max(0, visibleBottom - visibleTop);
          const visibilityPercent = visibleHeight / rect.height;
          
          if (visibilityPercent > bestVisibility) {
            bestVisibility = visibilityPercent;
            bestElement = para;
          }
          
          // HTMLElement definitely has classList
          (para as HTMLElement).classList.remove('focus-active');
        });

        // Add focus to most visible paragraph
        if (bestElement && bestVisibility > 0.3) {
          (bestElement as HTMLElement).classList.add('focus-active');
          const elementId = (bestElement as HTMLElement).id;
          setFocusedElement(elementId || null);
        }
      }
    },
    [viewMode, contentRef, computeActiveSection]
  );

  // Compute active section on mount and when content changes
  useEffect(() => {
    setTimeout(() => {
      computeActiveSection();
    }, 200);
  }, [computeActiveSection, tableOfContents]);

  // Scroll to a section
  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (!element) {
      console.error(`Section with ID ${sectionId} not found`);
      return;
    }
    
    try {
      const scrollContainer = element.closest('.study-main-content') as HTMLElement | null;
      
      if (scrollContainer) {
        // Get element's position relative to the container
        const elementRect = element.getBoundingClientRect();
        const containerRect = scrollContainer.getBoundingClientRect();
        const relativeTop = elementRect.top - containerRect.top + scrollContainer.scrollTop;
        
        // Scroll with offset
        scrollContainer.scrollTo({
          top: Math.max(0, relativeTop - 80), // 80px offset for header
          behavior: 'smooth'
        });
        
        // Set active section directly
        setActiveSection(sectionId);
        
        // Add temporary highlight
        element.classList.add('highlight-active-section');
        setTimeout(() => {
          element.classList.remove('highlight-active-section');
        }, 2000);
      } else {
        // Fallback to scrollIntoView
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
        setActiveSection(sectionId);
      }
    } catch (error) {
      console.error('Error scrolling to section:', error);
    }
  }, []);

  // Scroll to top
  const scrollToTop = useCallback(() => {
    const mainContent = document.querySelector('.study-main-content') as HTMLElement | null;
    if (mainContent) {
      mainContent.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, []);

  return {
    activeSection,
    readingProgress,
    lastReadPosition,
    isScrollingUp,
    showScrollToTop,
    focusedElement,
    handleScroll,
    scrollToSection,
    scrollToTop
  };
};