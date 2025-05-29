'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  Question, 
  UserAnswer, 
  ContentChunk, 
  ExamSession, 
  PreparationSession,
  ChunkSession
} from '@/types/quizTypes';
import { LibraryItem } from '@/components/documents/types';

// Constants
export const CONFIDENCE_LEVELS = [
  { value: 'low', label: 'Low', color: 'bg-red-100 text-red-800 border-red-200' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { value: 'high', label: 'High', color: 'bg-green-100 text-green-800 border-green-200' }
];

// Interface for the hook return value
interface UseQuizStateReturn {
  // Content and questions
  chunks: ContentChunk[];
  currentChunk: ContentChunk | null;
  isLoadingChunks: boolean;
  questions: Question[];
  isLoadingQuestions: boolean;
  
  // Navigation state
  currentQuestionIndex: number;
  isLearning: boolean;
  isChunkComplete: boolean;
  isSessionComplete: boolean;
  isReviewMode: boolean;
  reviewQuestionIndex: number;
  remainingLearnTime: number;
  remainingQuestionTime: number;
  
  // User interaction state
  selectedAnswer: string | null;
  userConfidence: string | null;
  showFeedback: boolean;
  hintRequested: boolean;
  markedForReview: Set<number>;
  answeredQuestions: Set<number>;
  
  // Results
  chunkScore: number;
  sessionScore: number;
  answers: UserAnswer[];
  scoreByTopic: {[key: string]: {correct: number, total: number}};
  weakAreas: {topic: string, correctRate: number}[];
  
  // Sessions
  session: PreparationSession | ExamSession;
  
  // Actions
  divideIntoChunks: () => ContentChunk[];
  generateQuestions: () => Promise<void>;
  handleReadyClick: () => void;
  handleTimeAdjustment: (newSeconds: number) => void;
  handleAnswerSelect: (answer: string) => void;
  handleConfidenceSelect: (level: string) => void;
  handleCheckAnswer: () => void;
  handleNextQuestion: () => void;
  handleHintRequest: () => void;
  handleNextChunk: () => void;
  handleReviewChunk: () => void;
  handleReviewNavigation: (direction: 'prev' | 'next') => void;
  handleExitReview: () => void;
  completeChunk: () => void;
  completeSession: () => void;
  completeExam: () => void;
  toggleMarkForReview: () => void;
  navigateToQuestion: (index: number) => void;
  getUnansweredCount: () => number;
}

// The hook
export const useQuizState = (
  document: LibraryItem,
  mode: 'preparation' | 'exam',
  onComplete: (session: PreparationSession | ExamSession) => void,
  initialProgress?: any
): UseQuizStateReturn => {
  const { toast } = useToast();
  
  // State for content chunks
  const [chunks, setChunks] = useState<ContentChunk[]>([]);
  const [currentChunk, setCurrentChunk] = useState<ContentChunk | null>(null);
  const [isLoadingChunks, setIsLoadingChunks] = useState<boolean>(false);
  
  // State for questions
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState<boolean>(false);
  
  // State for navigation
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [isLearning, setIsLearning] = useState<boolean>(mode === 'preparation' ? true : false);
  const [isChunkComplete, setIsChunkComplete] = useState<boolean>(false);
  const [isSessionComplete, setIsSessionComplete] = useState<boolean>(false);
  const [isReviewMode, setIsReviewMode] = useState<boolean>(false);
  const [reviewQuestionIndex, setReviewQuestionIndex] = useState<number>(0);
  
  // State for timers
  const [learnTimeSeconds, setLearnTimeSeconds] = useState<number>(180); // Default 3 minutes
  const [remainingLearnTime, setRemainingLearnTime] = useState<number>(180);
  const [questionTimer, setQuestionTimer] = useState<number>(60); // Default 60 seconds per question
  const [remainingQuestionTime, setRemainingQuestionTime] = useState<number>(60);
  const [examTimeLimit, setExamTimeLimit] = useState<number>(20 * 60); // Default 20 minutes
  const [remainingExamTime, setRemainingExamTime] = useState<number>(20 * 60);
  
  // State for user interaction
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [userConfidence, setUserConfidence] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState<boolean>(false);
  const [hintRequested, setHintRequested] = useState<boolean>(false);
  const [markedForReview, setMarkedForReview] = useState<Set<number>>(new Set());
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  
  // State for results
  const [chunkScore, setChunkScore] = useState<number>(0);
  const [sessionScore, setSessionScore] = useState<number>(0);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [scoreByTopic, setScoreByTopic] = useState<{[key: string]: {correct: number, total: number}}>({});
  const [weakAreas, setWeakAreas] = useState<{topic: string, correctRate: number}[]>([]);
  
  // State for sessions
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number>(0);
  const [examSettings, setExamSettings] = useState({
    questionCount: 10,
    timeLimit: 20,
    questionTypes: ['multiple_choice', 'true_false', 'fill_in_blank', 'short_answer'],
    difficultyLevel: 50,
    blindMode: false
  });
  
  // Initialize session state
  const [session, setSession] = useState<PreparationSession | ExamSession>(
    mode === 'preparation' 
      ? {
          id: `prep_${Date.now()}`,
          documentId: document.id,
          documentTitle: document.title,
          startTime: new Date(),
          status: 'in-progress',
          mode: 'preparation',
          currentChunkIndex: 0,
          totalChunks: 0,
          chunkSessions: []
        }
      : {
          id: `exam_${Date.now()}`,
          documentId: document.id,
          documentTitle: document.title,
          startTime: new Date(),
          status: 'in-progress',
          mode: 'exam',
          questions: [],
          answers: [],
          timeLimit: 20,
          examSettings
        }
  );
  
  // Divide document content into chunks
  const divideIntoChunks = useCallback((): ContentChunk[] => {
    if (!document.content) {
      toast({
        title: "Error",
        description: "Document content is missing. Please try again with a different document.",
        variant: "destructive",
      });
      return [];
    }
    
    // Simple chunk division by paragraphs
    const paragraphs = document.content.split(/\n\n+/).filter(p => p.trim().length > 0);
    
    // Group paragraphs into meaningful chunks
    let chunks: ContentChunk[] = [];
    let currentChunkContent = '';
    let currentTopics: string[] = [];
    
    // Simplified topic extraction
    const extractTopics = (text: string): string[] => {
      const keywords = text.match(/\b[A-Z][a-z]{2,}\b/g) || [];
      return [...new Set(keywords)].slice(0, 3);
    };
    
    paragraphs.forEach((paragraph, index) => {
      const paragraphWordCount = paragraph.split(/\s+/).filter(Boolean).length;
      
      // If adding this paragraph would make the chunk too large, start a new chunk
      if (currentChunkContent && 
          (currentChunkContent.split(/\s+/).filter(Boolean).length + paragraphWordCount > 300 || 
           index % 3 === 0)) {
        chunks.push({
          content: currentChunkContent.trim(),
          topics: [...new Set(currentTopics)],
          index: chunks.length
        });
        currentChunkContent = '';
        currentTopics = [];
      }
      
      currentChunkContent += paragraph + '\n\n';
      currentTopics = [...currentTopics, ...extractTopics(paragraph)];
    });
    
    // Add the last chunk if there's content
    if (currentChunkContent.trim()) {
      chunks.push({
        content: currentChunkContent.trim(),
        topics: [...new Set(currentTopics)],
        index: chunks.length
      });
    }
    
    return chunks;
  }, [document.content, toast]);
  
  // Calculate suggested learning time based on chunk length
  const calculateSuggestedLearnTime = useCallback((content: string): number => {
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    const baseMinutes = Math.round(wordCount / 200);
    const clampedMinutes = Math.min(Math.max(baseMinutes, 2), 10);
    return clampedMinutes * 60; // Convert to seconds
  }, []);
  
  // Generate questions
  const generateQuestions = useCallback(async () => {
    setIsLoadingQuestions(true);
    
    try {
      if (mode === 'preparation') {
        // For preparation mode, generate questions for the current chunk
        if (!currentChunk) return;
        
        // Mock questions for demonstration
        const mockQuestions = [];
        const questionTypes = ['multiple_choice', 'true_false', 'fill_in_blank'];
        
        for (let i = 0; i < 3; i++) {
          const type = questionTypes[i % questionTypes.length];
          const topic = currentChunk.topics[i % currentChunk.topics.length] || 'General';
          
          const question: Question = {
            id: `q_${Date.now()}_${i}`,
            question: `Question ${i + 1} about ${topic} from the current section?`,
            type: type as any,
            difficulty: 'moderate',
            correctAnswer: type === 'true_false' ? (Math.random() > 0.5 ? 'True' : 'False') : `Answer for question ${i + 1}`,
            explanation: `This is the explanation for question ${i + 1} about ${topic}.`,
            topic,
            sourceChunk: currentChunk.content.substring(0, 100) + '...'
          };
          
          if (type === 'multiple_choice') {
            question.options = [
              question.correctAnswer,
              `Wrong answer 1 for question ${i + 1}`,
              `Wrong answer 2 for question ${i + 1}`,
              `Wrong answer 3 for question ${i + 1}`
            ];
            
            // Shuffle options
            for (let j = question.options.length - 1; j > 0; j--) {
              const k = Math.floor(Math.random() * (j + 1));
              [question.options[j], question.options[k]] = [question.options[k], question.options[j]];
            }
          }
          
          mockQuestions.push(question);
        }
        
        setQuestions(mockQuestions);
      } else {
        // For exam mode, generate questions for the entire document
        // Mock questions for demonstration
        const mockQuestions = [];
        const questionTypes = ['multiple_choice', 'true_false', 'fill_in_blank', 'short_answer'];
        
        for (let i = 0; i < examSettings.questionCount; i++) {
          const type = questionTypes[i % questionTypes.length];
          const chunk = chunks[i % chunks.length];
          const topic = chunk?.topics[0] || 'General';
          
          const question: Question = {
            id: `eq_${Date.now()}_${i}`,
            question: `Exam question ${i + 1} about ${topic}?`,
            type: type as any,
            difficulty: 'moderate',
            correctAnswer: type === 'true_false' ? (Math.random() > 0.5 ? 'True' : 'False') : `Answer for question ${i + 1}`,
            explanation: `This is the explanation for question ${i + 1} about ${topic}.`,
            topic,
            chunkIndex: chunk?.index
          };
          
          if (type === 'multiple_choice') {
            question.options = [
              question.correctAnswer,
              `Wrong answer 1 for question ${i + 1}`,
              `Wrong answer 2 for question ${i + 1}`,
              `Wrong answer 3 for question ${i + 1}`
            ];
            
            // Shuffle options
            for (let j = question.options.length - 1; j > 0; j--) {
              const k = Math.floor(Math.random() * (j + 1));
              [question.options[j], question.options[k]] = [question.options[k], question.options[j]];
            }
          }
          
          mockQuestions.push(question);
        }
        
        setQuestions(mockQuestions);
        
        // Update session with questions
        setSession(prev => ({
          ...prev,
          questions: mockQuestions
        }));
      }
    } catch (error) {
      console.error(`Error generating ${mode} questions:`, error);
      toast({
        title: "Error",
        description: `Failed to generate questions. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsLoadingQuestions(false);
    }
  }, [mode, currentChunk, chunks, examSettings, toast]);
  
  // Handle ready button (user wants to start quiz before timer finishes)
  const handleReadyClick = () => {
    setIsLearning(false);
  };
  
  // Handle learning time adjustment
  const handleTimeAdjustment = (newSeconds: number) => {
    setLearnTimeSeconds(newSeconds);
    setRemainingLearnTime(newSeconds);
  };
  
  // Handle answer selection
  const handleAnswerSelect = (answer: string) => {
    if (showFeedback) return; // Can't change answer after feedback is shown
    setSelectedAnswer(answer);
    
    // Auto-save answer in exam mode if not in blind mode
    if (mode === 'exam' && !examSettings.blindMode) {
      // Create user answer object
      const currentQuestion = questions[currentQuestionIndex];
      const isCorrect = answer === currentQuestion.correctAnswer;
      
      const userAnswer: UserAnswer = {
        questionId: currentQuestion.id,
        userAnswer: answer,
        isCorrect,
        timeSpent: 0 // Not tracking per-question time
      };
      
      // Update session answers
      if (mode === 'exam') {
        const examSession = session as ExamSession;
        const existingAnswerIndex = examSession.answers.findIndex(a => a.questionId === currentQuestion.id);
        
        if (existingAnswerIndex >= 0) {
          const updatedAnswers = [...examSession.answers];
          updatedAnswers[existingAnswerIndex] = userAnswer;
          setSession({
            ...examSession,
            answers: updatedAnswers
          });
        } else {
          setSession({
            ...examSession,
            answers: [...examSession.answers, userAnswer]
          });
        }
        
        // Mark as answered
        setAnsweredQuestions(prev => new Set(prev).add(currentQuestionIndex));
      }
    }
  };
  
  // Handle confidence selection
  const handleConfidenceSelect = (level: string) => {
    if (showFeedback) return; // Can't change confidence after feedback is shown
    setUserConfidence(level);
  };
  
  // Handle check answer button
  const handleCheckAnswer = () => {
    if (!selectedAnswer) return;
    
    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    
    // Create user answer object
    const userAnswer: UserAnswer = {
      questionId: currentQuestion.id,
      userAnswer: selectedAnswer,
      isCorrect,
      timeSpent: questionTimer - remainingQuestionTime,
      confidence: userConfidence as any,
    };
    
    // Add to answers list
    setAnswers(prev => [...prev, userAnswer]);
    
    // Update session answers for exam mode
    if (mode === 'exam' && examSettings.blindMode) {
      const examSession = session as ExamSession;
      const existingAnswerIndex = examSession.answers.findIndex(a => a.questionId === currentQuestion.id);
      
      if (existingAnswerIndex >= 0) {
        const updatedAnswers = [...examSession.answers];
        updatedAnswers[existingAnswerIndex] = userAnswer;
        setSession({
          ...examSession,
          answers: updatedAnswers
        });
      } else {
        setSession({
          ...examSession,
          answers: [...examSession.answers, userAnswer]
        });
      }
      
      // Mark as answered
      setAnsweredQuestions(prev => new Set(prev).add(currentQuestionIndex));
    }
    
    // Show feedback
    setShowFeedback(true);
  };
  
  // Handle next question button
  const handleNextQuestion = () => {
    const nextIndex = currentQuestionIndex + 1;
    
    if (nextIndex < questions.length) {
      // Move to next question
      setCurrentQuestionIndex(nextIndex);
      setSelectedAnswer(null);
      setUserConfidence(null);
      setShowFeedback(false);
      setHintRequested(false);
      setRemainingQuestionTime(questionTimer);
    } else {
      // Complete chunk or exam
      if (mode === 'preparation') {
        completeChunk();
      } else {
        completeExam();
      }
    }
  };
  
  // Handle hint request
  const handleHintRequest = () => {
    setHintRequested(true);
    
    // Add a small penalty to the question timer
    setRemainingQuestionTime(time => Math.max(0, time - 10));
    
    toast({
      title: "Hint",
      description: "Think about the key concepts discussed in this section and how they relate to the question.",
    });
  };
  
  // Handle navigation in review mode
  const handleReviewNavigation = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setReviewQuestionIndex(prev => Math.max(0, prev - 1));
    } else {
      setReviewQuestionIndex(prev => Math.min(questions.length - 1, prev + 1));
    }
  };
  
  // Exit review mode
  const handleExitReview = () => {
    setIsReviewMode(false);
    setReviewQuestionIndex(0);
  };
  
  // Start review mode for chunk
  const handleReviewChunk = () => {
    setIsReviewMode(true);
    setReviewQuestionIndex(0);
  };
  
  // Complete the current chunk (preparation mode)
  const completeChunk = () => {
    // Calculate score
    const correctAnswers = answers.filter(a => a.isCorrect).length;
    const score = Math.round((correctAnswers / answers.length) * 100);
    
    if (mode === 'preparation') {
      // Update session with chunk data
      const prepSession = session as PreparationSession;
      const chunkSession: ChunkSession = {
        chunkIndex: currentChunkIndex,
        questions,
        answers,
        learnTimeSeconds,
        startTime: new Date(Date.now() - (learnTimeSeconds * 1000)), // Approximate
        endTime: new Date(),
        score,
        masteredQuestions: answers
          .filter(a => a.isCorrect)
          .map(a => a.questionId)
      };
      
      setSession({
        ...prepSession,
        chunkSessions: [...prepSession.chunkSessions, chunkSession]
      });
      
      // Set chunk complete state
      setChunkScore(score);
      setIsChunkComplete(true);
    }
  };
  
  // Move to next chunk (preparation mode)
  const handleNextChunk = () => {
    const nextChunkIndex = currentChunkIndex + 1;
    
    if (nextChunkIndex < chunks.length) {
      // Move to next chunk
      setCurrentChunkIndex(nextChunkIndex);
      
      // Update session current chunk index
      if (mode === 'preparation') {
        setSession(prev => ({
          ...prev as PreparationSession,
          currentChunkIndex: nextChunkIndex
        }));
      }
      
      // Reset states
      setCurrentChunk(chunks[nextChunkIndex]);
      setQuestions([]);
      setCurrentQuestionIndex(0);
      setAnswers([]);
      setSelectedAnswer(null);
      setUserConfidence(null);
      setShowFeedback(false);
      setHintRequested(false);
      setIsChunkComplete(false);
      
      // Calculate suggested learning time for the next chunk
      const nextChunk = chunks[nextChunkIndex];
      const suggestedTime = calculateSuggestedLearnTime(nextChunk.content);
      setLearnTimeSeconds(suggestedTime);
      setRemainingLearnTime(suggestedTime);
      
      // Start learning mode again
      setIsLearning(true);
    } else {
      // Complete session
      completeSession();
    }
  };
  
  // Complete the exam (exam mode)
  const completeExam = () => {
    // Calculate score
    const examSession = session as ExamSession;
    const totalAnswered = examSession.answers.length;
    const correctAnswers = examSession.answers.filter(a => a.isCorrect).length;
    const score = totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0;
    
    // Calculate score by topic
    const topicScores: {[key: string]: {correct: number, total: number}} = {};
    
    questions.forEach((question, index) => {
      const answer = examSession.answers.find(a => a.questionId === question.id);
      const topic = question.topic || 'General';
      
      if (!topicScores[topic]) {
        topicScores[topic] = { correct: 0, total: 0 };
      }
      
      if (answer) {
        topicScores[topic].total += 1;
        if (answer.isCorrect) {
          topicScores[topic].correct += 1;
        }
      }
    });
    
    // Identify weak areas (topics with < 70% correct answers)
    const weakTopics = Object.entries(topicScores)
      .filter(([_, stats]) => stats.total > 0 && (stats.correct / stats.total) < 0.7)
      .map(([topic, stats]) => ({
        topic,
        correctRate: stats.correct / stats.total
      }))
      .sort((a, b) => a.correctRate - b.correctRate);
    
    // Update final session data
    const completedSession: ExamSession = {
      ...examSession,
      endTime: new Date(),
      status: 'completed',
      score: score
    };
    
    // Update state
    setSession(completedSession);
    setExamScore(score);
    setScoreByTopic(topicScores);
    setWeakAreas(weakTopics);
    setIsSessionComplete(true);
    
    // Call parent completion handler
    onComplete(completedSession);
  };
  
  // Complete the session (preparation mode)
  const completeSession = () => {
    if (mode === 'preparation') {
      // Calculate overall score
      const prepSession = session as PreparationSession;
      const allAnswers = prepSession.chunkSessions.flatMap(chunk => chunk.answers);
      const correctAnswers = allAnswers.filter(a => a.isCorrect).length;
      const overallScore = Math.round((correctAnswers / allAnswers.length) * 100);
      
      // Update session with completion data
      const completedSession: PreparationSession = {
        ...prepSession,
        endTime: new Date(),
        status: 'completed',
        score: overallScore
      };
      
      setSession(completedSession);
      setSessionScore(overallScore);
      setIsSessionComplete(true);
      
      // Call parent completion handler
      onComplete(completedSession);
    }
  };
  
  // Toggle marking question for review (exam mode)
  const toggleMarkForReview = () => {
    setMarkedForReview(prev => {
      const newSet = new Set(prev);
      if (newSet.has(currentQuestionIndex)) {
        newSet.delete(currentQuestionIndex);
      } else {
        newSet.add(currentQuestionIndex);
      }
      return newSet;
    });
  };
  
  // Navigate to a specific question (exam mode)
  const navigateToQuestion = (index: number) => {
    // Save current answer if one is selected and we're not in blind mode
    if (selectedAnswer && mode === 'exam' && !examSettings.blindMode) {
      const currentQuestion = questions[currentQuestionIndex];
      const userAnswer: UserAnswer = {
        questionId: currentQuestion.id,
        userAnswer: selectedAnswer,
        isCorrect: selectedAnswer === currentQuestion.correctAnswer,
        timeSpent: 0
      };
      
      const examSession = session as ExamSession;
      const existingAnswerIndex = examSession.answers.findIndex(a => a.questionId === currentQuestion.id);
      
      if (existingAnswerIndex >= 0) {
        const updatedAnswers = [...examSession.answers];
        updatedAnswers[existingAnswerIndex] = userAnswer;
        setSession({
          ...examSession,
          answers: updatedAnswers
        });
      } else {
        setSession({
          ...examSession,
          answers: [...examSession.answers, userAnswer]
        });
      }
      
      setAnsweredQuestions(prev => new Set(prev).add(currentQuestionIndex));
    }
    
    setCurrentQuestionIndex(index);
    
    // Set selected answer to the stored answer for this question
    if (mode === 'exam') {
      const examSession = session as ExamSession;
      const storedAnswer = examSession.answers.find(a => a.questionId === questions[index].id);
      setSelectedAnswer(storedAnswer?.userAnswer || null);
    } else {
      setSelectedAnswer(null);
    }
    
    setShowFeedback(false);
  };
  
  // Calculate unanswered questions count (exam mode)
  const getUnansweredCount = (): number => {
    if (mode === 'exam') {
      const examSession = session as ExamSession;
      return questions.length - examSession.answers.length;
    }
    return 0;
  };
  
  return {
    // Content and questions
    chunks,
    currentChunk,
    isLoadingChunks,
    questions,
    isLoadingQuestions,
    
    // Navigation state
    currentQuestionIndex,
    isLearning,
    isChunkComplete,
    isSessionComplete,
    isReviewMode,
    reviewQuestionIndex,
    remainingLearnTime,
    remainingQuestionTime,
    
    // User interaction state
    selectedAnswer,
    userConfidence,
    showFeedback,
    hintRequested,
    markedForReview,
    answeredQuestions,
    
    // Results
    chunkScore,
    sessionScore,
    answers,
    scoreByTopic,
    weakAreas,
    
    // Sessions
    session,
    
    // Actions
    divideIntoChunks,
    generateQuestions,
    handleReadyClick,
    handleTimeAdjustment,
    handleAnswerSelect,
    handleConfidenceSelect,
    handleCheckAnswer,
    handleNextQuestion,
    handleHintRequest,
    handleNextChunk,
    handleReviewChunk,
    handleReviewNavigation,
    handleExitReview,
    completeChunk,
    completeSession,
    completeExam,
    toggleMarkForReview,
    navigateToQuestion,
    getUnansweredCount
  };
};