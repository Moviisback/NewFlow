'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';

// Import components
import QuizSelection from '@/components/quiz/QuizSelection';
import PreparationModeModal from '@/components/quiz/PreparationModeModal';
import ExamSimulationModal from '@/components/quiz/ExamSimulationModal';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// Import types
import { LibraryItem } from '@/components/documents/types';
import { PreparationSession, ExamSession, LearningProgress } from '@/types/quizTypes';
import { loadLibraryFromStorage } from '@/components/documents/fileHelpers';

// Mock function to load learning progress (in a real app, this would come from a database)
const loadLearningProgress = (documentId: number): LearningProgress => {
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

interface QuizControllerProps {
  onQuizComplete: (quiz: any) => void;
  initialLibrary?: LibraryItem[];
}

const QuizController: React.FC<QuizControllerProps> = ({ 
  onQuizComplete,
  initialLibrary = []
}) => {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Library state
  const [library, setLibrary] = useState<LibraryItem[]>(initialLibrary);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState<boolean>(false);
  
  // Quiz selection state
  const [selectedDocument, setSelectedDocument] = useState<LibraryItem | null>(null);
  const [selectedMode, setSelectedMode] = useState<'preparation' | 'exam' | null>(null);
  const [learningProgress, setLearningProgress] = useState<LearningProgress | undefined>(undefined);
  
  // Modal state
  const [isPreparationModalOpen, setIsPreparationModalOpen] = useState<boolean>(false);
  const [isExamModalOpen, setIsExamModalOpen] = useState<boolean>(false);
  const [showExitConfirmation, setShowExitConfirmation] = useState<boolean>(false);
  
  // Fetch library if empty
  useEffect(() => {
    // Check if we should auto-open with a document (from URL parameters)
    const documentId = searchParams.get('document');
    const mode = searchParams.get('mode');
    
    if (documentId) {
      // Try to auto-select the document
      setTimeout(() => {
        tryAutoSelectDocument(parseInt(documentId), mode as 'preparation' | 'exam' | null);
      }, 500);
    }
    
    if (initialLibrary.length > 0) {
      setLibrary(initialLibrary);
      return;
    }
    
    const fetchLibrary = async () => {
      setIsLoadingLibrary(true);
      
      try {
        // Directly load from localStorage using existing helper
        const documents = loadLibraryFromStorage();
        if (documents && documents.length > 0) {
          console.log('Loaded library from localStorage:', documents.length, 'items');
          setLibrary(documents);
          
          // If we have a document ID, try to select it
          if (documentId) {
            setTimeout(() => {
              tryAutoSelectDocument(parseInt(documentId), mode as 'preparation' | 'exam' | null);
            }, 100);
          }
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
  }, [initialLibrary, searchParams]);
  
  // Helper to try auto-selecting a document
  const tryAutoSelectDocument = (documentId: number, mode: 'preparation' | 'exam' | null = null) => {
    const doc = library.find(doc => doc.id === documentId);
    if (doc) {
      handleDocumentSelect(doc);
      if (mode === 'preparation' || mode === 'exam') {
        handleModeSelect(mode);
        setTimeout(() => handleStartQuiz(), 200);
      }
    }
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
    
    // Call the parent's onQuizComplete handler
    onQuizComplete({
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
    });
    
    // Close modals
    setIsPreparationModalOpen(false);
    setIsExamModalOpen(false);
    
    // Reset selection
    setSelectedDocument(null);
    setSelectedMode(null);
    
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
    
    // Otherwise, just reset the selection
    setSelectedDocument(null);
    setSelectedMode(null);
  };
  
  // Confirm exit from quiz
  const confirmExit = () => {
    setIsPreparationModalOpen(false);
    setIsExamModalOpen(false);
    setShowExitConfirmation(false);
    setSelectedDocument(null);
    setSelectedMode(null);
  };
  
  // Cancel exit from quiz
  const cancelExit = () => {
    setShowExitConfirmation(false);
  };
  
  // Navigate back to quizzes page
  const handleCancel = () => {
    router.push('/quizzes');
  };
  
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
        onCancel={handleCancel}
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
};

export default QuizController;