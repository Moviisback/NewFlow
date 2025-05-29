'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Timer, 
  Brain, 
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
  Target,
  RotateCcw, 
  CheckCircle
} from 'lucide-react';

// Import types
import { Question, UserAnswer, ContentChunk, ExamSession, ExamSettings, LearningProgress } from '@/types/quizTypes';
import { LibraryItem } from '@/components/documents/types';

interface ExamSimulationProps {
  document: LibraryItem;
  onComplete: (session: ExamSession) => void;
  onExit: () => void;
  initialProgress?: LearningProgress; // For focusing on weak areas
}

const ExamSimulation: React.FC<ExamSimulationProps> = ({
  document,
  onComplete,
  onExit,
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
  
  // Load document chunks
  useEffect(() => {
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
  }, [document, divideIntoChunks, toast]);
  
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
    if (!showSetup && !isExamComplete && remainingTimeSeconds > 0) {
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
  }, [showSetup, isExamComplete]);
  
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
  
  // Toggle section selection
  const toggleSectionSelection = (index: number) => {
    setExamSettings(prev => {
      const currentSelections = prev.selectedSections || [];
      const newSelections = currentSelections.includes(index)
        ? currentSelections.filter(i => i !== index)
        : [...currentSelections, index];
      
      return {
        ...prev,
        selectedSections: newSelections.length > 0 ? newSelections : undefined
      };
    });
  };
  
  // Select all sections
  const selectAllSections = () => {
    setExamSettings(prev => ({
      ...prev,
      selectedSections: undefined
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
  
  // Restart exam with same settings
  const restartExam = () => {
    setShowExamReview(false);
    setIsExamComplete(false);
    setShowSetup(true);
    setQuestions([]);
    setSession({
      id: `exam_${Date.now()}`,
      documentId: document.id,
      documentTitle: document.title,
      startTime: new Date(),
      status: 'in-progress',
      mode: 'exam',
      questions: [],
      answers: [],
      timeLimit: examSettings.timeLimit,
      examSettings: examSettings
    });
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
  
  // Render exam setup screen
  const renderExamSetup = () => {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg">Exam Settings</CardTitle>
          <CardDescription>
            Customize your exam experience for {document.title}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            {/* Question Count */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Number of Questions</Label>
                <span className="text-sm text-gray-500">{examSettings.questionCount} questions</span>
              </div>
              <Slider
                value={[examSettings.questionCount]}
                min={5}
                max={50}
                step={5}
                onValueChange={([value]) => handleSettingChange('questionCount', value)}
                className="my-4"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>5</span>
                <span>25</span>
                <span>50</span>
              </div>
            </div>
            
            {/* Time Limit */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Time Limit</Label>
                <span className="text-sm text-gray-500">{examSettings.timeLimit} minutes</span>
              </div>
              <Slider
                value={[examSettings.timeLimit]}
                min={5}
                max={120}
                step={5}
                onValueChange={([value]) => handleSettingChange('timeLimit', value)}
                className="my-4"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>5 min</span>
                <span>1 hour</span>
                <span>2 hours</span>
              </div>
            </div>
            
            {/* Content Scope */}
            <div>
              <Label className="block mb-4">Content Scope</Label>
              <div className="flex flex-col gap-2 mb-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="all-sections" 
                    checked={!examSettings.selectedSections}
                    onCheckedChange={() => selectAllSections()}
                  />
                  <label
                    htmlFor="all-sections"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    All Sections
                  </label>
                </div>
                
                {initialProgress && initialProgress.weakAreas.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="weak-areas" 
                      checked={examSettings.focusOnWeakAreas}
                      onCheckedChange={(checked) => handleSettingChange('focusOnWeakAreas', checked)}
                    />
                    <label
                      htmlFor="weak-areas"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Focus on Weak Areas
                    </label>
                  </div>
                )}
              </div>
              
              {!examSettings.focusOnWeakAreas && (
                <div>
                  <div className="text-sm text-gray-500 mb-2">
                    {!examSettings.selectedSections 
                      ? "All sections will be included" 
                      : `${examSettings.selectedSections.length} of ${chunks.length} sections selected`}
                  </div>
                  
                  <ScrollArea className="h-40 border rounded-md p-2">
                    <div className="space-y-2">
                      {chunks.map((chunk, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <Checkbox 
                            id={`section-${index}`} 
                            checked={!examSettings.selectedSections || examSettings.selectedSections.includes(index)}
                            onCheckedChange={() => toggleSectionSelection(index)}
                            className="mt-0.5"
                          />
                          <label
                            htmlFor={`section-${index}`}
                            className="text-sm leading-tight"
                          >
                            <span className="font-medium">Section {index + 1}</span>
                            {chunk.topics.length > 0 && (
                              <span className="block text-xs text-gray-500 mt-0.5">
                                Topics: {chunk.topics.join(', ')}
                              </span>
                            )}
                          </label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
            
            {/* Question Types */}
            <div>
              <Label className="block mb-2">Question Types</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'multiple_choice', label: 'Multiple Choice' },
                  { id: 'true_false', label: 'True/False' },
                  { id: 'fill_in_blank', label: 'Fill in the Blank' },
                  { id: 'short_answer', label: 'Short Answer' }
                ].map(type => (
                  <div key={type.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`type-${type.id}`} 
                      checked={examSettings.questionTypes.includes(type.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
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
                    />
                    <label
                      htmlFor={`type-${type.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {type.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Difficulty Level */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Difficulty Level</Label>
                <span className="text-sm text-gray-500">
                  {examSettings.difficultyLevel < 30 
                    ? "Basic" 
                    : examSettings.difficultyLevel < 60 
                      ? "Moderate" 
                      : examSettings.difficultyLevel < 85 
                        ? "Challenging" 
                        : "Expert"}
                </span>
              </div>
              <Slider
                value={[examSettings.difficultyLevel]}
                min={0}
                max={100}
                step={1}
                onValueChange={([value]) => handleSettingChange('difficultyLevel', value)}
                className="my-4"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Basic</span>
                <span>Moderate</span>
                <span>Expert</span>
              </div>
            </div>
            
            {/* Blind Mode Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="blind-mode" className="text-base">Blind Mode</Label>
                <p className="text-sm text-gray-500">Hide correct answers until the exam is complete</p>
              </div>
              <Switch
                id="blind-mode"
                checked={examSettings.blindMode}
                onCheckedChange={(checked) => handleSettingChange('blindMode', checked)}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between pt-2">
          <Button variant="outline" onClick={onExit}>
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
        </CardFooter>
      </Card>
    );
  };
  
  // Render exam taking screen
  const renderExamTaking = () => {
    if (questions.length === 0) {
      return (
        <Card className="w-full">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
              <div className="text-lg font-medium text-gray-700">Generating exam questions...</div>
              <div className="text-sm text-gray-500 mt-2">This may take a few moments</div>
            </div>
          </CardContent>
        </Card>
      );
    }
    
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return null;
    
    const isAnswered = answeredQuestions.has(currentQuestionIndex);
    const storedAnswer = session.answers.find(a => a.questionId === currentQuestion.id);
    
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
                  remainingTimeSeconds < 60 
                    ? "bg-red-50 text-red-700 border-red-200 animate-pulse" 
                    : remainingTimeSeconds < 300
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-blue-50 text-blue-700 border-blue-200"
                }`}
              >
                <Clock className="h-3.5 w-3.5 mr-1" />
                <span>{formatTime(remainingTimeSeconds)}</span>
              </Badge>
              <Badge variant="outline" className="capitalize">
                {currentQuestion.difficulty}
              </Badge>
              {currentQuestion.topic && (
                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                  {currentQuestion.topic}
                </Badge>
              )}
            </div>
          </div>
          <CardDescription className="text-base font-medium mt-3">
            {currentQuestion.question}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Multiple Choice Questions */}
            {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
              <div className="grid gap-3">
                {currentQuestion.options.map((option) => (
                  <Button
                    key={option}
                    variant={selectedAnswer === option ? 'secondary' : 'outline'}
                    className={`w-full text-left justify-start px-4 py-3 h-auto ${
                      !examSettings.blindMode && storedAnswer && option === currentQuestion.correctAnswer 
                        ? 'border-green-500 bg-green-50' 
                        : !examSettings.blindMode && storedAnswer && option === storedAnswer.userAnswer && option !== currentQuestion.correctAnswer
                          ? 'border-red-500 bg-red-50'
                          : ''
                    }`}
                    onClick={() => handleAnswerSelect(option)}
                  >
                    {!examSettings.blindMode && storedAnswer && option === currentQuestion.correctAnswer && (
                      <Check className="h-4 w-4 mr-2 text-green-500" />
                    )}
                    {!examSettings.blindMode && storedAnswer && option === storedAnswer.userAnswer && option !== currentQuestion.correctAnswer && (
                      <X className="h-4 w-4 mr-2 text-red-500" />
                    )}
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
                    className={`text-center justify-center px-4 py-3 h-auto ${
                      !examSettings.blindMode && storedAnswer && option === currentQuestion.correctAnswer 
                        ? 'border-green-500 bg-green-50' 
                        : !examSettings.blindMode && storedAnswer && option === storedAnswer.userAnswer && option !== currentQuestion.correctAnswer
                          ? 'border-red-500 bg-red-50'
                          : ''
                    }`}
                    onClick={() => handleAnswerSelect(option)}
                  >
                    {!examSettings.blindMode && storedAnswer && option === currentQuestion.correctAnswer && (
                      <Check className="h-4 w-4 mr-2 text-green-500" />
                    )}
                    {!examSettings.blindMode && storedAnswer && option === storedAnswer.userAnswer && option !== currentQuestion.correctAnswer && (
                      <X className="h-4 w-4 mr-2 text-red-500" />
                    )}
                    <span>{option}</span>
                  </Button>
                ))}
              </div>
            )}
            
            {/* Fill in the Blank Questions */}
            {currentQuestion.type === 'fill_in_blank' && (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-md border">
                  {currentQuestion.question.includes('_____') 
                    ? currentQuestion.question.replace('_____', '________')
                    : currentQuestion.question}
                </div>
                <input
                  type="text"
                  className="w-full border rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Type your answer here..."
                  value={selectedAnswer || ''}
                  onChange={(e) => handleAnswerSelect(e.target.value)}
                />
                {!examSettings.blindMode && storedAnswer && (
                  <div className={`p-3 rounded-md ${
                    storedAnswer.isCorrect
                      ? 'bg-green-50 border border-green-200 text-green-800'
                      : 'bg-red-50 border border-red-200 text-red-800'
                  }`}>
                    <div className="flex items-center mb-1">
                      {storedAnswer.isCorrect 
                        ? <Check className="h-4 w-4 mr-1 text-green-500" />
                        : <X className="h-4 w-4 mr-1 text-red-500" />
                      }
                      <span className="font-medium">
                        {storedAnswer.isCorrect 
                          ? 'Correct!' 
                          : 'Incorrect!'}
                      </span>
                    </div>
                    <div className="text-sm">
                      The correct answer is: <span className="font-medium">{currentQuestion.correctAnswer}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Short Answer Questions */}
            {currentQuestion.type === 'short_answer' && (
              <div className="space-y-4">
                <textarea
                  className="w-full border rounded-md p-3 min-h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Type your answer here..."
                  value={selectedAnswer || ''}
                  onChange={(e) => handleAnswerSelect(e.target.value)}
                />
                {!examSettings.blindMode && storedAnswer && (
                  <div className={`p-3 rounded-md ${
                    storedAnswer.isCorrect
                      ? 'bg-green-50 border border-green-200 text-green-800'
                      : 'bg-red-50 border border-red-200 text-red-800'
                  }`}>
                    <div className="flex items-center mb-1">
                      {storedAnswer.isCorrect 
                        ? <Check className="h-4 w-4 mr-1 text-green-500" />
                        : <X className="h-4 w-4 mr-1 text-red-500" />
                      }
                      <span className="font-medium">
                        {storedAnswer.isCorrect 
                          ? 'Correct!' 
                          : 'Incorrect!'}
                      </span>
                    </div>
                    <div className="text-sm">
                      Expected answer: <span className="font-medium">{currentQuestion.correctAnswer}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Question explanation (only shown in non-blind mode) */}
            {!examSettings.blindMode && storedAnswer && currentQuestion.explanation && (
              <div className="mt-6 p-4 bg-blue-50 rounded-md border border-blue-100">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-blue-800">Explanation</h4>
                    <p className="text-sm mt-1 text-blue-700">{currentQuestion.explanation}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          {/* Question Navigation */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={toggleMarkForReview}
              className={markedForReview.has(currentQuestionIndex) ? 'bg-amber-50 border-amber-200 text-amber-800' : ''}
            >
              <Flag className={`h-4 w-4 mr-1 ${markedForReview.has(currentQuestionIndex) ? 'text-amber-500' : ''}`} />
              {markedForReview.has(currentQuestionIndex) ? 'Marked' : 'Mark for Review'}
            </Button>
          </div>
          
          <div className="flex gap-2">
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
        </CardFooter>
      </Card>
    );
  };
  
  // Render exam navigation
  const renderExamNavigation = () => {
    return (
      <div className="mt-6 bg-white rounded-lg shadow-sm border p-4">
        <div className="mb-4">
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
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : isMarked 
                        ? 'border-amber-300 bg-amber-50 text-amber-800' 
                        : isAnswered 
                          ? 'border-green-300 bg-green-50 text-green-800' 
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
        
        <div className="flex flex-wrap gap-3 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
            <span>Answered: {answeredQuestions.size}</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-amber-500 mr-1"></div>
            <span>Marked for Review: {markedForReview.size}</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-gray-300 mr-1"></div>
            <span>Unanswered: {getUnansweredCount()}</span>
          </div>
        </div>
      </div>
    );
  };
  
  // Render exam results
  const renderExamResults = () => {
    if (showExamReview) {
      return renderExamReview();
    }
    
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-center">Exam Completed!</CardTitle>
          <CardDescription className="text-center">
            {examScore >= 80 
              ? "Excellent work! You've mastered this material." 
              : examScore >= 60 
                ? "Good progress! But there's still room for improvement." 
                : "You might need more study time with this material."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-6">
          <div className="w-32 h-32 rounded-full bg-blue-50 flex items-center justify-center mb-4">
            <h2 className="text-3xl font-bold text-blue-600">
              {examScore}%
            </h2>
          </div>
          <Progress 
            value={examScore} 
            className="w-full max-w-xs mb-4" 
          />
          
          <div className="w-full max-w-md mt-4">
            <h3 className="font-medium mb-3">Performance by Topic</h3>
            <ScrollArea className="h-40 w-full">
              <div className="space-y-3">
                {Object.entries(scoreByTopic).map(([topic, stats], index) => {
                  const topicScore = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
                  return (
                    <div 
                      key={index}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-md border"
                    >
                      <div className="font-medium">{topic}</div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center text-sm text-gray-700">
                          <Check className="h-4 w-4 text-green-500 mr-1" />
                          {stats.correct} / {stats.total}
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`${
                            topicScore >= 80
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : topicScore >= 60
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-red-50 text-red-700 border-red-200'
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
            
            {weakAreas.length > 0 && (
              <div className="mt-6">
                <h3 className="font-medium mb-3">Areas to Review</h3>
                <div className="space-y-2">
                  {weakAreas.map((area, index) => (
                    <div 
                      key={index}
                      className="p-3 bg-amber-50 rounded-md border border-amber-200 text-sm"
                    >
                      <div className="flex justify-between">
                        <span className="font-medium text-amber-800">
                          {area.topic}
                        </span>
                        <Badge 
                          variant="outline" 
                          className="bg-amber-100 text-amber-800 border-amber-300"
                        >
                          {Math.round(area.correctRate * 100)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mt-6">
              <h3 className="font-medium mb-3">Stats</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-blue-50 rounded-md border border-blue-100 flex flex-col items-center">
                  <Target className="h-5 w-5 text-blue-600 mb-1" />
                  <div className="text-xs text-blue-700">Accuracy</div>
                  <div className="font-medium text-blue-900">{examScore}%</div>
                </div>
                <div className="p-3 bg-blue-50 rounded-md border border-blue-100 flex flex-col items-center">
                  <Clock className="h-5 w-5 text-blue-600 mb-1" />
                  <div className="text-xs text-blue-700">Time Used</div>
                  <div className="font-medium text-blue-900">
                    {formatTime((examSettings.timeLimit * 60) - remainingTimeSeconds)}
                  </div>
                </div>
                <div className="p-3 bg-blue-50 rounded-md border border-blue-100 flex flex-col items-center">
                  <CheckCircle className="h-5 w-5 text-blue-600 mb-1" />
                  <div className="text-xs text-blue-700">Completion</div>
                  <div className="font-medium text-blue-900">
                    {Math.round((session.answers.length / questions.length) * 100)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center gap-3">
          <Button variant="outline" onClick={handleReviewExam}>
            Review Answers
          </Button>
          <Button variant="outline" onClick={restartExam}>
            <RotateCcw className="h-4 w-4 mr-2" />
            New Exam
          </Button>
          <Button onClick={onExit}>
            Exit
          </Button>
        </CardFooter>
      </Card>
    );
  };
  
  // Render exam review
  const renderExamReview = () => {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">
              Review: Question {reviewQuestionIndex + 1} of {questions.length}
            </CardTitle>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Score: {examScore}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
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
                              ? 'border-green-500 bg-green-50'
                              : answer && option === answer.userAnswer && option !== question.correctAnswer
                                ? 'border-red-500 bg-red-50'
                                : 'bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center">
                            {option === question.correctAnswer ? (
                              <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                            ) : answer && option === answer.userAnswer ? (
                              <X className="h-4 w-4 text-red-500 mr-2 flex-shrink-0" />
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
                              ? 'border-green-500 bg-green-50'
                              : answer && option === answer.userAnswer && option !== question.correctAnswer
                                ? 'border-red-500 bg-red-50'
                                : 'bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-center">
                            {option === question.correctAnswer ? (
                              <Check className="h-4 w-4 text-green-500 mr-2" />
                            ) : answer && option === answer.userAnswer ? (
                              <X className="h-4 w-4 text-red-500 mr-2" />
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
                      <div className="p-3 bg-gray-50 rounded-md border">
                        <div className="font-medium text-sm mb-1">Your Answer:</div>
                        <div>{answer?.userAnswer || 'Not answered'}</div>
                      </div>
                      
                      <div className="p-3 bg-green-50 rounded-md border border-green-200">
                        <div className="font-medium text-sm text-green-800 mb-1">Correct Answer:</div>
                        <div className="text-green-700">{question.correctAnswer}</div>
                      </div>
                    </div>
                  )}
                  
                  {/* Explanation */}
                  {question.explanation && (
                    <div className="p-4 bg-blue-50 rounded-md border border-blue-100 mt-6">
                      <div className="flex items-start">
                        <AlertCircle className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-medium text-blue-800">Explanation</h4>
                          <p className="text-sm mt-1 text-blue-700">{question.explanation}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Topic and Source */}
                  <div className="flex flex-wrap gap-3 mt-6">
                    {question.topic && (
                      <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                        Topic: {question.topic}
                      </Badge>
                    )}
                    
                    {question.sourceChunk && (
                      <div className="w-full mt-2 p-3 bg-gray-50 rounded-md border border-gray-200 text-sm text-gray-700">
                        <div className="font-medium text-gray-600 text-xs mb-1">Source:</div>
                        <span className="italic">"{question.sourceChunk}"</span>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={handleExitReview}
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
        </CardFooter>
      </Card>
    );
  };
  
  // Loading state
  if (isLoadingChunks) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <div className="text-lg font-medium text-gray-700">Preparing exam materials...</div>
        <div className="text-sm text-gray-500 mt-2">This may take a few moments</div>
      </div>
    );
  }
  
  // Main render logic
  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      {!showSetup && !isExamComplete && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold">
              {document.title}
            </h2>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center">
              <Brain className="h-4 w-4 mr-1.5" />
              <span>Exam Mode</span>
            </Badge>
          </div>
        </div>
      )}
      
      {/* Content based on state */}
      {showSetup && renderExamSetup()}
      {!showSetup && !isExamComplete && renderExamTaking()}
      {!showSetup && !isExamComplete && renderExamNavigation()}
      {isExamComplete && renderExamResults()}
    </div>
  );
};

export default ExamSimulation;