// src/components/study-viewer/hooks/useFullscreen.ts
import { useState, useCallback, RefObject, useEffect } from 'react';

interface UseFullscreenOptions {
  containerRef: RefObject<HTMLDivElement>;
  mainScrollRef: RefObject<HTMLDivElement>;
  showControlPanel: boolean;
}

export const useFullscreen = ({ 
  containerRef, 
  mainScrollRef, 
  showControlPanel 
}: UseFullscreenOptions) => {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Update scroll container height when fullscreen or control panel changes
  useEffect(() => {
    if (mainScrollRef.current) {
      const controlPanelHeight = showControlPanel ? 120 : 40;
      const newHeight = isFullscreen 
        ? `calc(100vh - ${controlPanelHeight}px)` 
        : '500px';
      
      mainScrollRef.current.style.height = newHeight;
    }
  }, [isFullscreen, showControlPanel, mainScrollRef]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
    
    // Adjust styling for fullscreen
    if (containerRef.current) {
      if (!isFullscreen) {
        containerRef.current.style.zIndex = '9999';
        document.body.style.overflow = 'hidden';
        // Adjust scroll container height
        if (mainScrollRef.current) {
          const controlPanelHeight = showControlPanel ? 120 : 40;
          mainScrollRef.current.style.height = `calc(100vh - ${controlPanelHeight}px)`;
        }
      } else {
        document.body.style.overflow = '';
        // Reset scroll container height
        if (mainScrollRef.current) {
          mainScrollRef.current.style.height = '500px';
        }
      }
    }
  }, [isFullscreen, containerRef, mainScrollRef, showControlPanel]);

  // Clean up when unmounting
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return {
    isFullscreen,
    toggleFullscreen
  };
};