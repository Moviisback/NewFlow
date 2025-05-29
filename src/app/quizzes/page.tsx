'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  BookOpen, 
  Brain, 
  Target, 
  CheckCircle2, 
  GraduationCap, 
  ChevronRight, 
  CalendarClock, 
  BarChart3,
  Plus,
  Loader,
  RotateCcw,
  X
} from 'lucide-react';

// Import components
import QuizSelection from '@/components/quiz/QuizSelection';
import PreparationModeModal from '@/components/quiz/PreparationModeModal';
import ExamSimulationModal from '@/components/quiz/ExamSimulationModal';

// Import types
import { LibraryItem } from '@/components/documents/types';
import { PreparationSession, ExamSession, LearningProgress } from '@/types/quizTypes';
import { loadLibraryFromStorage } from '@/components/documents/fileHelpers';

// Hard-coded recent quizzes for initial UI (in a real app, these would come from an API)
const RECENT_QUIZZES = [
  {
    id: 1,
    title: 'Cell Biology Exam',
    documentTitle: 'Cell Structure & Function.pdf',
    mode: 'exam',
    date: 'May 14, 2025',
    score: 85,
    questionCount: 20,
    timeSpent: '18:45'
  },
  {
    id: 2,
    title: 'Psychology Concepts',
    documentTitle: 'Cognitive Psychology Exam Notes',
    mode: 'preparation',
    date: 'May 12, 2025',
    progress: 100,
    chunksCompleted: 8,
    totalChunks: 8,
    score: 72
  },
  {
    id: 3,
    title: 'Data Science Preparation',
    documentTitle: 'Statistics for Data Science Report.docx',
    mode: 'preparation',
    date: 'May 10, 2025',
    progress: 60,
    chunksCompleted: 3,
    totalChunks: 5,
    score: 88
  }
];

// Mock function to load learning progress (in a real app, this would come from a database)
const loadLearningProgress = (documentId: number): LearningProgress => {
  // This is just a mock implementation
  return {
    documentId,
    masteredChunks: [0, 1],
    weakAreas: [
      { chunkIndex: 2, topic: 'Mitochondria', correctRate: 0.5 },
      { chunkIndex: 3, topic: 'Cell Division', correctRate: 0.4 }
    ],
    masteredQuestions: ['q_123', 'q_124', 'q_125'],
    reviewQuestions: []
  };
};

