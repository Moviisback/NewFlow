// File: app/api/summarize-progress/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Create a global progress tracking object
// This is a simple way to implement progress tracking for a single user
// In a multi-user environment, you'd need a more sophisticated solution like Redis
interface ProgressState {
  stage: string;
  processedChunks: number;
  totalChunks: number;
  lastUpdated: number;
}

// Initialize with empty values
let currentProgress: ProgressState = {
  stage: '',
  processedChunks: 0,
  totalChunks: 0,
  lastUpdated: 0
};

// Export a function to update progress from the summarize API
export function updateProgress(update: Partial<ProgressState>) {
  currentProgress = {
    ...currentProgress,
    ...update,
    lastUpdated: Date.now()
  };
}

// Reset progress
export function resetProgress() {
  currentProgress = {
    stage: '',
    processedChunks: 0,
    totalChunks: 0,
    lastUpdated: 0
  };
}

// The API endpoint to get current progress
export async function GET(req: NextRequest) {
  // Check if progress is stale (older than 3 minutes)
  const isStale = Date.now() - currentProgress.lastUpdated > 3 * 60 * 1000;
  
  if (isStale && currentProgress.stage) {
    // Reset if stale
    resetProgress();
    return NextResponse.json({ 
      stage: 'Processing timed out. Please try again.',
      processedChunks: 0,
      totalChunks: 0,
      error: 'timeout'
    });
  }
  
  return NextResponse.json(currentProgress);
}