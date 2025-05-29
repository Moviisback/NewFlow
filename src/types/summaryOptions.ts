// @/types/summaryOptions.ts

// Study-focused summary options for document summarization

export type StudyPurpose = 'examPrep' | 'conceptUnderstanding' | 'quickReview';

// UPDATED SubjectType to include new categories
export type SubjectType =
  | 'general'
  | 'mathScience'
  | 'engineeringComputerScience' // New
  | 'humanitiesSocialSciences'   // New (covers both humanities and social sciences)
  | 'lawMedicine'
  | 'businessFinance';          // New

export type StudyFormat = 'cornellNotes' | 'mindMap' | 'flashcardPrep' | 'definitionList' | 'standard';
export type KnowledgeLevel = 'introductory' | 'intermediate' | 'advanced';
export type DetailLevel = 'brief' | 'standard' | 'detailed' | 'comprehensive' | 'complete';

// Add percentage-based length control
export const detailLevelPercentages = {
  'brief': 0.15, // 15% of original content
  'standard': 0.25, // 25% of original content
  'detailed': 0.45, // 45% of original content
  'comprehensive': 0.60, // 60% of original content  
  'complete': 0.80 // 80% of original content
};

export interface SummaryOptions {
  studyPurpose: StudyPurpose;
  subjectType: SubjectType;
  studyFormat: StudyFormat;
  knowledgeLevel: KnowledgeLevel;
  detailLevel: DetailLevel;
  includeExamples: boolean;
  includeCitations: boolean;
  minLength?: number;
  maxLength?: number; // Optional maximum length in words (null for automatic)
  targetPercentage?: number; // Added field for percentage-based targeting
}

// Default summary options
export const defaultSummaryOptions: SummaryOptions = {
  studyPurpose: 'examPrep',
  subjectType: 'general', // Default subject type
  studyFormat: 'standard',
  knowledgeLevel: 'intermediate',
  detailLevel: 'standard', // Changed from 'comprehensive' to 'standard'
  includeExamples: true,
  includeCitations: false,
  minLength: 1500, // Changed to align with 'standard' detail level
  maxLength: undefined,
  targetPercentage: 0.25 // Default to standard (25%)
};

// Helper function to get the description for a study purpose
export function getStudyPurposeDescription(purpose: StudyPurpose): string {
  switch (purpose) {
    case 'examPrep':
      return 'Focus on testable concepts, facts, and definitions likely to appear on exams.';
    case 'conceptUnderstanding':
      return 'Emphasize relationships between ideas and broader theoretical principles.';
    case 'quickReview':
      return 'Key highlights and essential information for rapid review sessions.';
    default:
      const exhaustiveCheck: never = purpose; // Ensures all cases are handled
      return '';
  }
}

// Helper function to get the description for a subject type - UPDATED
export function getSubjectTypeDescription(subject: SubjectType): string {
  switch (subject) {
    case 'general':
      return 'Balanced approach suitable for most general academic subjects.';
    case 'mathScience':
      return 'Emphasize formulas, scientific principles, processes, and data interpretation.';
    case 'engineeringComputerScience': // New description
      return 'Focus on algorithms, system designs, code concepts, and technical standards.';
    case 'humanitiesSocialSciences': // New description (combining humanities and social sciences)
      return 'Capture theories, historical/social context, textual analysis, and interpretations.';
    case 'lawMedicine':
      return 'Highlight procedural information, critical terminology, case studies, and regulations.';
    case 'businessFinance': // New description
      return 'Explain models, financial instruments, business strategies, and market dynamics.';
    default:
      const exhaustiveCheck: never = subject; // Ensures all cases are handled
      return '';
  }
}

// Helper function to get the description for a study format
export function getStudyFormatDescription(format: StudyFormat): string {
  switch (format) {
    case 'cornellNotes':
      return 'Key concepts in margins with detailed notes - great for active recall.';
    case 'mindMap':
      return 'Organize information hierarchically showing relationships between concepts.';
    case 'flashcardPrep':
      return 'Format information as question/answer pairs for effective memorization.';
    case 'definitionList':
      return 'Highlight key terms and their definitions for concept mastery.';
    case 'standard':
      return 'Traditional paragraph format with main points clearly organized.';
    default:
      const exhaustiveCheck: never = format; // Ensures all cases are handled
      return '';
  }
}

// Helper function to get the description for a knowledge level
export function getKnowledgeLevelDescription(level: KnowledgeLevel): string {
  switch (level) {
    case 'introductory':
      return 'Assumes minimal prior knowledge, explains basic concepts clearly.';
    case 'intermediate':
      return 'Assumes foundational understanding, adds depth and complexity to concepts.';
    case 'advanced':
      return 'Focuses on nuances, advanced applications, and connects to broader theoretical frameworks.';
    default:
      const exhaustiveCheck: never = level; // Ensures all cases are handled
      return '';
  }
}

// Helper function to get the description for a detail level (UPDATED with percentages)
export function getDetailLevelDescription(level: DetailLevel): string {
  switch (level) {
    case 'brief':
      return 'Quick overview with essential information only (15% of original length)';
    case 'standard':
      return 'Standard summary with key points and context (25% of original length)';
    case 'detailed':
      return 'Thorough explanation covering most important topics (45% of original length)';
    case 'comprehensive':
      return 'In-depth coverage of all significant content (60% of original length)';
    case 'complete':
      return 'Nearly complete coverage of the original document (80% of original length)';
    default:
      const exhaustiveCheck: never = level; // Ensures all cases are handled
      return '';
  }
}

// Get percentage from detail level
export function getPercentageFromDetailLevel(level: DetailLevel): number {
  return detailLevelPercentages[level] || 0.25; // Default to standard (25%)
}

// Calculate minimum word count based on original content length and detail level
export function calculateMinLength(originalContentLength: number, detailLevel: DetailLevel): number {
  // Estimate original word count (roughly 5 characters per word)
  const estimatedOriginalWords = Math.ceil(originalContentLength / 5);
  
  // Calculate target word count based on percentage
  const targetPercentage = detailLevelPercentages[detailLevel] || 0.25;
  return Math.ceil(estimatedOriginalWords * targetPercentage);
}

// Helper function to get the minimum word count based on detail level
// Fallback for when we don't have the original content length
export function getMinLengthFromDetailLevel(level: DetailLevel): number {
  switch (level) {
    case 'brief':
      return 300;
    case 'standard':
      return 600;
    case 'detailed':
      return 1000;
    case 'comprehensive':
      return 2000;
    case 'complete':
      return 3000;
    default:
      const exhaustiveCheck: never = level; // Ensures all cases are handled
      return 600; // Fallback, though exhaustive check should prevent this
  }
}