'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Brain, Target, BookOpen, Calculator, FileText, ArrowLeft, Clock, Check } from 'lucide-react';
import { LibraryItem } from '@/components/documents/types';
import { typeColors, getFileTypeKey, getTypeIcon } from '@/components/documents/colorUtils';
import { loadLibraryFromStorage } from '@/components/documents/fileHelpers';

interface QuizSelectionProps {
  library: LibraryItem[];
  isLoadingLibrary: boolean;
  selectedDocument: LibraryItem | null;
  selectedMode: 'preparation' | 'exam' | null;
  onDocumentSelect: (document: LibraryItem) => void;
  onModeSelect: (mode: 'preparation' | 'exam') => void;
  onStart: () => void;
  onCancel: () => void;
}

const QuizSelection: React.FC<QuizSelectionProps> = ({
  library,
  isLoadingLibrary,
  selectedDocument,
  selectedMode,
  onDocumentSelect,
  onModeSelect,
  onStart,
  onCancel
}) => {
  const [filter, setFilter] = useState<string>('');
  const [displayLibrary, setDisplayLibrary] = useState<LibraryItem[]>([]);
  const [step, setStep] = useState<'document' | 'mode'>(selectedDocument ? 'mode' : 'document');
  
  // Load library from local storage if needed
  useEffect(() => {
    if (library.length > 0) {
      setDisplayLibrary(library);
      return;
    }
    
    if (!isLoadingLibrary) {
      const storedLibrary = loadLibraryFromStorage();
      if (storedLibrary && storedLibrary.length > 0) {
        setDisplayLibrary(storedLibrary);
      } else {
        // Sample documents as fallback
        const sampleDocuments = [
          { 
            id: 1, 
            title: 'Cell Structure & Function.pdf', 
            type: 'pdf', 
            date: 'May 3, 2025', 
            validated: true, 
            validationScore: 92, 
            summary: "Detailed summary about cell structures...", 
            content: "Original PDF content placeholder" 
          },
          { 
            id: 2, 
            title: 'Cognitive Psychology Exam Notes', 
            type: 'notes', 
            date: 'Apr 27, 2025', 
            validated: false, 
            validationScore: 78, 
            summary: "Cornell Notes Format...\nKeywords | Notes\nMemory | Types: Sensory, STM, LTM...", 
            content: "Original lecture notes" 
          },
          { 
            id: 3, 
            title: 'Statistics for Data Science Report.docx', 
            type: 'docx', 
            date: 'Apr 25, 2025', 
            validated: true, 
            validationScore: 88, 
            summary: "Key findings from the statistical analysis...", 
            content: "Original DOCX content placeholder" 
          }
        ];
        setDisplayLibrary(sampleDocuments);
      }
    }
  }, [library, isLoadingLibrary]);

  // Handle document selection and progress to next step
  const handleDocumentSelect = (document: LibraryItem) => {
    onDocumentSelect(document);
    setStep('mode');
  };
  
  // Handle mode selection
  const handleModeSelect = (mode: 'preparation' | 'exam') => {
    onModeSelect(mode);
  };
  
  // Filter library based on search input
  const filteredLibrary = displayLibrary.filter(item => 
    item.title.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="w-full">
      <Button 
        variant="ghost" 
        onClick={onCancel}
        className="mb-4 -ml-2 text-gray-600 dark:text-gray-300"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Quizzes
      </Button>
      
      <div className="flex flex-col md:flex-row gap-6">
        {/* Document Selection */}
        <Card className={`w-full ${step === 'mode' ? 'md:w-1/2' : 'md:w-full'} transition-all duration-300`}>
          <CardHeader>
            <CardTitle>Select Study Material</CardTitle>
            <CardDescription>
              Choose a document from your library to quiz on
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingLibrary ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : displayLibrary.length === 0 ? (
              <div className="text-center py-6">
                <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-1">No documents found</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">Upload documents first to create quizzes.</p>
                <Button onClick={() => window.location.href = '/documents'}>
                  Go to Documents
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search documents..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-100"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                </div>
                
                <ScrollArea className="h-[360px]">
                  <div className="space-y-2">
                    {filteredLibrary.map(document => {
                      const fileTypeKey = getFileTypeKey(document);
                      const isSelected = selectedDocument?.id === document.id;
                      
                      // Get the icon element
                      const iconEl = getTypeIcon(fileTypeKey);
                      
                      return (
                        <div
                          key={document.id}
                          className={`flex items-center p-3 rounded-md cursor-pointer border transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-sm' 
                              : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/20'
                          }`}
                          onClick={() => handleDocumentSelect(document)}
                        >
                          {/* Render icon element with proper className */}
                          <div className="mr-3 flex-shrink-0">
                            {React.cloneElement(iconEl, { 
                              className: `h-5 w-5 ${typeColors[fileTypeKey]?.text || 'text-gray-500'}`
                            })}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-gray-800 dark:text-gray-200">{document.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {document.date} 
                              {document.validated && (
                                <span className="inline-flex items-center ml-2 text-green-600 dark:text-green-400">
                                  • Validated
                                </span>
                              )}
                            </p>
                          </div>
                          {isSelected && (
                            <div className="flex-shrink-0 ml-2">
                              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                                <Check className="h-3 w-3 text-white" />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </>
            )}
          </CardContent>
        </Card>
        
        {/* Mode Selection - only fully visible when document is selected */}
        {(step === 'mode' || selectedDocument) && (
          <Card 
            className={`w-full md:w-1/2 transition-all duration-300 ${
              step === 'document' && !selectedDocument 
                ? 'opacity-50 pointer-events-none' 
                : 'opacity-100'
            }`}
          >
            <CardHeader>
              <CardTitle>Select Quiz Mode</CardTitle>
              <CardDescription>
                Choose how you want to study {selectedDocument?.title || 'this material'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div
                  className={`flex border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedMode === 'preparation'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-sm'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/20'
                  }`}
                  onClick={() => handleModeSelect('preparation')}
                >
                  <div className="mr-4 flex-shrink-0 mt-1">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                      <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium text-lg mb-1 text-gray-800 dark:text-gray-200">Preparation Mode</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      Learn section by section with targeted questions. This mode helps build deep understanding through 
                      active recall and spaced repetition.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                        <BookOpen className="h-3 w-3 mr-1" />
                        Section-by-Section
                      </Badge>
                      <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                        <Clock className="h-3 w-3 mr-1" />
                        Learning Timer
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div
                  className={`flex border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedMode === 'exam'
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 shadow-sm'
                      : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50/50 dark:hover:bg-purple-900/20'
                  }`}
                  onClick={() => handleModeSelect('exam')}
                >
                  <div className="mr-4 flex-shrink-0 mt-1">
                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-800 flex items-center justify-center">
                      <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium text-lg mb-1 text-gray-800 dark:text-gray-200">Exam Simulation</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      Test your knowledge with a timed exam covering the entire document. Perfect for exam preparation 
                      and assessing overall understanding.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="outline" className="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                        <Calculator className="h-3 w-3 mr-1" />
                        Comprehensive Test
                      </Badge>
                      <Badge variant="outline" className="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                        <Clock className="h-3 w-3 mr-1" />
                        Timed Exam
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button
                onClick={onStart}
                disabled={!selectedDocument || !selectedMode}
              >
                {selectedMode === 'preparation' 
                  ? 'Start Preparation' 
                  : selectedMode === 'exam' 
                    ? 'Start Exam' 
                    : 'Start Quiz'}
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
};

export default QuizSelection;