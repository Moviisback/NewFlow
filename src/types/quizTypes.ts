// Question Types
export interface Question {
    id: string;
    question: string;
    options?: string[];
    correctAnswer: string;
    type: 'multiple_choice' | 'true_false' | 'fill_in_blank' | 'short_answer';
    difficulty: string;
    explanation?: string;
    sourcePage?: number;
    sourceChunk?: string;
    topic?: string;
    chunkIndex?: number;
  }
  
  // User Answer
  export interface UserAnswer {
    questionId: string;
    userAnswer: string;
    isCorrect: boolean;
    timeSpent: number;
    confidence?: 'low' | 'medium' | 'high';
    reviewLater?: boolean;
  }
  
  // Quiz Session Types
  export interface BaseQuizSession {
    id: string;
    documentId: number;
    documentTitle: string;
    startTime: Date;
    endTime?: Date;
    score?: number;
    status: 'in-progress' | 'completed' | 'abandoned';
  }
  
  export interface PreparationSession extends BaseQuizSession {
    mode: 'preparation';
    currentChunkIndex: number;
    totalChunks: number;
    chunkSessions: ChunkSession[];
  }
  
  export interface ChunkSession {
    chunkIndex: number;
    questions: Question[];
    answers: UserAnswer[];
    learnTimeSeconds: number;
    startTime: Date;
    endTime?: Date;
    score?: number;
    masteredQuestions: string[]; // IDs of mastered questions
  }
  
  export interface ExamSession extends BaseQuizSession {
    mode: 'exam';
    questions: Question[];
    answers: UserAnswer[];
    timeLimit: number;
    examSettings: ExamSettings;
  }
  
  export interface ExamSettings {
    questionCount: number;
    timeLimit: number; // in minutes
    selectedSections?: number[]; // chunk indices
    focusOnWeakAreas: boolean;
    questionTypes: string[];
    difficultyLevel: number;
    blindMode: boolean; // hide feedback until end
  }
  
  // Learning Progress
  export interface LearningProgress {
    documentId: number;
    masteredChunks: number[];
    weakAreas: {
      chunkIndex: number;
      topic: string;
      correctRate: number;
    }[];
    masteredQuestions: string[];
    reviewQuestions: {
      questionId: string;
      nextReviewDate: Date;
      reviewCount: number;
      lastCorrect: boolean;
    }[];
  }
  
  // Content Chunk
  export interface ContentChunk {
    content: string;
    topics: string[];
    index: number;
  }