export default function QuizzesPage() {
  const { toast } = useToast();
  
  // UI State
  const [activeTab, setActiveTab] = useState<string>('recent');
  const [quizzes, setQuizzes] = useState<any[]>(RECENT_QUIZZES);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState<boolean>(false);
  
  // Library state
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState<boolean>(false);
  
  // Quiz selection state
  const [showQuizSelection, setShowQuizSelection] = useState<boolean>(false);
  const [selectedDocument, setSelectedDocument] = useState<LibraryItem | null>(null);
  const [selectedMode, setSelectedMode] = useState<'preparation' | 'exam' | null>(null);
  const [learningProgress, setLearningProgress] = useState<LearningProgress | undefined>(undefined);
  
  // Modal state
  const [isPreparationModalOpen, setIsPreparationModalOpen] = useState<boolean>(false);
  const [isExamModalOpen, setIsExamModalOpen] = useState<boolean>(false);
  const [showExitConfirmation, setShowExitConfirmation] = useState<boolean>(false);
  
  // Fetch quizzes
  useEffect(() => {
    const fetchQuizzes = async () => {
      setIsLoadingQuizzes(true);
      try {
        const response = await fetch('/api/quizzes');
        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data)) {
            setQuizzes(data);
          }
        }
      } catch (error) {
        console.error('Error fetching quizzes:', error);
      } finally {
        setIsLoadingQuizzes(false);
      }
    };
    
    // Uncomment to fetch from API when it's ready
    // fetchQuizzes();
  }, []);
  
  // Fetch library
  useEffect(() => {
    const fetchLibrary = async () => {
      setIsLoadingLibrary(true);
      
      try {
        // Directly load from localStorage using existing helper
        const documents = loadLibraryFromStorage();
        if (documents && documents.length > 0) {
          console.log('Loaded library from localStorage:', documents.length, 'items');
          setLibrary(documents);
        } else {
          console.log('No documents found in localStorage');
        }
      } catch (error) {
        console.error('Error loading documents:', error);
      } finally {
        setIsLoadingLibrary(false);
      }
    };
    
    fetchLibrary();
  }, []);
  
  // Handle starting a new quiz
  const handleStartNewQuiz = () => {
    setShowQuizSelection(true);
    setSelectedDocument(null);
    setSelectedMode(null);
  };
  
  // Handle document selection
  const handleDocumentSelect = (document: LibraryItem) => {
    setSelectedDocument(document);
    
    // Load learning progress for this document
    if (document.id) {
      const progress = loadLearningProgress(document.id);
      setLearningProgress(progress);
    }
  };
  
  // Handle mode selection
  const handleModeSelect = (mode: 'preparation' | 'exam') => {
    setSelectedMode(mode);
  };
  
  // Handle quiz start - open appropriate modal
  const handleStartQuiz = () => {
    if (!selectedDocument) {
      toast({
        title: "No document selected",
        description: "Please select a document to study.",
        variant: "destructive",
      });
      return;
    }
    
    if (!selectedMode) {
      toast({
        title: "No mode selected",
        description: "Please select a study mode.",
        variant: "destructive",
      });
      return;
    }
    
    // Open the appropriate modal based on selected mode
    if (selectedMode === 'preparation') {
      setIsPreparationModalOpen(true);
    } else if (selectedMode === 'exam') {
      setIsExamModalOpen(true);
    }
  };
  
  // Handle quiz completion
  const handleQuizComplete = (session: PreparationSession | ExamSession) => {
    // In a real app, you would save the session to the database
    console.log('Quiz completed:', session);
    
    // Update quizzes list
    setQuizzes(prev => [
      {
        id: Date.now(),
        title: session.documentTitle,
        documentTitle: session.documentTitle,
        mode: session.mode,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        score: session.score,
        ...(session.mode === 'preparation' ? {
          progress: 100,
          chunksCompleted: (session as PreparationSession).totalChunks,
          totalChunks: (session as PreparationSession).totalChunks
        } : {
          questionCount: (session as ExamSession).questions.length,
          timeSpent: '20:00' // This would come from the session in a real app
        })
      },
      ...prev
    ]);
    
    // Close modals
    setIsPreparationModalOpen(false);
    setIsExamModalOpen(false);
    
    // Exit quiz selection
    setShowQuizSelection(false);
    setSelectedDocument(null);
    setSelectedMode(null);
    setActiveTab('recent');
    
    toast({
      title: "Quiz completed!",
      description: `Your score: ${session.score}%`,
    });
  };
  
  // Handle quiz exit
  const handleQuizExit = () => {
    // If a modal is open, confirm before closing
    if (isPreparationModalOpen || isExamModalOpen) {
      setShowExitConfirmation(true);
      return;
    }
    
    // Otherwise, just close the selection screen
    setShowQuizSelection(false);
    setSelectedDocument(null);
    setSelectedMode(null);
    
    // Ensure modals are closed
    setIsPreparationModalOpen(false);
    setIsExamModalOpen(false);
  };
  
  // Confirm exit from quiz
  const confirmExit = () => {
    setIsPreparationModalOpen(false);
    setIsExamModalOpen(false);
    setShowExitConfirmation(false);
    setShowQuizSelection(false);
    setSelectedDocument(null);
    setSelectedMode(null);
  };
  
  // Cancel exit from quiz
  const cancelExit = () => {
    setShowExitConfirmation(false);
  };
  
  // Render recent quizzes list
  const renderRecentQuizzes = () => {
    if (isLoadingQuizzes) {
      return (
        <div className="flex justify-center items-center py-12">
          <Loader className="h-8 w-8 animate-spin" />
        </div>
      );
    }
    
    if (quizzes.length === 0) {
      return (
        <div className="text-center py-12">
          <GraduationCap className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <h3 className="text-lg font-medium text-gray-700 mb-1">No quizzes yet</h3>
          <p className="text-gray-500 mb-4">Start your first quiz to begin tracking your progress.</p>
          <Button onClick={handleStartNewQuiz}>
            <Plus className="h-4 w-4 mr-2" />
            Start New Quiz
          </Button>
        </div>
      );
    }
    
    return (
      <div className="grid gap-4">
        {quizzes.map((quiz) => (
          <Card key={quiz.id} className="overflow-hidden bg-white dark:bg-gray-800 shadow-sm hover:shadow transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-medium text-lg text-gray-900 dark:text-gray-100">{quiz.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{quiz.documentTitle}</p>
                </div>
                <Badge 
                  variant="outline"
                  className={`${
                    quiz.mode === 'exam' 
                      ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' 
                      : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                  }`}
                >
                  {quiz.mode === 'exam' ? (
                    <Target className="h-3.5 w-3.5 mr-1" />
                  ) : (
                    <Brain className="h-3.5 w-3.5 mr-1" />
                  )}
                  <span>{quiz.mode === 'exam' ? 'Exam' : 'Preparation'}</span>
                </Badge>
              </div>
              
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-3">
                <CalendarClock className="h-3.5 w-3.5 mr-1" />
                <span>{quiz.date}</span>
              </div>
              
              {quiz.mode === 'exam' ? (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Score</div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{quiz.score}%</div>
                  </div>
                  <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Questions</div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{quiz.questionCount}</div>
                  </div>
                  <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Time</div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{quiz.timeSpent}</div>
                  </div>
                </div>
              ) : (
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Progress (Sections {quiz.chunksCompleted}/{quiz.totalChunks})
                    </div>
                    <div className="text-xs font-medium text-gray-900 dark:text-gray-100">{quiz.progress}%</div>
                  </div>
                  <Progress value={quiz.progress} className="h-2 mb-2" />
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Score on attempted: <span className="font-medium text-gray-900 dark:text-gray-100">{quiz.score}%</span>
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <BarChart3 className="h-3.5 w-3.5 mr-1" />
                  View Results
                </Button>
                
                {quiz.mode === 'preparation' && quiz.progress < 100 && (
                  <Button variant="default" size="sm" className="flex-1">
                    <ChevronRight className="h-3.5 w-3.5 mr-1" />
                    Continue
                  </Button>
                )}
                
                {(quiz.mode !== 'preparation' || quiz.progress >= 100) && (
                  <Button variant="outline" size="sm" className="flex-1">
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    Retry
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };
  
  // If quiz selection mode is active, show the selection component
  if (showQuizSelection) {
    return (
      <div className="container mx-auto py-6 px-4 md:px-6">
        <QuizSelection
          library={library}
          isLoadingLibrary={isLoadingLibrary}
          selectedDocument={selectedDocument}
          selectedMode={selectedMode}
          onDocumentSelect={handleDocumentSelect}
          onModeSelect={handleModeSelect}
          onStart={handleStartQuiz}
          onCancel={handleQuizExit}
        />
        
        {/* Preparation Mode Modal */}
        {selectedDocument && (
          <PreparationModeModal
            isOpen={isPreparationModalOpen}
            onClose={() => setShowExitConfirmation(true)}
            document={selectedDocument}
            onComplete={handleQuizComplete}
            initialProgress={learningProgress}
          />
        )}
        
        {/* Exam Simulation Modal */}
        {selectedDocument && (
          <ExamSimulationModal
            isOpen={isExamModalOpen}
            onClose={() => setShowExitConfirmation(true)}
            document={selectedDocument}
            onComplete={handleQuizComplete}
            initialProgress={learningProgress}
          />
        )}
        
        {/* Exit Confirmation Dialog */}
        <Dialog open={showExitConfirmation} onOpenChange={setShowExitConfirmation}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Exit Study Session?</DialogTitle>
              <DialogDescription>
                Are you sure you want to exit? Your progress may not be saved.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-between">
              <Button type="button" variant="secondary" onClick={cancelExit}>
                Continue Studying
              </Button>
              <Button type="button" variant="destructive" onClick={confirmExit}>
                Exit Session
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
  
  // Main quizzes page
  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1 text-gray-900 dark:text-gray-100">Quizzes</h1>
          <p className="text-gray-500 dark:text-gray-400">Test your knowledge and track your progress</p>
        </div>
        <Button 
          className="mt-4 md:mt-0"
          onClick={handleStartNewQuiz}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Quiz
        </Button>
      </div>
      
      <Tabs defaultValue="recent" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="recent" className="text-sm py-2">
            Recent Quizzes
          </TabsTrigger>
          <TabsTrigger value="stats" className="text-sm py-2">
            Statistics
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="recent" className="mt-0">
          {renderRecentQuizzes()}
        </TabsContent>
        
        <TabsContent value="stats" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Quiz Statistics</CardTitle>
              <CardDescription>
                View your overall performance across all quizzes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Quizzes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{quizzes.length}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      <span className="text-green-600 dark:text-green-400 font-medium">+3</span> this month
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">Average Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {quizzes.length > 0 
                        ? Math.round(quizzes.reduce((acc, q) => acc + q.score, 0) / quizzes.length) 
                        : 0}%
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      <span className="text-green-600 dark:text-green-400 font-medium">+5%</span> from last month
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">Study Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">24h</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      <span className="text-green-600 dark:text-green-400 font-medium">+2h</span> this week
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="mt-8">
                <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">Recent Performance</h3>
                <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400">
                  Performance chart will be displayed here
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}