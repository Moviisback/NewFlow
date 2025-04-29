'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Brain, 
  Timer, 
  Target, 
  Check, 
  HelpCircle, 
  BookOpen, 
  Zap, 
  Award, 
  ChevronDown, 
  ChevronUp,
  Lightbulb,
  Plus
} from 'lucide-react';

// Types
interface Document {
  id: string;
  name: string;
  topics: string[];
  fileSize?: string;
}

interface QuizPreset {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

interface QuestionType {
  id: string;
  name: string;
  description: string;
}

interface Question {
  question: string;
  options?: string[];
  correctAnswer: string;
  type: string;
  difficulty: string;
  sourcePage?: number;
  explanation?: string;
}

interface Quiz {
  questions: Question[];
  glossary?: string[];
}

const QuizScreen = () => {
  const { toast } = useToast();
  
  // Document selection state
  const [isDocumentSelectionStep, setIsDocumentSelectionStep] = useState(true);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  
  // General quiz settings
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [questionType, setQuestionType] = useState('mix');
  const [difficultyLevel, setDifficultyLevel] = useState(50);
  const [questionCount, setQuestionCount] = useState(5);
  const [timeLimit, setTimeLimit] = useState(10);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  
  // Generation and quiz state
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1: document selection, 2: quiz setup, 3: quiz
  
  // Data states
  const [documents, setDocuments] = useState<Document[]>([]);
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [presets, setPresets] = useState<QuizPreset[]>([]);
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>([]);
  
  // Enhanced features
  const [flagConfusingTerms, setFlagConfusingTerms] = useState(true);
  const [addBrainBoost, setAddBrainBoost] = useState(false);

  // Fetch initial data - using a more efficient approach
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingDocuments(true);
      try {
        // Use Promise.all to fetch data in parallel
        const [docsResponse, presetsResponse, typesResponse] = await Promise.all([
          fetch('/api/user/documents'),
          fetch('/api/quiz/presets'),
          fetch('/api/quiz/question-types')
        ]);
        
        // Process documents data
        if (docsResponse.ok) {
          const docsData = await docsResponse.json();
          setDocuments(docsData.documents || []);
          
          // Extract all available topics from documents
          const topics = new Set<string>();
          docsData.documents?.forEach((doc: Document) => {
            doc.topics?.forEach(topic => topics.add(topic));
          });
          setAvailableTopics(Array.from(topics));
        }
        
        // Process presets data
        if (presetsResponse.ok) {
          const presetsData = await presetsResponse.json();
          setPresets(presetsData.presets || defaultPresets);
        }
        
        // Process question types data
        if (typesResponse.ok) {
          const typesData = await typesResponse.json();
          setQuestionTypes(typesData.types || defaultQuestionTypes);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error loading data",
          description: "Failed to load your documents and quiz options.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingDocuments(false);
      }
    };
    
    fetchData();
  }, [toast]);

  // Default data in case APIs fail
  const defaultPresets: QuizPreset[] = [
    {
      id: 'quick',
      name: 'Quick Review',
      description: 'Fast 5-minute quiz',
      icon: <Timer className="h-4 w-4 text-blue-500" />
    },
    {
      id: 'comprehensive',
      name: 'Deep Dive',
      description: 'Thorough understanding',
      icon: <Brain className="h-4 w-4 text-purple-500" />
    },
    {
      id: 'test',
      name: 'Test Prep',
      description: 'Exam simulation',
      icon: <Target className="h-4 w-4 text-red-500" />
    }
  ];
  
  const defaultQuestionTypes: QuestionType[] = [
    { id: 'multiple_choice', name: 'Multiple Choice', description: 'Select from options' },
    { id: 'true_false', name: 'True/False', description: 'Verify statements' },
    { id: 'short_answer', name: 'Short Answer', description: 'Brief responses' },
    { id: 'mix', name: 'Mixed', description: 'Various question types' }
  ];

  // Update quiz settings when preset is selected - with error handling
  useEffect(() => {
    if (!activePreset) return;
    
    const selectedPreset = presets.find(p => p.id === activePreset);
    if (!selectedPreset) return;
    
    const fetchPresetSettings = async () => {
      try {
        const response = await fetch(`/api/quiz/presets/${activePreset}`);
        if (response.ok) {
          const settings = await response.json();
          setQuestionCount(settings.questionCount || 5);
          setTimeLimit(settings.timeLimit || 10);
          setQuestionType(settings.questionType || 'mix');
          setDifficultyLevel(settings.difficultyLevel || 50);
        }
      } catch (error) {
        console.error('Error fetching preset settings:', error);
        // Fallback to reasonable defaults if API fails
        setQuestionCount(5);
        setTimeLimit(10);
        setQuestionType('mix');
        setDifficultyLevel(50);
      }
    };
    
    fetchPresetSettings();
  }, [activePreset, presets]);

  // Calculate readiness percentage based on selections
  const calculateReadiness = () => {
    if (selectedDocuments.length === 0) return 0;
    
    let readiness = 50; // Document selected gives 50% ready
    if (selectedTopics.length > 0) readiness += 20;
    if (questionType) readiness += 10;
    if (difficultyLevel > 0) readiness += 10;
    if (questionCount > 0) readiness += 10;
    return Math.min(100, readiness);
  };

  // Format difficulty level as text
  const getDifficultyText = () => {
    if (difficultyLevel < 30) return "Basic Recall (Grade C)";
    if (difficultyLevel < 60) return "Moderate (Grade B)";
    if (difficultyLevel < 85) return "Critical Analysis (Grade A)";
    return "Expert Level (Grade A+)";
  };

  // Format difficulty as visual meter
  const getDifficultyMeter = () => {
    if (difficultyLevel < 30) return "▰▱▱▱▱";
    if (difficultyLevel < 60) return "▰▰▱▱▱";
    if (difficultyLevel < 85) return "▰▰▰▱▱";
    return "▰▰▰▰▰";
  };

  // Handle document selection with debounce for performance
  const handleDocumentSelection = (docId: string) => {
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;
    
    setSelectedDocuments(prev => {
      if (prev.includes(docId)) {
        return prev.filter(id => id !== docId);
      } else {
        return [...prev, docId];
      }
    });
    
    // Update available topics based on selected documents
    updateAvailableTopicsFromDocuments();
  };
  
  // Update available topics when documents change
  const updateAvailableTopicsFromDocuments = () => {
    const selectedDocs = documents.filter(doc => selectedDocuments.includes(doc.id));
    const availableTopicsSet = new Set<string>();
    
    selectedDocs.forEach(doc => {
      doc.topics?.forEach(topic => availableTopicsSet.add(topic));
    });
    
    // Keep only topics that are available from selected documents
    setSelectedTopics(prev => prev.filter(topic => availableTopicsSet.has(topic)));
  };

  // Toggle individual topic selection with proper state management
  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev => {
      if (prev.includes(topic)) {
        return prev.filter(t => t !== topic);
      } else {
        return [...prev, topic];
      }
    });
  };

  // Proceed from document selection to quiz setup
  const proceedToQuizSetup = () => {
    if (selectedDocuments.length === 0) {
      toast({
        title: "No documents selected",
        description: "Please select at least one document to continue.",
        variant: "warning",
      });
      return;
    }
    
    setIsDocumentSelectionStep(false);
    setCurrentStep(2);
  };

  // Generate quiz handler with improved error handling and feedback
  const generateQuiz = async () => {
    if (selectedTopics.length === 0) {
      toast({
        title: "No topics selected",
        description: "Please select at least one topic for your quiz.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30-second timeout
      
      const response = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topics: selectedTopics,
          documentIds: selectedDocuments,
          questionType,
          difficultyLevel,
          questionCount,
          timeLimit,
          flagConfusingTerms,
          addBrainBoost,
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const quizData = await response.json();
        setQuiz(quizData);
        setCurrentQuestion(0);
        setSelectedAnswer(null);
        setScore(0);
        setShowFeedback(false);
        setQuizCompleted(false);
        setCurrentStep(3);
      } else {
        const error = await response.json();
        toast({
          title: "Error generating quiz",
          description: error.message || "Failed to generate quiz. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error generating quiz:', error);
      
      if (error instanceof DOMException && error.name === 'AbortError') {
        toast({
          title: "Request timeout",
          description: "Quiz generation is taking too long. Please try again with fewer questions.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Network error",
          description: "Failed to connect to the server. Please check your connection.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle answer selection for quiz
  const handleAnswerSelection = (answer: string) => {
    if (showFeedback) return;
    setSelectedAnswer(answer);
  };

  // Handle next question logic with error handling for saving results
  const handleNextQuestion = async () => {
    if (!quiz) return;
    
    // If we have feedback showing, proceed to next question
    if (showFeedback) {
      setShowFeedback(false);
      setSelectedAnswer(null);
      if (currentQuestion < quiz.questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        setQuizCompleted(true);
        
        // Save quiz results to server with error handling
        try {
          await fetch('/api/quiz/save-results', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              score,
              totalQuestions: quiz.questions.length,
              topics: selectedTopics,
            }),
          });
        } catch (error) {
          console.error('Error saving quiz results:', error);
          // Don't show error to user since this is non-critical
        }
      }
      return;
    }
    
    // First time clicking next - check answer and show feedback
    if (selectedAnswer === quiz.questions[currentQuestion].correctAnswer) {
      setScore(score + 1);
    }
    setShowFeedback(true);
  };

  // Reset quiz state
  const handleResetQuiz = () => {
    setQuiz(null);
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setScore(0);
    setShowFeedback(false);
    setQuizCompleted(false);
    setIsDocumentSelectionStep(true);
    setCurrentStep(1);
    setSelectedDocuments([]);
    setSelectedTopics([]);
  };

  // Document selection screen - optimized for mobile
  const renderDocumentSelector = () => {
    if (isLoadingDocuments) {
      return (
        <div className="flex items-center justify-center py-6">
          <Icons.loader className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading your documents...</span>
        </div>
      );
    }
    
    if (documents.length === 0) {
      return (
        <div className="text-center py-6">
          <FileText className="h-12 w-12 mx-auto text-gray-300" />
          <p className="mt-2 text-gray-500">No documents found. Upload study materials first.</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => window.location.href = '/dashboard'}
          >
            Go to Dashboard to Upload
          </Button>
        </div>
      );
    }
    
    return (
      <div className="space-y-2">
        <ScrollArea className="h-64 md:h-80 border rounded-md p-2">
          <div className="grid grid-cols-1 gap-2">
            {documents.map(doc => (
              <div 
                key={doc.id} 
                className={`flex items-center p-3 rounded-md cursor-pointer border transition-colors ${
                  selectedDocuments.includes(doc.id) 
                    ? 'border-primary bg-primary/5' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleDocumentSelection(doc.id)}
              >
                <FileText className="h-5 w-5 mr-3 flex-shrink-0 text-blue-500" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{doc.name}</p>
                  {doc.topics?.length > 0 && (
                    <p className="text-xs text-gray-500 truncate">
                      Topics: {doc.topics.join(', ')}
                    </p>
                  )}
                  {doc.fileSize && (
                    <p className="text-xs text-gray-400">
                      {doc.fileSize}
                    </p>
                  )}
                </div>
                {selectedDocuments.includes(doc.id) && (
                  <div className="ml-2 flex-shrink-0 bg-primary text-white p-1 rounded-full">
                    <Check className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  };

  // Quiz setup screen
  const renderQuizSetup = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Document Selection Summary */}
          <div>
            <div className="flex justify-between mb-2">
              <Label>Selected Documents</Label>
              <span className="text-xs text-gray-500">
                {selectedDocuments.length} selected
              </span>
            </div>
            <ScrollArea className="h-24 border rounded-md p-2">
              <div className="space-y-1">
                {selectedDocuments.length > 0 ? (
                  documents
                    .filter(doc => selectedDocuments.includes(doc.id))
                    .map(doc => (
                      <div key={doc.id} className="flex items-center justify-between px-2 py-1 text-sm">
                        <div className="flex items-center">
                          <FileText className="h-3 w-3 mr-2 text-blue-500" />
                          <span className="truncate max-w-64">{doc.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDocumentSelection(doc.id);
                          }}
                        >
                          <span className="sr-only">Remove</span>
                          <span className="text-red-500">×</span>
                        </Button>
                      </div>
                    ))
                ) : (
                  <p className="text-center text-sm text-gray-500 py-6">
                    No documents selected
                  </p>
                )}
              </div>
            </ScrollArea>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 text-xs"
              onClick={() => setCurrentStep(1)}
            >
              Change Documents
            </Button>
          </div>
          
          {/* Topic Selection */}
          <div>
            <div className="flex justify-between mb-2">
              <Label>Topics</Label>
              <span className="text-xs text-gray-500">
                {selectedTopics.length} selected
              </span>
            </div>
            <ScrollArea className="h-32 border rounded-md p-2">
              {availableTopics.length > 0 ? (
                <div className="flex flex-wrap gap-2 p-1">
                  {availableTopics.map(topic => (
                    <Badge 
                      key={topic}
                      variant={selectedTopics.includes(topic) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleTopic(topic)}
                    >
                      {topic}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-2">
                  No topics available from selected documents.
                </p>
              )}
            </ScrollArea>
          </div>
          
          {/* Preset Selection */}
          <div>
            <Label className="block mb-2">Quiz Preset</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {presets.map(preset => (
                <div
                  key={preset.id}
                  className={`flex items-center p-2 rounded-md border cursor-pointer transition-colors ${
                    activePreset === preset.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setActivePreset(preset.id)}
                >
                  <div className="mr-2">
                    {preset.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{preset.name}</p>
                    <p className="text-xs text-gray-500">{preset.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          {/* Question Type */}
          <div>
            <Label className="block mb-2">Question Type</Label>
            <div className="flex flex-wrap gap-2">
              {questionTypes.map(type => (
                <Badge
                  key={type.id}
                  variant={questionType === type.id ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setQuestionType(type.id)}
                >
                  {type.name}
                </Badge>
              ))}
            </div>
          </div>
          
          {/* Difficulty Slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Difficulty</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                      {getDifficultyMeter()} {getDifficultyText()}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Harder questions boost mastery 2x faster!</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Slider
              value={[difficultyLevel]}
              min={0}
              max={100}
              step={1}
              onValueChange={([value]) => setDifficultyLevel(value)}
              className="my-4"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Basic Recall</span>
              <span>Critical Analysis</span>
            </div>
          </div>
          
          {/* Question Count */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Number of Questions</Label>
              <span className="text-xs text-gray-500">{questionCount} questions</span>
            </div>
            <Slider
              value={[questionCount]}
              min={1}
              max={20}
              step={1}
              onValueChange={([value]) => setQuestionCount(value)}
              className="my-4"
            />
          </div>
          
          {/* Time Limit */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Time Limit</Label>
              <span className="text-xs text-gray-500">{timeLimit} minutes</span>
            </div>
            <Slider
              value={[timeLimit]}
              min={1}
              max={60}
              step={1}
              onValueChange={([value]) => setTimeLimit(value)}
              className="my-4"
            />
          </div>
          
          {/* Enhanced Features */}
          <div>
            <Button 
              variant="ghost" 
              className="flex items-center justify-between w-full px-0"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            >
              <span className="text-sm font-medium">Advanced Settings</span>
              {isAdvancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            
            {isAdvancedOpen && (
              <div className="space-y-3 mt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Label htmlFor="flag-terms" className="mr-2">Flag confusing terms</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Automatically generates a glossary for difficult terms</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Switch
                    id="flag-terms"
                    checked={flagConfusingTerms}
                    onCheckedChange={setFlagConfusingTerms}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Label htmlFor="brain-boost" className="mr-2">Add Brain Boost Question</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Adds 1 expert-level question (+5 XP)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Switch
                    id="brain-boost"
                    checked={addBrainBoost}
                    onCheckedChange={setAddBrainBoost}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Quiz content screen with performance optimizations
  const renderQuizContent = () => {
    if (!quiz) return null;
    
    if (quizCompleted) {
      return (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-center">Quiz Completed!</CardTitle>
            <CardDescription className="text-center">Your Score</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <h2 className="text-3xl font-bold text-primary">
                {score} / {quiz.questions.length}
              </h2>
            </div>
            <Progress 
              value={(score / quiz.questions.length) * 100} 
              className="w-full max-w-xs mb-4" 
            />
            <p className="mt-2 text-center">
              {score === quiz.questions.length 
                ? "Perfect score! Excellent work! 🎉" 
                : score >= quiz.questions.length * 0.7 
                  ? "Great job! Keep practicing! 👍" 
                  : "Keep learning! You'll improve with practice. 💪"}
            </p>
            
            {/* Display glossary if available */}
            {quiz.glossary && quiz.glossary.length > 0 && (
              <div className="mt-6 w-full max-w-md">
                <h3 className="font-medium mb-2 flex items-center">
                  <BookOpen className="h-4 w-4 mr-1" />
                  Glossary
                </h3>
                <ScrollArea className="h-40 border rounded-md p-3">
                  {quiz.glossary.map((term, index) => (
                    <div key={index} className="mb-2 pb-2 border-b last:border-0">
                      <p className="text-sm">{term}</p>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}
            
            <Button onClick={handleResetQuiz} className="mt-6">
              Create New Quiz
            </Button>
          </CardContent>
        </Card>
      );
    }
    
    const question = quiz.questions[currentQuestion];
    
    return (
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Question {currentQuestion + 1} / {quiz.questions.length}
            </CardTitle>
            <Badge variant="outline" className="capitalize">
              {question.difficulty}
            </Badge>
          </div>
          <CardDescription className="text-base font-medium mt-3">
            {question.question}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {question.options?.map((option) => (
              <Button
                key={option}
                variant={selectedAnswer === option ? 'secondary' : 'outline'}
                className={`w-full text-left justify-start px-4 py-3 h-auto ${
                  showFeedback && option === question.correctAnswer 
                    ? 'border-green-500 bg-green-50' 
                    : showFeedback && option === selectedAnswer && option !== question.correct
                    ? 'border-green-500 bg-green-50' 
                    : showFeedback && option === selectedAnswer && option !== question.correctAnswer
                      ? 'border-red-500 bg-red-50'
                      : ''
                }`}
                onClick={() => handleAnswerSelection(option)}
                disabled={showFeedback}
              >
                {showFeedback && option === question.correctAnswer && (
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                )}
                {showFeedback && option === selectedAnswer && option !== question.correctAnswer && (
                  <Icons.close className="h-4 w-4 mr-2 text-red-500" />
                )}
                <span>{option}</span>
              </Button>
            ))}
            
            {question.type === 'short_answer' && (
              <div className="space-y-2">
                <textarea
                  className="w-full border rounded-md p-3 min-h-24 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Type your answer here..."
                  value={selectedAnswer || ''}
                  onChange={(e) => handleAnswerSelection(e.target.value)}
                  disabled={showFeedback}
                />
              </div>
            )}
          </div>

          {showFeedback && (
            <div className="mt-6 p-4 bg-primary/5 rounded-md border">
              <div className="flex items-start">
                <Lightbulb className="h-5 w-5 text-primary mr-2 mt-0.5" />
                <div>
                  <h4 className="font-medium">Explanation</h4>
                  <p className="text-sm mt-1">{question.explanation || "The correct answer is: " + question.correctAnswer}</p>
                  
                  {question.sourcePage && (
                    <p className="text-xs text-gray-500 mt-2">
                      Source: Page {question.sourcePage}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="flex items-center">
            <Badge variant="outline" className="mr-2">
              <Award className="h-3 w-3 mr-1" />
              <span>{score} / {currentQuestion + (showFeedback ? 1 : 0)}</span>
            </Badge>
            {timeLimit > 0 && (
              <Badge variant="outline">
                <Timer className="h-3 w-3 mr-1" />
                <span>{timeLimit} min</span>
              </Badge>
            )}
          </div>
          <Button onClick={handleNextQuestion}>
            {showFeedback 
              ? currentQuestion < quiz.questions.length - 1 
                ? "Next Question" 
                : "View Results"
              : "Check Answer"
            }
          </Button>
        </CardFooter>
      </Card>
    );
  };

  // Render loading state for quiz generation
  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center py-12">
      <Icons.loader className="h-12 w-12 animate-spin mb-4" />
      <h3 className="text-lg font-medium">Generating Your Quiz</h3>
      <p className="text-gray-500 text-center max-w-xs mt-2">
        Creating intelligent questions based on your selected topics and documents...
      </p>
    </div>
  );

  // Main render function with optimized rendering flow
  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <Brain className="h-6 w-6 mr-2 text-primary" />
          Quiz Builder
        </h1>
        <p className="text-gray-500">Generate intelligent quizzes from your study materials</p>
      </div>
      
      {/* Progress Stepper */}
      <div className="mb-6">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep >= 1 ? 'bg-primary text-white' : 'bg-gray-200'
            }`}>
              1
            </div>
            <span className="text-xs mt-1">Documents</span>
          </div>
          <div className={`h-1 flex-1 mx-1 ${currentStep >= 2 ? 'bg-primary' : 'bg-gray-200'}`} />
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep >= 2 ? 'bg-primary text-white' : 'bg-gray-200'
            }`}>
              2
            </div>
            <span className="text-xs mt-1">Setup</span>
          </div>
          <div className={`h-1 flex-1 mx-1 ${currentStep >= 3 ? 'bg-primary' : 'bg-gray-200'}`} />
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep >= 3 ? 'bg-primary text-white' : 'bg-gray-200'
            }`}>
              3
            </div>
            <span className="text-xs mt-1">Quiz</span>
          </div>
        </div>
      </div>
      
      {/* Main Content Area */}
      {isLoading ? (
        renderLoading()
      ) : (
        <>
          {currentStep === 1 && (
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Select Study Materials</CardTitle>
                <CardDescription>
                  Choose the documents you want to include in your quiz
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderDocumentSelector()}
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button 
                  onClick={proceedToQuizSetup}
                  disabled={selectedDocuments.length === 0}
                >
                  Continue
                </Button>
              </CardFooter>
            </Card>
          )}
          
          {currentStep === 2 && (
            <Card className="shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Customize Your Quiz</CardTitle>
                    <CardDescription>
                      Select topics and adjust difficulty
                    </CardDescription>
                  </div>
                  <div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <div className="flex items-center">
                            <Progress value={calculateReadiness()} className="w-16 h-2 mr-2" />
                            <span className="text-xs font-medium">{calculateReadiness()}% Ready</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Complete setup to generate quiz</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {renderQuizSetup()}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setCurrentStep(1);
                    setIsDocumentSelectionStep(true);
                  }}
                >
                  Back
                </Button>
                <Button 
                  onClick={generateQuiz}
                  disabled={selectedTopics.length === 0 || calculateReadiness() < 80}
                >
                  Generate Quiz
                </Button>
              </CardFooter>
            </Card>
          )}
          
          {currentStep === 3 && renderQuizContent()}
        </>
      )}
      
      {/* Feature Highlight */}
      {currentStep !== 3 && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center mb-2">
                <Zap className="h-5 w-5 text-yellow-500 mr-2" />
                <h3 className="font-medium">Smart Questions</h3>
              </div>
              <p className="text-sm text-gray-500">
                AI-generated questions target comprehension and critical thinking.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center mb-2">
                <Brain className="h-5 w-5 text-purple-500 mr-2" />
                <h3 className="font-medium">Spaced Repetition</h3>
              </div>
              <p className="text-sm text-gray-500">
                Questions adapt to your learning progress over time.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center mb-2">
                <BookOpen className="h-5 w-5 text-blue-500 mr-2" />
                <h3 className="font-medium">Detailed Explanations</h3>
              </div>
              <p className="text-sm text-gray-500">
                Learn why answers are correct with comprehensive explanations.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Add New Quick Quiz button */}
      {currentStep !== 3 && (
        <div className="fixed bottom-6 right-6">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button className="h-12 w-12 rounded-full shadow-lg" disabled={selectedDocuments.length === 0}>
                  <Plus className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Quick Quiz (5 questions)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
};

export default QuizScreen;