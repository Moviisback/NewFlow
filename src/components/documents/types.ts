// components/documents/types.ts
import { SummaryOptions } from '@/types/summaryOptions';
import { RubricScore } from '@/types/rubric';

// Define interface for library items
export interface LibraryItem {
  id: number;
  title: string;
  type: string; // e.g., 'summary', 'flashcard', 'pdf', 'docx'
  date: string;
  validated: boolean;
  validationScore?: number; // For progress indicator
  content?: string; // Original text content
  summary?: string; // Generated summary/material
  options?: SummaryOptions;
  tags?: string[]; // For future use
}

// Define interface for validation result
export interface ValidationResult {
  overallScore: number;
  questionCount: number;
  answeredCorrectly: number;
  partiallyAnswered: number;
  unanswered: number;
  questions: Array<{
    question: string;
    originalInfo: string;
    status: 'correct' | 'partial' | 'missing';
    note?: string;
  }>;
  missingConcepts: string[];
}

// Define interface for summary metadata
export interface SummaryMeta {
  options: SummaryOptions;
  contentLength: number;
  wasContentTruncated: boolean;
}

// Define interface for processing progress
export interface ProcessingProgress {
  stage: string;
  processedChunks: number;
  totalChunks: number;
  error?: string;
}

// Define the structure for a single color theme
export interface ColorTheme {
  bg: string;
  border: string;
  text: string;
  icon: string;
  accent: string;
  light: string;
}

// Type for ProgressIndicator props
export interface ProgressIndicatorProps {
  percent?: number;
  size?: "small" | "large";
}

// Type for DocumentCard Props
export interface DocumentCardProps {
  document: LibraryItem;
  onSelect: (doc: LibraryItem) => void;
  viewMode?: "grid" | "list";
  // Add new callback properties for dropdown menu actions
  onDelete?: (id: number) => void;
  onEdit?: (item: LibraryItem) => void;
  onShare?: (item: LibraryItem) => void;
}

// Type for EnhancedTabs Props
export interface EnhancedTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

// Type for SearchAndFilter Props
export interface SearchAndFilterProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  viewMode: string;
  setViewMode: (mode: string) => void;
  sortFilterOpen: boolean;
  setSortFilterOpen: (open: boolean) => void;
  sortBy: string;
  sortDirection: string;
  filters: string[];
  handleSortChange: (newSortBy: string, newDirection?: string | null) => void;
  handleFilterChange: (filterType: string) => void;
  availableTypes: string[];
}

// Type for EnhancedEmptyLibrary Props
export interface EnhancedEmptyLibraryProps {
  onUpload: () => void;
}

// Configuration constants
export const ACCEPTED_FILE_TYPES = ".pdf,.docx,.txt";
export const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "text/plain" // .txt
];
export const MAX_FILE_SIZE_MB = 15;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;