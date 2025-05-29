// Types for the rubric evaluation system

export type CriterionScore = 1 | 2 | 3 | 4 | 5;

export interface RubricCriterion {
  name: string;
  score: CriterionScore;
  justification: string;
  suggestedImprovements?: string;
}

export interface RubricScore {
  overallScore: number;
  criteria: {
    coreContent: RubricCriterion;
    clarityCoherence: RubricCriterion;
    conceptualLinkages: RubricCriterion;
    examPrep: RubricCriterion;
    conciseness: RubricCriterion;
    accuracy: RubricCriterion;
    cognitiveEngagement: RubricCriterion;
  };
  strengths: string[];
  weaknesses: string[];
  overallFeedback: string;
}