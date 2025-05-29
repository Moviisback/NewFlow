// src/components/study-viewer/types/index.ts
import { SummaryOptions } from '@/types/summaryOptions';
import { RubricScore } from '@/types/rubric';

export interface TableOfContentsItem {
  title: string;
  level: number;
  id: string;
}

export interface SidebarItem {
  type: string;
  content: string;
  title?: string;
}

export type UserNote = {
  id: string;
  text: string;
  sectionId?: string;
  timestamp: Date;
};

export type Bookmark = {
  id: string;
  sectionId: string;
  title: string;
  createdAt: Date;
};

export type Highlight = {
  id: string;
  text: string;
  sectionId?: string;
  color: 'yellow' | 'green' | 'blue' | 'pink';
  timestamp: Date;
};

export type ViewMode = 'read' | 'highlight' | 'note' | 'focus';
export type TextDensity = 'comfortable' | 'compact';
export type SidebarTab = 'info' | 'bookmarks' | 'notes' | 'study-aids';

// New type for document view toggle
export type DocumentViewType = 'summary' | 'original';

// Define interface for the document view selector component
export interface DocumentViewSelectorProps {
  currentView: DocumentViewType;
  onViewChange: (view: DocumentViewType) => void;
}

export interface FullscreenStudyViewerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  date?: string;
  summary: string;
  originalContent: string; // New property for original document content
  isValidated?: boolean;
  format?: string;
  tableOfContents: TableOfContentsItem[];
  keyInformation: SidebarItem[];
  onDownload: () => void;
  onViewInLibrary?: () => void;
  onEditSettings?: () => void;
}

// Props for child components
export interface ControlPanelProps {
  title: string;
  format?: string;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  showLeftSidebar: boolean;
  setShowLeftSidebar: (show: boolean) => void;
  showRightSidebar: boolean;
  setShowRightSidebar: (show: boolean) => void;
  onClose: () => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  toggleSearch: () => void; // For search functionality
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  searchResults?: number;
  currentSearchIndex?: number;
  performSearch?: () => void;
  navigateSearchResults?: (direction: 'next' | 'prev') => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  textDensity: TextDensity;
  toggleTextDensity: () => void;
  highlightColor: 'yellow' | 'green' | 'blue' | 'pink';
  setHighlightColor: (color: 'yellow' | 'green' | 'blue' | 'pink') => void;
  showKeyboardShortcuts: () => void;
  toggleQuickQuiz: () => void;
  enterFocusMode: () => void;
  exitFocusMode: () => void;
  showControlPanel: boolean;
  setShowControlPanel: (show: boolean) => void;
  readingProgress: number;
  extraControls?: React.ReactNode; // New property for additional controls
}

export interface MainContentProps {
  summary: string;
  viewMode: ViewMode;
  fontSize: number;
  textDensity: TextDensity;
  highlightColor: 'yellow' | 'green' | 'blue' | 'pink';
  handleTextHighlight: () => void;
  contentRef: React.RefObject<HTMLDivElement>;
  mainScrollRef: React.RefObject<HTMLDivElement>;
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  readingProgress: number;
  isFullscreen: boolean;
  showScrollToTop: boolean;
  scrollToTop: () => void;
  activeSection: string;
  // Added search-related props
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: number;
  currentSearchIndex: number;
  performSearch: () => void;
  navigateSearchResults: (direction: 'next' | 'prev') => void;
}

export interface TableOfContentsProps {
  tableOfContents: TableOfContentsItem[];
  activeSection: string;
  scrollToSection: (sectionId: string) => void;
  bookmarks: Bookmark[];
  setShowLeftSidebar: (show: boolean) => void;
}

export interface InfoSidebarProps {
  keyInformation: SidebarItem[];
  bookmarks: Bookmark[];
  userNotes: UserNote[];
  highlights: Highlight[];
  rightSidebarTab: SidebarTab;
  setRightSidebarTab: (tab: SidebarTab) => void;
  scrollToSection: (sectionId: string) => void;
  highlightKeyConceptInContent: (conceptTitle: string) => void;
  readingProgress: number;
  tableOfContents: TableOfContentsItem[];
  setViewMode: (mode: ViewMode) => void;
  setShowRightSidebar: (show: boolean) => void;
  toggleQuickQuiz: () => void;
}

// Interface for the SearchPanel component
export interface SearchPanelProps {
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

// Type for ProgressIndicator props
export interface ProgressIndicatorProps {
  percent?: number;
  size?: "small" | "large";
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