'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { Target, BookOpen, Info, Timer, Brain, Check, X, AlertCircle, Clock, ChevronRight, ChevronLeft, Lightbulb, CheckSquare, Star, RotateCcw, RefreshCw } from 'lucide-react';

// Import components
import QuestionDisplay from '@/components/quiz/QuestionDisplay';

// Import types
import { Question, UserAnswer, PreparationSession, ChunkSession, LearningProgress } from '@/types/quizTypes';
import { LibraryItem } from '@/components/documents/types';

// Import utility functions
import { getQuestionsForReview, scheduleForReview, updateWeakAreas, analyzePerformance } from '@/utils/spacedRepetition';

// Import enhanced chunker
import { SmartContentChunker } from '@/utils/smart-content-chunker';

// Enhanced ContentChunk interface (matches SmartContentChunker output)
interface ContentChunk {
  content: string;
  topics: string[];
  index: number;
  title: string;
  keyConcepts: string[];
  learningObjectives: string[];
  educationalValue: number;
  difficultyLevel: 'basic' | 'intermediate' | 'advanced';
  wordCount: number;
  readingTime: number;
  semanticBoundaries: {
    startsWithHeader: boolean;
    endsWithConclusion: boolean;
    conceptualCompleteness: number;
  };
}

// Constants
const CONFIDENCE_LEVELS = [
  { value: 'low', label: 'Low', color: 'bg-red-100 text-red-800 border-red-200' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { value: 'high', label: 'High', color: 'bg-green-100 text-green-800 border-green-200' }
];

interface PreparationModeProps {
  document: LibraryItem;
  onComplete: (session: PreparationSession) => void;
  onExit: () => void;
  initialSession?: PreparationSession;
  initialProgress?: LearningProgress;
}

const PreparationMode: React.FC<PreparationModeProps> = ({
  document,
  onComplete,
  onExit,
  initialSession,
  initialProgress
}) => {
  const { toast } = useToast();
  
  // References for timers and enhanced chunker
  const learnTimerRef = useRef<NodeJS.Timeout | null>(null);
  const questionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chunkerRef = useRef<SmartContentChunker>(new SmartContentChunker());
  
  // State to manage session
  const [session, setSession] = useState<PreparationSession>(initialSession || {
    id: `prep_${Date.now()}`,
    documentId: document.id,
    documentTitle: document.title,
    startTime: new Date(),
    status: 'in-progress',
    mode: 'preparation',
    currentChunkIndex: 0,
    totalChunks: 0,
    chunkSessions: []
  });
  
  // State to manage learning progress
  const [progress, setProgress] = useState<LearningProgress>(initialProgress || {
    documentId: document.id,
    masteredChunks: [],
    weakAreas: [],
    masteredQuestions: [],
    reviewQuestions: []
  });
  
  // State for current chunk
  const [chunks, setChunks] = useState<ContentChunk[]>([]);
  const [currentChunk, setCurrentChunk] = useState<ContentChunk | null>(null);
  const [isLoadingChunks, setIsLoadingChunks] = useState<boolean>(false);
  
  // State for learning timer
  const [learnTimeSeconds, setLearnTimeSeconds] = useState<number>(180);
  const [remainingLearnTime, setRemainingLearnTime] = useState<number>(180);
  const [isLearning, setIsLearning] = useState<boolean>(true);
  
  // Enhanced quiz state with better management
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [userConfidence, setUserConfidence] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState<boolean>(false);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState<boolean>(false);
  const [hintRequested, setHintRequested] = useState<boolean>(false);
  const [questionTimer, setQuestionTimer] = useState<number>(60);
  const [remainingQuestionTime, setRemainingQuestionTime] = useState<number>(60);
  
  // Enhanced states for learning objectives and key concepts
  const [learningObjectives, setLearningObjectives] = useState<string[]>([]);
  const [keyConcepts, setKeyConcepts] = useState<string[]>([]);
  const [showLearningObjectives, setShowLearningObjectives] = useState<boolean>(true);
  const [showTopics, setShowTopics] = useState<boolean>(true);
  
  // Enhanced error handling and quality tracking states
  const [questionGenerationError, setQuestionGenerationError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [contentMetadata, setContentMetadata] = useState<any>(null);
  const [questionQuality, setQuestionQuality] = useState<'high' | 'standard' | 'low' | null>(null);
  
  // State for chunk completion
  const [isChunkComplete, setIsChunkComplete] = useState<boolean>(false);
  const [chunkScore, setChunkScore] = useState<number>(0);
  
  // State for session completion
  const [isSessionComplete, setIsSessionComplete] = useState<boolean>(false);
  const [sessionScore, setSessionScore] = useState<number>(0);
  
  // State for chunk review
  const [isReviewMode, setIsReviewMode] = useState<boolean>(false);
  const [reviewQuestionIndex, setReviewQuestionIndex] = useState<number>(0);

  // Enhanced learning time calculation based on chunk analysis
  const calculateSuggestedLearnTime = useCallback((chunk: ContentChunk): number => {
    let baseTime = Math.round(chunk.wordCount / 200) * 60; // Base reading time in seconds
    
    // Adjust based on difficulty level
    const difficultyMultiplier = {
      'basic': 0.8,
      'intermediate': 1.0,
      'advanced': 1.5
    }[chunk.difficultyLevel] || 1.0;
    
    // Adjust based on educational value
    const educationalMultiplier = chunk.educationalValue > 8 ? 1.3 : 
                                 chunk.educationalValue > 6 ? 1.1 : 1.0;
    
    // Adjust based on concept density
    const conceptDensity = chunk.keyConcepts.length / Math.max(1, chunk.wordCount / 100);
    const conceptMultiplier = Math.min(1.5, 1.0 + (conceptDensity * 0.2));
    
    // Adjust based on semantic completeness
    const completenessMultiplier = chunk.semanticBoundaries.conceptualCompleteness < 5 ? 1.2 : 1.0;
    
    const adjustedTime = baseTime * difficultyMultiplier * educationalMultiplier * conceptMultiplier * completenessMultiplier;
    
    // Clamp to reasonable bounds (2-12 minutes)
    return Math.min(Math.max(adjustedTime, 120), 720);
  }, []);

  // Enhanced chunking function using SmartContentChunker
  const divideIntoChunks = useCallback((): ContentChunk[] => {
    if (!document.content) {
      toast({
        title: "Error",
        description: "Document content is missing.",
        variant: "destructive",
      });
      return [];
    }
    
    const content = document.content.trim();
    console.log('📄 Starting enhanced semantic chunking...');
    
    if (content.length < 200) {
      toast({
        title: "Content Too Short",
        description: "This document may be too short for effective semantic chunking.",
        variant: "destructive",
      });
      return [];
    }
    
    try {
      // Use the smart chunker for semantic-aware chunking
      const semanticChunks = chunkerRef.current.divideIntoSemanticChunks(content);
      
      console.log(`✅ Created ${semanticChunks.length} semantic chunks`);
      semanticChunks.forEach((chunk, i) => {
        console.log(`📚 Chunk ${i + 1}: "${chunk.title}" - ${chunk.keyConcepts.length} concepts - ${chunk.educationalValue}/10 value - ${chunk.semanticBoundaries.conceptualCompleteness}/10 completeness`);
      });
      
      // Validate chunks for educational suitability
      const validChunks = semanticChunks.filter(chunk => {
        const isValid = chunk.educationalValue >= 4 && 
                       chunk.wordCount >= 100 && 
                       chunk.keyConcepts.length >= 1;
        
        if (!isValid) {
          console.log(`⚠️ Filtered out chunk "${chunk.title}": education value ${chunk.educationalValue}, words ${chunk.wordCount}, concepts ${chunk.keyConcepts.length}`);
        }
        
        return isValid;
      });
      
      if (validChunks.length === 0) {
        console.log('⚠️ No valid chunks from semantic chunker, falling back to basic chunking');
        return fallbackChunking(content);
      }
      
      if (validChunks.length < semanticChunks.length) {
        toast({
          title: "Some Content Filtered",
          description: `${semanticChunks.length - validChunks.length} sections were filtered out due to low educational value.`,
        });
      }
      
      return validChunks;
      
    } catch (error) {
      console.error('Enhanced chunking failed:', error);
      toast({
        title: "Chunking Error",
        description: "Failed to process document with enhanced chunking. Using fallback method.",
        variant: "destructive",
      });
      
      // Fallback to simpler chunking
      return fallbackChunking(content);
    }
  }, [document.content, toast]);

  // Fallback chunking method (simplified version of old logic)
  const fallbackChunking = useCallback((content: string): ContentChunk[] => {
    console.log('🔄 Using fallback chunking method...');
    
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 50);
    const chunks: ContentChunk[] = [];
    let currentChunk = '';
    let currentWordCount = 0;
    const targetWordCount = 300;
    
    paragraphs.forEach((paragraph, index) => {
      const paragraphWordCount = paragraph.split(/\s+/).filter(Boolean).length;
      
      if (currentWordCount > 0 && currentWordCount + paragraphWordCount > targetWordCount) {
        // Create chunk from accumulated content
        chunks.push(createBasicChunk(currentChunk, chunks.length));
        currentChunk = paragraph + '\n\n';
        currentWordCount = paragraphWordCount;
      } else {
        currentChunk += paragraph + '\n\n';
        currentWordCount += paragraphWordCount;
      }
    });
    
    // Add remaining content
    if (currentChunk.trim()) {
      chunks.push(createBasicChunk(currentChunk, chunks.length));
    }
    
    return chunks;
  }, []);

  // Helper function to create basic chunks for fallback
  const createBasicChunk = useCallback((content: string, index: number): ContentChunk => {
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    const topics = extractBasicTopics(content);
    const keyConcepts = extractBasicConcepts(content);
    
    return {
      content: content.trim(),
      topics,
      index,
      title: `Section ${index + 1}`,
      keyConcepts,
      learningObjectives: [`Understand key concepts in Section ${index + 1}`],
      educationalValue: 5, // Default value
      difficultyLevel: 'intermediate',
      wordCount,
      readingTime: Math.ceil(wordCount / 200),
      semanticBoundaries: {
        startsWithHeader: false,
        endsWithConclusion: false,
        conceptualCompleteness: 5
      }
    };
  }, []);

  // Helper functions for fallback chunking
  const extractBasicTopics = useCallback((content: string): string[] => {
    const keywords = content.match(/\b[A-Z][a-z]{2,}\b/g) || [];
    return [...new Set(keywords)].slice(0, 3);
  }, []);
  
  const extractBasicConcepts = useCallback((content: string): string[] => {
    const technicalTerms = content.match(/\b[A-Z][a-zA-Z]{3,}\b/g) || [];
    return [...new Set(technicalTerms)].slice(0, 5);
  }, []);

  // Enhanced chunk title generation using chunk metadata
  const getChunkTitle = useCallback(() => {
    if (!currentChunk) return "Section Content";
    
    // Use the enhanced title from smart chunker if available
    if (currentChunk.title && currentChunk.title !== `Section ${currentChunk.index + 1}`) {
      return currentChunk.title;
    }
    
    // Fallback to topic-based title
    if (currentChunk.topics?.length > 0) {
      const mainTopic = currentChunk.topics[0];
      const topicEmojis: { [key: string]: string } = {
        'introduction': '🔍',
        'history': '📜',
        'application': '⚙️',
        'future': '🔮',
        'challenge': '🧩',
        'benefit': '✅',
        'data': '📊',
        'conclusion': '📝'
      };
      
      const emoji = Object.keys(topicEmojis).find(key => 
        mainTopic.toLowerCase().includes(key)
      ) ? topicEmojis[Object.keys(topicEmojis).find(key => 
        mainTopic.toLowerCase().includes(key)
      )!] : '📚';
      
      return `${emoji} ${mainTopic}`;
    }
    
    // Final fallback
    return `📄 Section ${currentChunk.index + 1}`;
  }, [currentChunk]);

  // Load document chunks with enhanced error handling
  useEffect(() => {
    setIsLoadingChunks(true);
    try {
      const documentChunks = divideIntoChunks();
      setChunks(documentChunks);
      setSession(prev => ({
        ...prev,
        totalChunks: documentChunks.length
      }));
      
      if (documentChunks.length > 0) {
        const firstChunk = documentChunks[0];
        setCurrentChunk(firstChunk);
        
        const suggestedTime = calculateSuggestedLearnTime(firstChunk);
        setLearnTimeSeconds(suggestedTime);
        setRemainingLearnTime(suggestedTime);
        
        // Set learning objectives and concepts from enhanced chunk
        setLearningObjectives(firstChunk.learningObjectives);
        setKeyConcepts(firstChunk.keyConcepts);
        
        console.log(`📚 First chunk loaded: "${firstChunk.title}" - ${firstChunk.educationalValue}/10 educational value`);
      } else {
        toast({
          title: "No Suitable Content",
          description: "No educationally suitable content chunks could be extracted from this document.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error in enhanced chunking:', error);
      toast({
        title: "Enhanced Processing Error",
        description: "Failed to prepare document for study using enhanced methods.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingChunks(false);
    }
  }, [document, divideIntoChunks, calculateSuggestedLearnTime, toast]);

  // Learn timer management
  useEffect(() => {
    if (isLearning && remainingLearnTime > 0) {
      learnTimerRef.current = setInterval(() => {
        setRemainingLearnTime(time => {
          if (time <= 1) {
            if (learnTimerRef.current) clearInterval(learnTimerRef.current);
            setIsLearning(false);
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (learnTimerRef.current) clearInterval(learnTimerRef.current);
    };
  }, [isLearning, remainingLearnTime]);

  // Question timer management
  useEffect(() => {
    if (!isLearning && !showFeedback && !isChunkComplete && remainingQuestionTime > 0 && questions.length > 0) {
      questionTimerRef.current = setInterval(() => {
        setRemainingQuestionTime(time => {
          if (time <= 1) {
            if (questionTimerRef.current) clearInterval(questionTimerRef.current);
            handleCheckAnswer();
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    };
  }, [isLearning, showFeedback, isChunkComplete, remainingQuestionTime, questions.length]);

  // Enhanced question generation with chunking context
  const generateQuestions = useCallback(async () => {
    if (!currentChunk) return;
    
    setIsLoadingQuestions(true);
    setQuestionGenerationError(null);
    setQuestionQuality(null);
    
    try {
      console.log('🎯 Generating enhanced questions for semantic chunk:', {
        title: currentChunk.title,
        wordCount: currentChunk.wordCount,
        educationalValue: currentChunk.educationalValue,
        concepts: currentChunk.keyConcepts.length,
        completeness: currentChunk.semanticBoundaries.conceptualCompleteness,
        difficultyLevel: currentChunk.difficultyLevel
      });
      
      // Enhanced validation based on chunk analysis
      if (currentChunk.educationalValue < 4) {
        throw new Error(`Content section has insufficient educational value (${currentChunk.educationalValue}/10) for meaningful question generation`);
      }
      
      if (currentChunk.semanticBoundaries.conceptualCompleteness < 3) {
        console.warn(`⚠️ Chunk has low conceptual completeness (${currentChunk.semanticBoundaries.conceptualCompleteness}/10), questions may be limited`);
      }
      
      // Determine optimal question count based on chunk analysis
      const baseQuestionCount = Math.max(2, Math.min(6, Math.floor(currentChunk.keyConcepts.length * 0.8)));
      const adjustedCount = currentChunk.educationalValue > 7 ? baseQuestionCount + 1 : baseQuestionCount;
      
      // Determine exam level based on chunk difficulty
      const examLevel = currentChunk.difficultyLevel === 'advanced' ? 'graduate' :
                       currentChunk.difficultyLevel === 'intermediate' ? 'standardized' : 'classroom';
      
      const response = await fetch('/api/quizzes/generate-preparation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chunkContent: currentChunk.content,
          documentTitle: document.title,
          userProgress: progress,
          difficultyPreference: currentChunk.difficultyLevel,
          maxQuestions: adjustedCount,
          questionTypes: ['multiple_choice', 'true_false', 'short_answer'],
          previousAnswered: [],
          examLevel, // Pass the determined exam level
          enhancedMode: true, // Enable enhanced question generation
          chunkMetadata: {
            title: currentChunk.title,
            educationalValue: currentChunk.educationalValue,
            keyConcepts: currentChunk.keyConcepts,
            learningObjectives: currentChunk.learningObjectives,
            semanticBoundaries: currentChunk.semanticBoundaries
          }
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Enhanced API Error:', errorData);
        
        // Handle specific enhanced error cases
        if (errorData.code === 'INSUFFICIENT_EDUCATIONAL_VALUE') {
          throw new Error(`This section lacks sufficient educational content for exam-level questions (${currentChunk.educationalValue}/10 educational value)`);
        } else if (errorData.code === 'NO_EXAM_LEVEL_CONCEPTS') {
          throw new Error('Unable to identify concepts suitable for meaningful exam questions in this section');
        } else {
          throw new Error(errorData.error || `HTTP ${response.status}: Failed to generate enhanced questions`);
        }
      }
      
      const data = await response.json();
      
      if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error('No valid enhanced questions returned from API');
      }
      
      // Enhanced question validation
      const validQuestions = data.questions.filter((q: any) => {
        const isValid = q.question && 
                       q.correctAnswer && 
                       q.correctAnswer.length > 2 && 
                       !['the', 'and', 'or', 'a', 'an', 'yes', 'no'].includes(q.correctAnswer.toLowerCase()) &&
                       (q.educationalValue ? q.educationalValue >= 6 : true); // Enhanced threshold
        
        if (!isValid) {
          console.log(`❌ Question filtered: "${q.question?.substring(0, 50)}..." - Answer: "${q.correctAnswer}" - Educational value: ${q.educationalValue}`);
        }
        
        return isValid;
      });
      
      if (validQuestions.length === 0) {
        throw new Error('No educationally valid enhanced questions were generated');
      }
      
      // Update state with successful generation
      setQuestions(validQuestions);
      setLearningObjectives(data.learningObjectives || currentChunk.learningObjectives);
      setKeyConcepts(data.keyConcepts || currentChunk.keyConcepts);
      setContentMetadata(data.contentMetadata || null);
      
      // Determine quality level based on enhanced metadata
      const qualityLevel = data.contentMetadata?.questionQuality === 'exam-level' ? 'high' :
                          data.contentMetadata?.questionQuality === 'standard' ? 'standard' : 'low';
      setQuestionQuality(qualityLevel);
      
      // Reset question state
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setUserConfidence(null);
      setShowFeedback(false);
      setHintRequested(false);
      setRemainingQuestionTime(questionTimer);
      setRetryCount(0);
      
      // Enhanced success feedback
      if (qualityLevel === 'high') {
        toast({
          title: "Exam-Level Questions Generated",
          description: `Generated ${validQuestions.length} high-quality exam questions for "${currentChunk.title}".`,
        });
      } else {
        toast({
          title: "Questions Generated",
          description: `Generated ${validQuestions.length} questions for "${currentChunk.title}".`,
        });
      }
      
    } catch (error) {
      console.error('Enhanced question generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setQuestionGenerationError(errorMessage);
      
      // Enhanced error feedback
      if (errorMessage.includes('educational value') || errorMessage.includes('educational content')) {
        toast({
          title: "Content Analysis Issue",
          description: `This section (educational value: ${currentChunk?.educationalValue}/10) needs stronger educational focus for quality questions.`,
          variant: "destructive",
        });
      } else if (errorMessage.includes('concepts suitable')) {
        toast({
          title: "Concept Identification Issue",
          description: "Unable to identify testable concepts in this section. Consider sections with clearer key concepts.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Enhanced Question Generation Error",
          description: "Unable to create enhanced questions for this section. You can try again or skip ahead.",
          variant: "destructive",
        });
      }
      
    } finally {
      setIsLoadingQuestions(false);
    }
  }, [currentChunk, progress, document.title, questionTimer, toast, retryCount]);

  // Start quiz mode once learning time is up
  useEffect(() => {
    if (!isLearning && questions.length === 0 && !isLoadingQuestions && !isChunkComplete && currentChunk) {
      generateQuestions();
    }
  }, [isLearning, questions.length, isLoadingQuestions, isChunkComplete, currentChunk, generateQuestions]);

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle ready button
  const handleReadyClick = () => {
    if (learnTimerRef.current) clearInterval(learnTimerRef.current);
    setIsLearning(false);
    setRemainingLearnTime(0);
  };

  // Handle learning time adjustment
  const handleTimeAdjustment = (newSeconds: number) => {
    setLearnTimeSeconds(newSeconds);
    setRemainingLearnTime(newSeconds);
  };

  // FIXED: Enhanced answer selection with proper state management
  const handleAnswerSelect = useCallback((answer: string) => {
    if (showFeedback) return;
    
    console.log('Answer selected:', answer);
    setSelectedAnswer(answer);
  }, [showFeedback]);

  // FIXED: Enhanced confidence selection
  const handleConfidenceSelect = useCallback((level: string) => {
    if (showFeedback) return;
    
    console.log('Confidence selected:', level);
    setUserConfidence(level);
  }, [showFeedback]);

  // FIXED: Enhanced check answer functionality
  const handleCheckAnswer = useCallback(() => {
    if (!selectedAnswer || !questions[currentQuestionIndex] || showFeedback) {
      console.log('Cannot check answer:', { selectedAnswer, hasQuestion: !!questions[currentQuestionIndex], showFeedback });
      return;
    }
    
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    
    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = selectedAnswer.toLowerCase().trim() === currentQuestion.correctAnswer.toLowerCase().trim();
    
    console.log('Checking answer:', {
      selected: selectedAnswer,
      correct: currentQuestion.correctAnswer,
      isCorrect
    });
    
    const userAnswer: UserAnswer = {
      questionId: currentQuestion.id,
      userAnswer: selectedAnswer,
      isCorrect,
      timeSpent: questionTimer - remainingQuestionTime,
      confidence: userConfidence as 'low' | 'medium' | 'high' | undefined,
    };
    
    setAnswers(prev => [...prev, userAnswer]);
    setProgress(prev => scheduleForReview(currentQuestion.id, isCorrect, prev));
    setShowFeedback(true);
  }, [currentQuestionIndex, questions, selectedAnswer, showFeedback, questionTimer, remainingQuestionTime, userConfidence]);

  // Handle next question
  const handleNextQuestion = useCallback(() => {
    const nextIndex = currentQuestionIndex + 1;
    
    if (nextIndex < questions.length) {
      setCurrentQuestionIndex(nextIndex);
      setSelectedAnswer(null);
      setUserConfidence(null);
      setShowFeedback(false);
      setHintRequested(false);
      setRemainingQuestionTime(questionTimer);
    } else {
      completeChunk();
    }
  }, [currentQuestionIndex, questions.length, questionTimer]);

  // Handle hint request
  const handleHintRequest = useCallback(() => {
    if (hintRequested || showFeedback) return;
    
    setHintRequested(true);
    setRemainingQuestionTime(time => Math.max(0, time - 10));
    
    const currentQuestion = questions[currentQuestionIndex];
    let hint = "Consider the key concepts from this section.";
    
    if (currentQuestion.type === 'multiple_choice') {
      hint = "Try to eliminate obviously incorrect options first, then focus on the main concepts.";
    } else if (currentQuestion.type === 'true_false') {
      hint = "Think about whether there are any exceptions or qualifications to this statement.";
    } else if (currentQuestion.type === 'fill_in_blank') {
      const answer = currentQuestion.correctAnswer;
      hint = `The answer is ${answer.length} characters long and starts with "${answer[0]}".`;
    }
    
    toast({
      title: "💡 Hint",
      description: hint,
    });
  }, [hintRequested, showFeedback, questions, currentQuestionIndex, toast]);

  // Complete the current chunk
  const completeChunk = useCallback(() => {
    const correctAnswers = answers.filter(a => a.isCorrect).length;
    const score = answers.length > 0 ? Math.round((correctAnswers / answers.length) * 100) : 0;
    
    const chunkSession: ChunkSession = {
      chunkIndex: session.currentChunkIndex,
      questions,
      answers,
      learnTimeSeconds,
      startTime: new Date(Date.now() - (learnTimeSeconds * 1000)),
      endTime: new Date(),
      score,
      masteredQuestions: answers.filter(a => a.isCorrect).map(a => a.questionId)
    };
    
    setSession(prev => ({
      ...prev,
      chunkSessions: [...prev.chunkSessions, chunkSession]
    }));
    
    // Update progress
    if (currentChunk) {
      const topics = currentChunk.topics.length > 0 ? currentChunk.topics : ['General'];
      
      topics.forEach(topic => {
        setProgress(prev => updateWeakAreas(prev, session.currentChunkIndex, topic, correctAnswers, answers.length));
      });
    }
    
    setChunkScore(score);
    setIsChunkComplete(true);
  }, [answers, currentChunk, learnTimeSeconds, questions, session.currentChunkIndex]);

  // Move to next chunk
  const handleNextChunk = useCallback(() => {
    const nextChunkIndex = session.currentChunkIndex + 1;
    
    if (nextChunkIndex < chunks.length) {
      // Move to next chunk
      setSession(prev => ({ ...prev, currentChunkIndex: nextChunkIndex }));
      
      const nextChunk = chunks[nextChunkIndex];
      setCurrentChunk(nextChunk);
      
      // Reset all states
      setQuestions([]);
      setCurrentQuestionIndex(0);
      setAnswers([]);
      setSelectedAnswer(null);
      setUserConfidence(null);
      setShowFeedback(false);
      setHintRequested(false);
      setIsChunkComplete(false);
      setQuestionGenerationError(null);
      setRetryCount(0);
      setQuestionQuality(null);
      
      // Set learning objectives and concepts for new chunk
      setLearningObjectives(nextChunk.learningObjectives || []);
      setKeyConcepts(nextChunk.keyConcepts || []);
      
      // Calculate new learning time
      const suggestedTime = calculateSuggestedLearnTime(nextChunk);
      setLearnTimeSeconds(suggestedTime);
      setRemainingLearnTime(suggestedTime);
      
      setIsLearning(true);
    } else {
      completeSession();
    }
  }, [chunks, session.currentChunkIndex, calculateSuggestedLearnTime]);

  // Complete the entire session
  const completeSession = useCallback(() => {
    const allAnswers = session.chunkSessions.flatMap(chunk => chunk.answers);
    const correctAnswers = allAnswers.filter(a => a.isCorrect).length;
    const overallScore = allAnswers.length > 0 ? Math.round((correctAnswers / allAnswers.length) * 100) : 0;
    
    const completedSession: PreparationSession = {
      ...session,
      endTime: new Date(),
      status: 'completed',
      score: overallScore
    };
    
    setSession(completedSession);
    setSessionScore(overallScore);
    setIsSessionComplete(true);
    
    onComplete(completedSession);
  }, [onComplete, session]);

  // Review mode functions
  const handleReviewChunk = () => {
    setIsReviewMode(true);
    setReviewQuestionIndex(0);
  };

  const handleReviewNavigation = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setReviewQuestionIndex(prev => Math.max(0, prev - 1));
    } else {
      setReviewQuestionIndex(prev => Math.min(questions.length - 1, prev + 1));
    }
  };

  const handleExitReview = () => {
    setIsReviewMode(false);
    setReviewQuestionIndex(0);
  };

  // Format content for reading with enhanced highlighting
  const formatContentForReading = (content: string, topics: string[] = [], concepts: string[] = []): string => {
    if (!content) return '';

    const paragraphs = content.split(/\n\n+/);
    
    const processedParagraphs = paragraphs.map(paragraph => {
      if (paragraph.trim().length === 0) return '';
      
      // Bold first 2-3 words
      let processed = paragraph.replace(/^(\s*)(\w+(?:\s+\w+){0,2})/, '$1**$2**');
      
      // Highlight key concepts
      concepts.forEach(concept => {
        if (concept.length > 2) {
          const escapedConcept = concept.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`\\b(${escapedConcept})\\b`, 'gi');
          processed = processed.replace(regex, '`$1`');
        }
      });
      
      return processed;
    });
    
    return processedParagraphs.join('\n\n');
  };

  // Retry question generation with incremented counter
  const retryQuestionGeneration = useCallback(async () => {
    if (retryCount >= 2) {
      toast({
        title: "Maximum Retries Reached",
        description: "Unable to generate questions for this section. Moving to next section.",
        variant: "destructive",
      });
      handleNextChunk();
      return;
    }
    
    setRetryCount(prev => prev + 1);
    await generateQuestions();
  }, [retryCount, generateQuestions, handleNextChunk, toast]);

  // Render learning mode
  const renderLearningMode = () => {
    if (!currentChunk) return null;
    
    const formattedContent = formatContentForReading(
      currentChunk.content, 
      currentChunk.topics, 
      currentChunk.keyConcepts
    );
    
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {getChunkTitle()}
                {currentChunk.educationalValue && (
                  <Badge variant="outline" className={`text-xs ${
                    currentChunk.educationalValue >= 8 ? 'bg-green-50 text-green-700' :
                    currentChunk.educationalValue >= 6 ? 'bg-amber-50 text-amber-700' :
                    'bg-gray-50 text-gray-700'
                  }`}>
                    📊 {currentChunk.educationalValue}/10
                  </Badge>
                )}
              </CardTitle>
              <div className="flex flex-wrap gap-2 mt-2">
                {currentChunk.difficultyLevel && (
                  <Badge variant="outline" className={`text-xs ${
                    currentChunk.difficultyLevel === 'basic' ? 'bg-green-50 text-green-700' :
                    currentChunk.difficultyLevel === 'intermediate' ? 'bg-amber-50 text-amber-700' :
                    'bg-red-50 text-red-700'
                  }`}>
                    {currentChunk.difficultyLevel} level
                  </Badge>
                )}
                {currentChunk.readingTime && (
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                    📖 ~{currentChunk.readingTime} min read
                  </Badge>
                )}
                {currentChunk.wordCount && (
                  <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700">
                    {currentChunk.wordCount} words
                  </Badge>
                )}
                {currentChunk.semanticBoundaries.conceptualCompleteness > 7 && (
                  <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
                    ✨ Complete concept
                  </Badge>
                )}
              </div>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              <Clock className="h-3.5 w-3.5 mr-1" />
              <span>{formatTime(remainingLearnTime)}</span>
            </Badge>
          </div>
          <CardDescription>
            Read and understand this section.             You will be quizzed on it next.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className={`${showLearningObjectives ? 'w-full md:w-3/4' : 'w-full'}`}>
              <ScrollArea className="h-64 sm:h-80 md:h-96 border rounded-md p-4 bg-gray-50">
                <div className="prose dark:prose-invert max-w-none font-serif whitespace-pre-wrap text-foreground/90 leading-relaxed">
                  {formattedContent.split('\n\n').map((paragraph, idx) => (
                    <p key={idx} dangerouslySetInnerHTML={{ 
                      __html: paragraph
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/`(.*?)`/g, '<span class="text-primary font-medium bg-primary/10 px-1 rounded">$1</span>')
                    }} />
                  ))}
                </div>
              </ScrollArea>
            </div>
            
            {showLearningObjectives && (
              <div className="w-full md:w-1/4 p-3 border bg-slate-50 dark:bg-slate-800/50 rounded-md">
                <h3 className="font-medium text-sm mb-3 flex items-center text-primary">
                  <Info className="h-4 w-4 mr-1.5" />
                  STUDY AIDS
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex w-full items-center justify-between text-xs font-semibold text-muted-foreground mb-1.5">
                      <span>KEY CONCEPTS ({currentChunk.keyConcepts.length})</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0"
                        onClick={() => setShowTopics(!showTopics)}
                      >
                        {showTopics ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </div>
                    {showTopics && (
                      <div className="animate-in fade-in-50 duration-100 space-y-1">
                        <div className="flex flex-wrap gap-1 mb-2">
                          {currentChunk.keyConcepts.length > 0 ? currentChunk.keyConcepts.map((concept, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">{concept}</Badge>
                          )) : <span className="text-xs text-muted-foreground">No specific concepts identified.</span>}
                        </div>
                      </div>
                    )}
                  </div>

                  {currentChunk.learningObjectives.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground mb-1.5">
                        LEARNING OBJECTIVES
                      </div>
                      <ul className="space-y-1.5">
                        {currentChunk.learningObjectives.map((objective: string, index: number) => (
                          <li key={index} className="flex items-start group">
                            <Target className="h-3.5 w-3.5 mr-2 mt-0.5 text-primary/80 flex-shrink-0 group-hover:text-primary transition-colors duration-200" />
                            <span className="text-xs text-foreground/90">{objective}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {currentChunk.semanticBoundaries && (
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground mb-1.5">
                        CONTENT QUALITY
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Completeness</span>
                          <span>{currentChunk.semanticBoundaries.conceptualCompleteness}/10</span>
                        </div>
                        <Progress 
                          value={currentChunk.semanticBoundaries.conceptualCompleteness * 10} 
                          className="h-1" 
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <div className="text-sm text-gray-500">Learning Timer</div>
              <div className="text-sm">{formatTime(remainingLearnTime)}</div>
            </div>
            <Progress value={(remainingLearnTime / learnTimeSeconds) * 100} className="h-2" />
            
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <div className="text-sm font-medium">Adjust Learning Time</div>
                <div className="text-sm text-gray-500">{Math.round(learnTimeSeconds / 60)} minutes</div>
              </div>
              <Slider
                value={[learnTimeSeconds]}
                min={60}
                max={600}
                step={30}
                onValueChange={([value]) => handleTimeAdjustment(value)}
                className="my-4"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>1 min</span>
                <span>10 min</span>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between pt-2">
          <Button variant="outline" onClick={onExit}>
            Exit Study Session
          </Button>
          <Button 
            onClick={handleReadyClick}
            className="bg-primary hover:bg-primary/90 transition-transform hover:translate-y-[-2px] duration-200"
          >
            I'm Ready for Questions
          </Button>
        </CardFooter>
      </Card>
    );
  };

  // Enhanced quiz mode with comprehensive error handling
  const renderQuizMode = () => {
    if (isLoadingQuestions) {
      return (
        <Card className="w-full">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-muted rounded-full"></div>
                <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-primary rounded-full animate-spin"></div>
              </div>
              <div className="text-lg font-medium text-foreground mt-8 mb-2">
                Analyzing content and generating enhanced questions...
              </div>
              <div className="text-sm text-muted-foreground">
                Creating educational questions that test understanding
              </div>
              {retryCount > 0 && (
                <div className="text-xs text-amber-600 mt-2">
                  Retry attempt {retryCount}/2
                </div>
              )}
              <div className="w-48 h-1 mt-8 rounded-full bg-muted overflow-hidden">
                <div className="bg-primary h-full w-1/3 rounded-full animate-pulse"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }
    
    if (questionGenerationError) {
      return (
        <Card className="w-full">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-amber-500 dark:text-amber-400 mb-4" />
              <div className="text-xl font-semibold text-foreground mb-2">
                Enhanced Question Generation Issue
              </div>
              <div className="text-sm text-muted-foreground text-center max-w-md mb-6">
                {questionGenerationError}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={retryQuestionGeneration}
                  variant="outline"
                  disabled={retryCount >= 2}
                  className="transition-all duration-200 hover:translate-y-[-1px]"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {retryCount >= 2 ? 'Max Retries Reached' : 'Try Again'}
                </Button>
                <Button 
                  onClick={handleNextChunk}
                  className="transition-all duration-200 hover:translate-y-[-1px]"
                >
                  Skip to Next Section
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }
    
    if (questions.length === 0) {
      return (
        <Card className="w-full">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-gray-400 mb-4" />
              <div className="text-lg font-medium text-gray-700 mb-2">
                No Enhanced Questions Available
              </div>
              <div className="text-sm text-gray-500 text-center max-w-md mb-6">
                Unable to create enhanced questions from this content section.
              </div>
              <Button onClick={handleNextChunk}>
                Continue to Next Section
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }
    
    const currentQuestion = questions[currentQuestionIndex];
    
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">
              Question {currentQuestionIndex + 1} of {questions.length}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={`${
                  remainingQuestionTime < 10 
                    ? "bg-red-50 text-red-700 border-red-200 animate-pulse" 
                    : remainingQuestionTime < 30
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-blue-50 text-blue-700 border-blue-200"
                }`}
              >
                <Clock className="h-3.5 w-3.5 mr-1" />
                <span>{formatTime(remainingQuestionTime)}</span>
              </Badge>
              
              {questionQuality === 'high' && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <Star className="h-3.5 w-3.5 mr-1" />
                  Enhanced Quality
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <QuestionDisplay
            question={currentQuestion}
            selectedAnswer={selectedAnswer}
            showFeedback={showFeedback}
            isBlindMode={false}
            onSelectAnswer={handleAnswerSelect}
            onRequestHint={handleHintRequest}
            onCheckAnswer={handleCheckAnswer}
            onNextQuestion={handleNextQuestion}
            confidenceLevels={CONFIDENCE_LEVELS}
            selectedConfidence={userConfidence}
            onSelectConfidence={handleConfidenceSelect}
            hintRequested={hintRequested}
            isLastQuestion={currentQuestionIndex === questions.length - 1}
            timeRemaining={remainingQuestionTime}
            totalTime={questionTimer}
          />
        </CardContent>
      </Card>
    );
  };

  // Render chunk complete (enhanced with chunk metadata)
  const renderChunkComplete = () => {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-center">
            {getChunkTitle()} Completed!
          </CardTitle>
          <CardDescription className="text-center">
            {chunkScore >= 80 
              ? "Excellent work! You've mastered this section." 
              : chunkScore >= 60 
                ? "Good progress! Consider reviewing the missed questions." 
                : "This section needs more attention. Review is recommended."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-6">
          <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-4 ${
            chunkScore >= 80 ? 'bg-green-50' : chunkScore >= 60 ? 'bg-amber-50' : 'bg-red-50'
          }`}>
            <h2 className={`text-3xl font-bold ${
              chunkScore >= 80 ? 'text-green-600' : chunkScore >= 60 ? 'text-amber-600' : 'text-red-600'
            }`}>
              {chunkScore}%
            </h2>
          </div>
          <Progress 
            value={chunkScore} 
            className="w-full max-w-xs mb-4" 
          />
          
          {!isReviewMode ? (
            <div className="flex flex-col items-center mt-4 gap-4">
              <div className="text-sm text-gray-600 text-center max-w-md">
                {chunkScore >= 80 
                  ? "You have demonstrated strong understanding! Ready to move forward?" 
                  : "Consider reviewing the questions to strengthen your understanding before continuing."}
              </div>
              
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={handleReviewChunk}
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Review Questions
                </Button>
                
                <Button 
                  onClick={handleNextChunk}
                  className="transition-all duration-200 hover:translate-y-[-2px]"
                >
                  {session.currentChunkIndex < chunks.length - 1 
                    ? 'Continue to Next Section' 
                    : 'Complete Study Session'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-md mt-4">
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleExitReview}
              >
                Exit Review
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Session complete rendering (enhanced)
  const renderSessionComplete = () => {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-center">🎉 Enhanced Study Session Completed!</CardTitle>
          <CardDescription className="text-center">
            You have completed all {chunks.length} sections of "{document.title}"
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-6">
          <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-4 ${
            sessionScore >= 80 ? 'bg-green-50' : sessionScore >= 60 ? 'bg-amber-50' : 'bg-red-50'
          }`}>
            <h2 className={`text-3xl font-bold ${
              sessionScore >= 80 ? 'text-green-600' : sessionScore >= 60 ? 'text-amber-600' : 'text-red-600'
            }`}>
              {sessionScore}%
            </h2>
          </div>
          <Progress value={sessionScore} className="w-full max-w-xs mb-6" />
          
          <div className="text-center mb-6">
            <p className={`text-lg font-medium ${
              sessionScore >= 80 ? 'text-green-700' : sessionScore >= 60 ? 'text-amber-700' : 'text-red-700'
            }`}>
              {sessionScore >= 80 
                ? "Outstanding Performance!" 
                : sessionScore >= 60 
                  ? "Good Job!" 
                  : "Keep Studying!"}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              You have answered {session.chunkSessions.reduce((sum, cs) => sum + cs.answers.length, 0)} enhanced questions 
              across {chunks.length} semantic sections
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center gap-3">
          <Button variant="outline" onClick={onExit}>
            Return to Documents
          </Button>
          <Button onClick={() => {
            window.location.reload();
          }}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Study Again
          </Button>
        </CardFooter>
      </Card>
    );
  };

  // Loading state
  if (isLoadingChunks) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <div className="text-lg font-medium text-gray-700">Preparing enhanced study materials...</div>
        <div className="text-sm text-gray-500 mt-2">Using semantic analysis for optimal learning</div>
      </div>
    );
  }

  // Main render
  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Enhanced Header */}
      {!isSessionComplete && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold">{document.title}</h2>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center">
                <Brain className="h-4 w-4 mr-1.5" />
                <span>Enhanced Mode</span>
              </Badge>
              
              {questionQuality === 'high' && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  ✨ Exam Quality
                </Badge>
              )}

              {currentChunk?.educationalValue && currentChunk.educationalValue >= 8 && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  🎓 High Value
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm text-gray-600">
              {isLearning ? 'Learning' : isChunkComplete ? 'Review' : 'Quiz'}: 
              {getChunkTitle()}
            </div>
            <div className="text-sm text-gray-600">
              {Math.round(((session.currentChunkIndex + (isChunkComplete ? 1 : 0)) / session.totalChunks) * 100)}% complete
            </div>
          </div>
          
          <Progress 
            value={((session.currentChunkIndex + (isChunkComplete ? 1 : 0)) / session.totalChunks) * 100} 
            className="h-2" 
          />
        </div>
      )}
      
      {/* Content rendering */}
      {isLearning && renderLearningMode()}
      {!isLearning && !isChunkComplete && !isSessionComplete && renderQuizMode()}
      {isChunkComplete && !isSessionComplete && renderChunkComplete()}
      {isSessionComplete && renderSessionComplete()}
    </div>
  );
};

export default PreparationMode;