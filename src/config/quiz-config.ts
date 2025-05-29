// src/config/quiz-config.ts
export interface QuizConfig {
    defaultTimers: {
      learningTime: number; // seconds
      questionTime: number; // seconds
    };
    questionCounts: {
      min: number;
      max: number;
      default: number;
    };
    difficultyLevels: {
      [key: string]: {
        label: string;
        value: number;
        examLevel: 'classroom' | 'standardized' | 'professional' | 'graduate';
      };
    };
    questionTypes: {
      [key: string]: {
        label: string;
        examLevels: string[];
        cognitiveLoad: 'low' | 'medium' | 'high';
      };
    };
    educationalThresholds: {
      minEducationalValue: number;
      minConceptualCompleteness: number;
      minWordCount: number;
    };
    bloomTaxonomy: {
      [key: string]: {
        label: string;
        description: string;
        examSuitability: number; // 1-10 scale
      };
    };
  }
  
  export const defaultQuizConfig: QuizConfig = {
    defaultTimers: {
      learningTime: 180, // 3 minutes
      questionTime: 60,  // 1 minute
    },
    questionCounts: {
      min: 2,
      max: 8,
      default: 5,
    },
    difficultyLevels: {
      basic: {
        label: 'Basic',
        value: 25,
        examLevel: 'classroom',
      },
      intermediate: {
        label: 'Intermediate',
        value: 50,
        examLevel: 'standardized',
      },
      advanced: {
        label: 'Advanced',
        value: 75,
        examLevel: 'graduate',
      },
    },
    questionTypes: {
      multiple_choice: {
        label: 'Multiple Choice',
        examLevels: ['classroom', 'standardized', 'professional', 'graduate'],
        cognitiveLoad: 'medium',
      },
      true_false: {
        label: 'True/False',
        examLevels: ['classroom', 'standardized'],
        cognitiveLoad: 'low',
      },
      fill_in_blank: {
        label: 'Fill in the Blank',
        examLevels: ['classroom', 'standardized', 'professional'],
        cognitiveLoad: 'medium',
      },
      short_answer: {
        label: 'Short Answer',
        examLevels: ['standardized', 'professional', 'graduate'],
        cognitiveLoad: 'high',
      },
      essay: {
        label: 'Essay',
        examLevels: ['professional', 'graduate'],
        cognitiveLoad: 'high',
      },
      application: {
        label: 'Application',
        examLevels: ['professional', 'graduate'],
        cognitiveLoad: 'high',
      },
    },
    educationalThresholds: {
      minEducationalValue: 4,
      minConceptualCompleteness: 3,
      minWordCount: 100,
    },
    bloomTaxonomy: {
      remember: {
        label: 'Remember',
        description: 'Recall facts and basic concepts',
        examSuitability: 4,
      },
      understand: {
        label: 'Understand',
        description: 'Explain ideas or concepts',
        examSuitability: 7,
      },
      apply: {
        label: 'Apply',
        description: 'Use information in new situations',
        examSuitability: 8,
      },
      analyze: {
        label: 'Analyze',
        description: 'Draw connections among ideas',
        examSuitability: 9,
      },
      evaluate: {
        label: 'Evaluate',
        description: 'Justify a stand or decision',
        examSuitability: 9,
      },
      create: {
        label: 'Create',
        description: 'Produce new or original work',
        examSuitability: 10,
      },
    },
  };
  
  // Helper functions for using the config
  export const getExamLevelForDifficulty = (difficultyLevel: string): string => {
    return defaultQuizConfig.difficultyLevels[difficultyLevel]?.examLevel || 'standardized';
  };
  
  export const getQuestionTypesForExamLevel = (examLevel: string): string[] => {
    return Object.entries(defaultQuizConfig.questionTypes)
      .filter(([_, config]) => config.examLevels.includes(examLevel))
      .map(([type, _]) => type);
  };
  
  export const validateChunkForQuestions = (chunk: {
    educationalValue: number;
    wordCount: number;
    semanticBoundaries: { conceptualCompleteness: number };
  }): { valid: boolean; issues: string[] } => {
    const issues: string[] = [];
    
    if (chunk.educationalValue < defaultQuizConfig.educationalThresholds.minEducationalValue) {
      issues.push(`Educational value too low (${chunk.educationalValue}/${defaultQuizConfig.educationalThresholds.minEducationalValue})`);
    }
    
    if (chunk.wordCount < defaultQuizConfig.educationalThresholds.minWordCount) {
      issues.push(`Content too short (${chunk.wordCount}/${defaultQuizConfig.educationalThresholds.minWordCount} words)`);
    }
    
    if (chunk.semanticBoundaries.conceptualCompleteness < defaultQuizConfig.educationalThresholds.minConceptualCompleteness) {
      issues.push(`Conceptual completeness too low (${chunk.semanticBoundaries.conceptualCompleteness}/${defaultQuizConfig.educationalThresholds.minConceptualCompleteness})`);
    }
    
    return {
      valid: issues.length === 0,
      issues,
    };
  };