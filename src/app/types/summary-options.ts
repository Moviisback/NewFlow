export type AIProvider = 'googleAI' | 'openAI' | 'anthropic';
export type SummaryLength = 'short' | 'medium' | 'detailed';
export type FocusArea = 'general' | 'key-points' | 'research' | 'action-items';

export interface SummaryOptions {
  summaryLength: SummaryLength;
  focusArea: FocusArea;
  includeQuestions: boolean;
  simplifyLanguage: boolean;
  languageLevel: number;
  aiProvider: AIProvider;
}