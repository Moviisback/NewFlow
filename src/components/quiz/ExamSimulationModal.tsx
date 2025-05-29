'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { 
  Timer, 
  Brain, 
  Target, 
  BookOpen, 
  Check,
  X, 
  AlertCircle, 
  Clock, 
  ChevronRight, 
  ChevronLeft, 
  Flag, 
  BarChart, 
  PieChart,
  RotateCcw, 
  CheckCircle,
  Award
} from 'lucide-react';

// Import types
import { Question, UserAnswer, ContentChunk, ExamSession, ExamSettings, LearningProgress } from '@/types/quizTypes';
import { LibraryItem } from '@/components/documents/types';

interface ExamSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: LibraryItem;
  onComplete: (session: ExamSession) => void;
  initialProgress?: LearningProgress;
}

const ExamSimulationModal: React.FC<ExamSimulationModalProps> = ({
  isOpen,
  onClose,
  document,
  onComplete,
  initialProgress
}) => {
  const { toast } = useToast();
  
  // References
  const examTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // State for exam setup
  const [showSetup, setShowSetup] = useState<boolean>(true);
  const [examSettings, setExamSettings] = useState<ExamSettings>({
    questionCount: 10,
    timeLimit: 20, // minutes
    selectedSections: undefined,
    focusOnWeakAreas: false,
    questionTypes: ['multiple_choice', 'true_false', 'fill_in_blank', 'short_answer'],
    difficultyLevel: 50,
    blindMode: false
  });
  
  // State for document chunks
  const [chunks, setChunks] = useState<ContentChunk[]>([]);
  const [isLoadingChunks, setIsLoadingChunks] = useState<boolean>(false);
  
  // State for exam session
  const [session, setSession] = useState<ExamSession>({
    id: `exam_${Date.now()}`,
    documentId: document.id,
    documentTitle: document.title,
    startTime: new Date(),
    status: 'in-progress',
    mode: 'exam',
    questions: [],
    answers: [],
    timeLimit: 20,
    examSettings: examSettings
  });
  
  // State for exam navigation
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [markedForReview, setMarkedForReview] = useState<Set<number>>(new Set());
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [remainingTimeSeconds, setRemainingTimeSeconds] = useState<number>(20 * 60); // Default 20 minutes
  const [isExamComplete, setIsExamComplete] = useState<boolean>(false);
  const [showExamReview, setShowExamReview] = useState<boolean>(false);
  const [reviewQuestionIndex, setReviewQuestionIndex] = useState<number>(0);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState<boolean>(false);
  
  // State for results
  const [examScore, setExamScore] = useState<number>(0);
  const [scoreByTopic, setScoreByTopic] = useState<{[key: string]: {correct: number, total: number}}>({});
  const [weakAreas, setWeakAreas] = useState<{topic: string, correctRate: number}[]>([]);
  
  // Show navigation panel
  const [showNavPanel, setShowNavPanel] = useState<boolean>(false);
  
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
    
    // Simple chunk division by paragraphs - in a real app, this would be more sophisticated
    const paragraphs = document.content.split(/\n\n+/).filter(p => p.trim().length > 0);
    
    // Group paragraphs into meaningful chunks (here we're using a simple approach)
    let chunks: ContentChunk[] = [];
    let currentChunkContent = '';
    let currentTopics: string[] = [];
    
    // Simplified topic extraction - in production this would use NLP or existing metadata
    const extractTopics = (text: string): string[] => {
      // Just a simplified version for demonstration
      // In production, you'd use keyword extraction, NER, or existing metadata
      const keywords = text.match(/\b[A-Z][a-z]{2,}\b/g) || [];
      return [...new Set(keywords)].slice(0, 3);
    };
    
    paragraphs.forEach((paragraph, index) => {
      const paragraphWordCount = paragraph.split(/\s+/).filter(Boolean).length;
      
      // If adding this paragraph would make the chunk too large, start a new chunk
      if (currentChunkContent && 
          (currentChunkContent.split(/\s+/).filter(Boolean).length + paragraphWordCount > 300 || 
           index % 3 === 0)) { // Arbitrary division for demonstration
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
    
    // Return the chunks
    return chunks;
  }, [document.content, toast]);
  
  // Load document chunks when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsLoadingChunks(true);
      try {
        const documentChunks = divideIntoChunks();
        setChunks(documentChunks);
      } catch (error) {
        console.error('Error dividing document into chunks:', error);
        toast({
          title: "Error",
          description: "Failed to prepare document for exam.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingChunks(false);
      }
    }
  }, [isOpen, divideIntoChunks, toast]);
  
  // Generate exam questions
  const generateExamQuestions = useCallback(async () => {
    setIsLoadingQuestions(true);
    
    try {
      // Filter chunks if specific sections are selected
      let examChunks = chunks;
      if (examSettings.selectedSections && examSettings.selectedSections.length > 0) {
        examChunks = chunks.filter(chunk => examSettings.selectedSections?.includes(chunk.index));
      }
      
      // Get weak areas if focusing on them
      const weakAreas = examSettings.focusOnWeakAreas && initialProgress
        ? initialProgress.weakAreas.map(area => ({
            chunkIndex: area.chunkIndex,
            topic: area.topic
          }))
        : [];
      
      // Call API to generate exam questions
      const response = await fetch('/api/quizzes/generate-exam', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chunks: examChunks,
          weakAreas: weakAreas.map(area => area.topic),
          questionCount: examSettings.questionCount,
          questionTypes: examSettings.questionTypes,
          difficultyLevel: examSettings.difficultyLevel,
          focusOnWeakAreas: examSettings.focusOnWeakAreas
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate exam questions');
      }
      
      const data = await response.json();
      setQuestions(data.questions);
      
      // Initialize new session with generated questions
      setSession(prev => ({
        ...prev,
        questions: data.questions,
        timeLimit: examSettings.timeLimit,
        examSettings: examSettings
      }));
      
      // Set remaining time
      setRemainingTimeSeconds(examSettings.timeLimit * 60);
      
    } catch (error) {
      console.error('Error generating exam questions:', error);
      toast({
        title: "Error",
        description: "Failed to generate exam questions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingQuestions(false);
    }
  }, [chunks, examSettings, initialProgress, toast]);
  
  // Start exam timer
  useEffect(() => {
    if (isOpen && !showSetup && !isExamComplete && remainingTimeSeconds > 0) {
      examTimerRef.current = setInterval(() => {
        setRemainingTimeSeconds(time => {
          if (time <= 1) {
            // Time's up, clear interval and complete exam
            if (examTimerRef.current) clearInterval(examTimerRef.current);
            completeExam();
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (examTimerRef.current) clearInterval(examTimerRef.current);
    };
  }, [isOpen, showSetup, isExamComplete]);
  
  // Format time display (MM:SS)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Handle exam settings changes
  const handleSettingChange = (key: keyof ExamSettings, value: any) => {
    setExamSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // Start exam
  const startExam = async () => {
    // Validate settings
    if (examSettings.questionCount <= 0) {
      toast({
        title: "Invalid Settings",
        description: "Please select at least 1 question.",
        variant: "destructive",
      });
      return;
    }
    
    await generateExamQuestions();
    setShowSetup(false);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setMarkedForReview(new Set());
    setAnsweredQuestions(new Set());
  };
  
  // Handle answer selection
  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswer(answer);
    
    // Auto-save answer if not in blind mode
    if (!examSettings.blindMode) {
      saveAnswer(answer);
    }
  };
  
  // Save answer
  const saveAnswer = (answer: string | null) => {
    if (!answer) return;
    
    const currentQuestion = questions[currentQuestionIndex];
    
    // Create user answer object
    const userAnswer: UserAnswer = {
      questionId: currentQuestion.id,
      userAnswer: answer,
      isCorrect: answer === currentQuestion.correctAnswer,
      timeSpent: 0 // We're not tracking per-question time in exam mode
    };
    
    // Check if this question has already been answered
    const existingAnswerIndex = session.answers.findIndex(a => a.questionId === currentQuestion.id);
    
    if (existingAnswerIndex >= 0) {
      // Update existing answer
      const updatedAnswers = [...session.answers];
      updatedAnswers[existingAnswerIndex] = userAnswer;
      setSession(prev => ({
        ...prev,
        answers: updatedAnswers
      }));
    } else {
      // Add new answer
      setSession(prev => ({
        ...prev,
        answers: [...prev.answers, userAnswer]
      }));
    }
    
    // Mark this question as answered
    setAnsweredQuestions(prev => new Set(prev).add(currentQuestionIndex));
  };
  
  // Toggle marking question for review
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
  
  // Navigate to a specific question
  const navigateToQuestion = (index: number) => {
    // Save current answer if one is selected and we're not in blind mode
    if (selectedAnswer && !examSettings.blindMode) {
      saveAnswer(selectedAnswer);
    }
    
    setCurrentQuestionIndex(index);
    
    // Set selected answer to the stored answer for this question
    const storedAnswer = session.answers.find(a => a.questionId === questions[index].id);
    setSelectedAnswer(storedAnswer?.userAnswer || null);
  };
  
  // Navigate to the next question
  const handleNextQuestion = () => {
    // First save the current answer if one is selected
    if (selectedAnswer && examSettings.blindMode) {
      saveAnswer(selectedAnswer);
    }
    
    if (currentQuestionIndex < questions.length - 1) {
      navigateToQuestion(currentQuestionIndex + 1);
    }
  };
  
  // Navigate to the previous question
  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      navigateToQuestion(currentQuestionIndex - 1);
    }
  };
  
  // Complete the exam
  const completeExam = () => {
    // Save current answer if one is selected and we're not in blind mode
    if (selectedAnswer && examSettings.blindMode) {
      saveAnswer(selectedAnswer);
    }
    
    // Calculate score
    const totalAnswered = session.answers.length;
    const correctAnswers = session.answers.filter(a => a.isCorrect).length;
    const score = totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0;
    
    // Calculate score by topic
    const topicScores: {[key: string]: {correct: number, total: number}} = {};
    
    questions.forEach((question, index) => {
      const answer = session.answers.find(a => a.questionId === question.id);
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
      ...session,
      endTime: new Date(),
      status: 'completed',
      score: score
    };
    
    // Update state
    setSession(completedSession);
    setExamScore(score);
    setScoreByTopic(topicScores);
    setWeakAreas(weakTopics);
    setIsExamComplete(true);
    
    // Stop timer
    if (examTimerRef.current) {
      clearInterval(examTimerRef.current);
    }
    
    // Call parent completion handler
    onComplete(completedSession);
  };
  
  // Start review mode
  const handleReviewExam = () => {
    setShowExamReview(true);
    setReviewQuestionIndex(0);
  };
  
  // Navigate in review mode
  const handleReviewNavigation = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setReviewQuestionIndex(prev => Math.max(0, prev - 1));
    } else {
      setReviewQuestionIndex(prev => Math.min(questions.length - 1, prev + 1));
    }
  };
  
  // Exit review mode
  const handleExitReview = () => {
    setShowExamReview(false);
  };
  
  // Calculate unanswered questions count
  const getUnansweredCount = (): number => {
    return questions.length - session.answers.length;
  };

  // If modal is not open, don't render anything
  if (!isOpen) return null;

  // Render loading state
  if (isLoadingChunks) {
    return (
      <Dialog open={isOpen} onOpenChange={() => onClose()}>
        <DialogContent className="sm:max-w-[90%] md:max-w-[80%] lg:max-w-[70%] xl:max-w-[60%] h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Preparing Exam</DialogTitle>
            <DialogDescription>Loading content from {document.title}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center flex-grow py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4"></div>
            <div className="text-lg font-medium text-gray-700 dark:text-gray-300">Preparing exam materials...</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">This may take a few moments</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Render exam setup
  if (showSetup) {
    return (
      <Dialog open={isOpen} onOpenChange={() => onClose()}>
        <DialogContent className="sm:max-w-[90%] md:max-w-[80%] lg:max-w-[70%] xl:max-w-[60%] h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Exam Settings</DialogTitle>
            <DialogDescription>
              Customize your exam experience for {document.title}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-grow overflow-auto py-4">
            <div className="grid gap-6">
              {/* Question Count */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium">Number of Questions</h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{examSettings.questionCount} questions</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={examSettings.questionCount}
                  onChange={(e) => handleSettingChange('questionCount', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>5</span>
                  <span>25</span>
                  <span>50</span>
                </div>
              </div>
              
              {/* Time Limit */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium">Time Limit</h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{examSettings.timeLimit} minutes</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="120"
                  step="5"
                  value={examSettings.timeLimit}
                  onChange={(e) => handleSettingChange('timeLimit', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>5 min</span>
                  <span>1 hour</span>
                  <span>2 hours</span>
                </div>
              </div>
              
              {/* Difficulty Level */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium">Difficulty Level</h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {examSettings.difficultyLevel < 30 
                      ? "Basic" 
                      : examSettings.difficultyLevel < 60 
                        ? "Moderate" 
                        : examSettings.difficultyLevel < 85 
                          ? "Challenging" 
                          : "Expert"}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={examSettings.difficultyLevel}
                  onChange={(e) => handleSettingChange('difficultyLevel', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>Basic</span>
                  <span>Moderate</span>
                  <span>Expert</span>
                </div>
              </div>
              
              {/* Question Types */}
              <div>
                <h3 className="text-sm font-medium mb-2">Question Types</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: 'multiple_choice', label: 'Multiple Choice' },
                    { id: 'true_false', label: 'True/False' },
                    { id: 'fill_in_blank', label: 'Fill in the Blank' },
                    { id: 'short_answer', label: 'Short Answer' }
                  ].map(type => (
                    <div key={type.id} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`type-${type.id}`}
                        checked={examSettings.questionTypes.includes(type.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleSettingChange('questionTypes', [...examSettings.questionTypes, type.id]);
                          } else {
                            // Don't allow removing the last question type
                            if (examSettings.questionTypes.length > 1) {
                              handleSettingChange(
                                'questionTypes',
                                examSettings.questionTypes.filter(t => t !== type.id)
                              );
                            }
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`type-${type.id}`} className="ml-2 text-sm">
                        {type.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Advanced Settings */}
              <div>
                <h3 className="text-sm font-medium mb-2">Advanced Settings</h3>
                
                {/* Focus on Weak Areas */}
                {initialProgress && initialProgress.weakAreas.length > 0 && (
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <label htmlFor="weak-areas" className="text-sm">Focus on Weak Areas</label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Prioritize questions from topics you struggle with
                      </p>
                    </div>
                    <div className="relative inline-block w-12 h-6">
                      <input
                        type="checkbox"
                        id="weak-areas"
                        checked={examSettings.focusOnWeakAreas}
                        onChange={(e) => handleSettingChange('focusOnWeakAreas', e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-12 h-6 rounded-full ${examSettings.focusOnWeakAreas ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                      <div className={`absolute left-1 top-1 bg-white rounded-full w-4 h-4 transition-transform ${examSettings.focusOnWeakAreas ? 'transform translate-x-6' : ''}`}></div>
                    </div>
                  </div>
                )}
                
                {/* Blind Mode */}
                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor="blind-mode" className="text-sm">Blind Mode</label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Hide correct answers until the exam is complete
                    </p>
                  </div>
                  <div className="relative inline-block w-12 h-6">
                    <input
                      type="checkbox"
                      id="blind-mode"
                      checked={examSettings.blindMode}
                      onChange={(e) => handleSettingChange('blindMode', e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-12 h-6 rounded-full ${examSettings.blindMode ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                    <div className={`absolute left-1 top-1 bg-white rounded-full w-4 h-4 transition-transform ${examSettings.blindMode ? 'transform translate-x-6' : ''}`}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="border-t pt-4 flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={onClose} className="sm:mr-auto">
              Cancel
            </Button>
            <Button 
              onClick={startExam}
              disabled={isLoadingQuestions}
            >
              {isLoadingQuestions ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Loading...
                </>
              ) : 'Start Exam'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Render exam taking screen
  if (!isExamComplete) {
    if (questions.length === 0) {
      return (
        <Dialog open={isOpen} onOpenChange={() => onClose()}>
          <DialogContent className="sm:max-w-[90%] md:max-w-[80%] lg:max-w-[70%] xl:max-w-[60%] h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Generating Exam</DialogTitle>
              <DialogDescription>Preparing your exam questions</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center flex-grow py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4"></div>
              <div className="text-lg font-medium text-gray-700 dark:text-gray-300">Generating exam questions...</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">This may take a few moments</div>
            </div>
          </DialogContent>
        </Dialog>
      );
    }
    
    const currentQuestion = questions[currentQuestionIndex];
    
    return (
      <Dialog open={isOpen} onOpenChange={() => onClose()}>
        <DialogContent className="sm:max-w-[90%] md:max-w-[80%] lg:max-w-[70%] xl:max-w-[60%] h-[90vh] flex flex-col">
          <DialogHeader className="border-b pb-4">
            <div className="flex justify-between items-center">
              <DialogTitle>
                Exam: {document.title}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={`${
                    remainingTimeSeconds < 60 
                      ? "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 animate-pulse" 
                      : remainingTimeSeconds < 300
                        ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                        : "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                  }`}
                >
                  <Clock className="h-3.5 w-3.5 mr-1" />
                  <span>{formatTime(remainingTimeSeconds)}</span>
                </Badge>
                <Badge variant="outline">
                  {answeredQuestions.size} / {questions.length}
                </Badge>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowNavPanel(!showNavPanel)}
                  className="h-8 w-8 rounded-full"
                >
                  <Target className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <DialogDescription className="mt-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Question {currentQuestionIndex + 1} of {questions.length}</span>
                <div className="flex gap-2">
                  <Badge variant="outline" className="capitalize">
                    {currentQuestion.difficulty}
                  </Badge>
                  {currentQuestion.topic && (
                    <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                      {currentQuestion.topic}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-base font-medium mt-2 text-gray-900 dark:text-gray-100">
                {currentQuestion.question}
              </div>
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-grow overflow-hidden">
            <div className={`${showNavPanel ? 'block w-1/4' : 'hidden'} border-r overflow-auto p-3`}>
              <div className="mb-3">
                <h3 className="text-sm font-medium mb-2">Question Navigation</h3>
                <div className="grid grid-cols-5 gap-2">
                  {questions.map((_, index) => {
                    const isAnswered = answeredQuestions.has(index);
                    const isMarked = markedForReview.has(index);
                    const isCurrent = index === currentQuestionIndex;
                    
                    return (
                      <Button 
                        key={index}
                        variant="outline"
                        size="sm"
                        className={`h-8 w-8 p-0 ${
                          isCurrent 
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                            : isMarked 
                              ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300' 
                              : isAnswered 
                                ? 'border-green-300 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                                : ''
                        }`}
                        onClick={() => navigateToQuestion(index)}
                      >
                        {index + 1}
                      </Button>
                    );
                  })}
                </div>
              </div>
              
              <div className="mt-4">
                <div className="flex flex-wrap gap-3 text-sm">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
                    <span>Answered: {answeredQuestions.size}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-amber-500 mr-1"></div>
                    <span>Marked: {markedForReview.size}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-gray-300 mr-1"></div>
                    <span>Unanswered: {getUnansweredCount()}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className={`${showNavPanel ? 'w-3/4' : 'w-full'} overflow-auto p-4`}>
              <div className="space-y-3">
                {/* Multiple Choice Questions */}
                {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
                  <div className="grid gap-3">
                    {currentQuestion.options.map((option) => (
                      <Button
                        key={option}
                        variant={selectedAnswer === option ? 'secondary' : 'outline'}
                        className="w-full text-left justify-start px-4 py-3 h-auto"
                        onClick={() => handleAnswerSelect(option)}
                      >
                        <span>{option}</span>
                      </Button>
                    ))}
                  </div>
                )}
                
                {/* True/False Questions */}
                {currentQuestion.type === 'true_false' && (
                  <div className="grid grid-cols-2 gap-3">
                    {['True', 'False'].map((option) => (
                      <Button
                        key={option}
                        variant={selectedAnswer === option ? 'secondary' : 'outline'}
                        className="text-center justify-center px-4 py-3 h-auto"
                        onClick={() => handleAnswerSelect(option)}
                      >
                        <span>{option}</span>
                      </Button>
                    ))}
                  </div>
                )}
                
                {/* Fill in the Blank Questions */}
                {currentQuestion.type === 'fill_in_blank' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md border">
                      {currentQuestion.question.includes('_____') 
                        ? currentQuestion.question.replace('_____', '________')
                        : currentQuestion.question}
                    </div>
                    <input
                      type="text"
                      className="w-full border rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                      placeholder="Type your answer here..."
                      value={selectedAnswer || ''}
                      onChange={(e) => handleAnswerSelect(e.target.value)}
                    />
                  </div>
                )}
                
                {/* Short Answer Questions */}
                {currentQuestion.type === 'short_answer' && (
                  <div className="space-y-4">
                    <textarea
                      className="w-full border rounded-md p-3 min-h-24 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                      placeholder="Type your answer here..."
                      value={selectedAnswer || ''}
                      onChange={(e) => handleAnswerSelect(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter className="border-t pt-4 flex-col sm:flex-row gap-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={toggleMarkForReview}
              className={markedForReview.has(currentQuestionIndex) ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300' : ''}
            >
              <Flag className={`h-4 w-4 mr-1 ${markedForReview.has(currentQuestionIndex) ? 'text-amber-500 dark:text-amber-400' : ''}`} />
              {markedForReview.has(currentQuestionIndex) ? 'Marked for Review' : 'Mark for Review'}
            </Button>
            
            <div className="flex gap-2 sm:ml-auto">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handlePrevQuestion}
                disabled={currentQuestionIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              
              {currentQuestionIndex < questions.length - 1 ? (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleNextQuestion}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button 
                  size="sm"
                  onClick={completeExam}
                >
                  Finish Exam
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Render exam results or review
  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[90%] md:max-w-[80%] lg:max-w-[70%] xl:max-w-[60%] h-[90vh] flex flex-col">
        {showExamReview ? (
          <>
            <DialogHeader>
              <div className="flex justify-between items-center">
                <DialogTitle>
                  Review: Question {reviewQuestionIndex + 1} of {questions.length}
                </DialogTitle>
                <Badge variant="outline" className="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                  Score: {examScore}%
                </Badge>
              </div>
            </DialogHeader>
            
            <div className="flex-grow overflow-auto py-4">
              <div className="space-y-4">
                {(() => {
                  const question = questions[reviewQuestionIndex];
                  const answer = session.answers.find(a => a.questionId === question.id);
                  
                  return (
                    <>
                      <div className="text-lg font-medium">{question.question}</div>
                      
                      {/* Multiple Choice Review */}
                      {question.type === 'multiple_choice' && question.options && (
                        <div className="grid gap-3 mt-4">
                          {question.options.map((option) => (
                            <div
                              key={option}
                              className={`p-3 rounded-md border ${
                                option === question.correctAnswer
                                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                  : answer && option === answer.userAnswer && option !== question.correctAnswer
                                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                    : 'bg-gray-50 dark:bg-gray-800'
                              }`}
                            >
                              <div className="flex items-center">
                                {option === question.correctAnswer ? (
                                  <Check className="h-4 w-4 text-green-500 dark:text-green-400 mr-2 flex-shrink-0" />
                                ) : answer && option === answer.userAnswer ? (
                                  <X className="h-4 w-4 text-red-500 dark:text-red-400 mr-2 flex-shrink-0" />
                                ) : (
                                  <div className="w-4 mr-2" />
                                )}
                                <span>{option}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* True/False Review */}
                      {question.type === 'true_false' && (
                        <div className="grid grid-cols-2 gap-3 mt-4">
                          {['True', 'False'].map((option) => (
                            <div
                              key={option}
                              className={`p-3 rounded-md border text-center ${
                                option === question.correctAnswer
                                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                  : answer && option === answer.userAnswer && option !== question.correctAnswer
                                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                    : 'bg-gray-50 dark:bg-gray-800'
                              }`}
                            >
                              <div className="flex items-center justify-center">
                                {option === question.correctAnswer ? (
                                  <Check className="h-4 w-4 text-green-500 dark:text-green-400 mr-2" />
                                ) : answer && option === answer.userAnswer ? (
                                  <X className="h-4 w-4 text-red-500 dark:text-red-400 mr-2" />
                                ) : (
                                  <div className="w-4 mr-2" />
                                )}
                                <span>{option}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Fill in Blank and Short Answer Review */}
                      {(question.type === 'fill_in_blank' || question.type === 'short_answer') && (
                        <div className="space-y-3 mt-4">
                          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md border">
                            <div className="font-medium text-sm mb-1">Your Answer:</div>
                            <div>{answer?.userAnswer || 'Not answered'}</div>
                          </div>
                          
                          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
                            <div className="font-medium text-sm text-green-800 dark:text-green-300 mb-1">Correct Answer:</div>
                            <div className="text-green-700 dark:text-green-300">{question.correctAnswer}</div>
                          </div>
                        </div>
                      )}
                      
                      {/* Explanation */}
                      {question.explanation && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-100 dark:border-blue-800 mt-6">
                          <div className="flex items-start">
                            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <h4 className="font-medium text-blue-800 dark:text-blue-300">Explanation</h4>
                              <p className="text-sm mt-1 text-blue-700 dark:text-blue-300">{question.explanation}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Topic and Source */}
                      <div className="flex flex-wrap gap-3 mt-6">
                        {question.topic && (
                          <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                            Topic: {question.topic}
                          </Badge>
                        )}
                        
                        {question.sourceSection && (
                          <div className="w-full mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">
                            <div className="font-medium text-gray-600 dark:text-gray-400 text-xs mb-1">Source:</div>
                            <span className="italic">"{question.sourceSection}"</span>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
            
            <DialogFooter className="border-t pt-4 flex-col sm:flex-row gap-3">
              <Button 
                variant="outline" 
                onClick={handleExitReview}
                className="sm:mr-auto"
              >
                Back to Results
              </Button>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleReviewNavigation('prev')}
                  disabled={reviewQuestionIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleReviewNavigation('next')}
                  disabled={reviewQuestionIndex === questions.length - 1}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-center">Exam Completed!</DialogTitle>
              <DialogDescription className="text-center">
                {examScore >= 80 
                  ? "Excellent work! You've mastered this material." 
                  : examScore >= 60 
                    ? "Good progress! But there's still room for improvement." 
                    : "You might need more study time with this material."}
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-grow overflow-auto py-4">
              <div className="flex flex-col items-center mb-6">
                <div className="w-32 h-32 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center mb-4">
                  <h2 className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {examScore}%
                  </h2>
                </div>
                <Progress 
                  value={examScore} 
                  className="w-full max-w-md mb-2" 
                />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-md mt-6">
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-md border border-purple-100 dark:border-purple-800 flex flex-col items-center">
                    <Target className="h-5 w-5 text-purple-600 dark:text-purple-400 mb-1" />
                    <div className="text-xs text-purple-700 dark:text-purple-300">Accuracy</div>
                    <div className="font-medium text-purple-900 dark:text-purple-100">{examScore}%</div>
                  </div>
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-md border border-purple-100 dark:border-purple-800 flex flex-col items-center">
                    <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400 mb-1" />
                    <div className="text-xs text-purple-700 dark:text-purple-300">Time Used</div>
                    <div className="font-medium text-purple-900 dark:text-purple-100">
                      {formatTime((examSettings.timeLimit * 60) - remainingTimeSeconds)}
                    </div>
                  </div>
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-md border border-purple-100 dark:border-purple-800 flex flex-col items-center">
                    <CheckCircle className="h-5 w-5 text-purple-600 dark:text-purple-400 mb-1" />
                    <div className="text-xs text-purple-700 dark:text-purple-300">Completion</div>
                    <div className="font-medium text-purple-900 dark:text-purple-100">
                      {Math.round((session.answers.length / questions.length) * 100)}%
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-3 text-lg">Performance by Topic</h3>
                  <ScrollArea className="h-40 w-full">
                    <div className="space-y-3">
                      {Object.entries(scoreByTopic).map(([topic, stats], index) => {
                        const topicScore = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
                        return (
                          <div 
                            key={index}
                            className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-md border"
                          >
                            <div className="font-medium">{topic}</div>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                                <Check className="h-4 w-4 text-green-500 dark:text-green-400 mr-1" />
                                {stats.correct} / {stats.total}
                              </div>
                              <Badge 
                                variant="outline" 
                                className={`${
                                  topicScore >= 80
                                    ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
                                    : topicScore >= 60
                                      ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                      : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                                }`}
                              >
                                {topicScore}%
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
                
                <div>
                  <h3 className="font-medium mb-3 text-lg">Areas to Review</h3>
                  {weakAreas.length > 0 ? (
                    <ScrollArea className="h-40 w-full">
                      <div className="space-y-2">
                        {weakAreas.map((area, index) => (
                          <div 
                            key={index}
                            className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-md border border-amber-200 dark:border-amber-800 text-sm"
                          >
                            <div className="flex justify-between">
                              <span className="font-medium text-amber-800 dark:text-amber-300">
                                {area.topic}
                              </span>
                              <Badge 
                                variant="outline" 
                                className="bg-amber-100 dark:bg-amber-800 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700"
                              >
                                {Math.round(area.correctRate * 100)}%
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="h-40 flex items-center justify-center border rounded-md bg-gray-50 dark:bg-gray-800">
                      <div className="text-center">
                        <Award className="h-8 w-8 mx-auto text-green-500 dark:text-green-400 mb-2" />
                        <p className="font-medium text-green-600 dark:text-green-400">Great job!</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">You did well in all topics</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <DialogFooter className="border-t pt-4 flex-col sm:flex-row gap-3">
              <Button variant="outline" onClick={onClose} className="sm:mr-auto">
                Close
              </Button>
              
              <Button variant="outline" onClick={handleReviewExam}>
                Review Answers
              </Button>
              
              <Button>
                <RotateCcw className="h-4 w-4 mr-2" />
                Take New Exam
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ExamSimulationModal;