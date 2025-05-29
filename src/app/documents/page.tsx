'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react'; 
import { defaultSummaryOptions } from '@/types/summaryOptions';
import { LibraryItem, ValidationResult, ProcessingProgress } from '@/components/documents/types';
import { RubricScore } from '@/types/rubric';
import { loadLibraryFromStorage } from '@/components/documents/fileHelpers';

// Import the DarkModeProvider
import { DarkModeProvider } from '@/components/common/DarkModeProvider';

// Import common components
import AppHeader from '@/components/common/AppHeader';
import EnhancedTabs from '@/components/common/EnhancedTabs';

// Import document components
import DocumentLibrary from '@/components/documents/DocumentLibrary';
import DocumentUploader from '@/components/documents/DocumentUploader';
import DocumentViewer from '@/components/documents/DocumentViewer';
import DocumentSummaryContent from '@/components/documents/DocumentSummaryContent';
import { readFileContent } from '@/components/documents/fileHelpers';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BookOpen, ListChecks, ClipboardCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Import validator components
import SummaryValidator from '@/components/summary-validator';
import SummaryRubricEvaluation from '@/components/summary-rubric-evaluation';

// Initial example library items
const initialLibraryItems: LibraryItem[] = [
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
    id: 4, 
    title: 'Psychology 101 Flashcards', 
    type: 'flashcard', 
    date: 'May 1, 2025', 
    validated: false, 
    validationScore: 65, 
    summary: "Term: Definition\nCognition: Mental processes...", 
    content: "Source text for flashcards" 
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
  },
  { 
    id: 5, 
    title: 'Meeting Summary - Project Phoenix.txt', 
    type: 'summary', 
    date: 'Apr 20, 2025', 
    validated: false, 
    validationScore: 70, 
    summary: "Summary of key decisions and action items...", 
    content: "Original TXT meeting notes" 
  },
];

// Word counting utility function
const countWordsInContent = (content: string): number => {
  if (!content || content.trim() === '') return 0;
  
  // Remove common non-word elements that might inflate counts
  const cleanedContent = content
    .replace(/\r\n/g, ' ') // Normalize line breaks
    .replace(/\n/g, ' ')
    .replace(/\t/g, ' ')
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\[\/?[^\]]+\]/g, ' ') // Remove markdown-style tags
    .trim();
    
  return cleanedContent.split(/\s+/).filter(Boolean).length;
};

export default function DocumentsPage() {
  // State for UI navigation
  const [activeTab, setActiveTab] = useState<string>('library');
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);
  const [summaryActiveTab, setSummaryActiveTab] = useState<string>('summary');
  
  // State for document processing
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<string>('');
  const [originalText, setOriginalText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [summaryOptions, setSummaryOptions] = useState(defaultSummaryOptions);
  const [summaryMeta, setSummaryMeta] = useState<any | null>(null);
  
  // New state for word counts
  const [originalDocumentWordCount, setOriginalDocumentWordCount] = useState<number>(0);
  const [generatedSummaryWordCount, setGeneratedSummaryWordCount] = useState<number | undefined>(undefined);
  
  // State for library
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  
  // State for validation and rubric
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [rubricResult, setRubricResult] = useState<RubricScore | null>(null);
  
  // Progress tracking state
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress>({
    stage: '',
    processedChunks: 0,
    totalChunks: 0
  });
  
  const progressPollingRef = useRef<NodeJS.Timeout | null>(null);

  // Load saved items on mount
  useEffect(() => {
    const loadSavedItems = async () => {
      const savedItems = loadLibraryFromStorage();
      if (savedItems && savedItems.length > 0) {
        console.log('Loaded saved items from localStorage:', savedItems.length);
        setLibraryItems(savedItems);
      } else {
        console.log('No saved items found, loading example items');
        setLibraryItems(initialLibraryItems);
      }
    };
    
    loadSavedItems();
  }, []);

  // Count words when originalText changes
  useEffect(() => {
    if (originalText) {
      const wordCount = countWordsInContent(originalText);
      setOriginalDocumentWordCount(wordCount);
      console.log(`Original document word count: ${wordCount}`);
    } else {
      setOriginalDocumentWordCount(0);
    }
  }, [originalText]);

  // Clear progress polling on unmount
  useEffect(() => {
    return () => {
      if (progressPollingRef.current) {
        clearTimeout(progressPollingRef.current);
      }
    };
  }, []);

  // Start progress polling
  const startProgressPolling = useCallback(() => {
    const checkProgress = async () => {
      if (!isLoading) {
        if (progressPollingRef.current) {
          clearTimeout(progressPollingRef.current);
          progressPollingRef.current = null;
        }
        return;
      }

      try {
        const response = await fetch('/api/summarize-progress');
        if (response.ok) {
          const data = await response.json();
          
          // Update progress state
          setProcessingProgress({
            stage: data.stage || '',
            processedChunks: data.processedChunks || 0,
            totalChunks: data.totalChunks || 0,
            error: data.error
          });
          
          // If error is detected, stop processing
          if (data.error === 'timeout') {
            setIsLoading(false);
            setError('Processing timed out. Please try with a smaller document or contact support.');
            return;
          }
        }
      } catch (e) {
        console.error("Error checking progress:", e);
      }
      
      // Schedule next check
      progressPollingRef.current = setTimeout(checkProgress, 2000);
    };
    
    // Start checking
    checkProgress();
  }, [isLoading]);

  // Handle file change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Process file upload
  const processFile = useCallback(async (selectedFile: File | null) => {
    setError('');
    setSummary('');
    setSummaryMeta(null);
    setRubricResult(null);
    setOriginalText('');
    setGeneratedSummaryWordCount(undefined);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    setFile(selectedFile);
    
    // Try to read text content for all file types to store original content
    try {
      let content = '';
      
      if (selectedFile.type === 'text/plain' || selectedFile.name.toLowerCase().endsWith('.txt')) {
        // Direct text reading for text files
        content = await readFileContent(selectedFile);
        console.log("Successfully read text content, length:", content.length);
      } else {
        // For PDF/DOCX, we'll try to read but the API will extract proper content
        try {
          // Still try to read in case it's readable
          content = await readFileContent(selectedFile);
          console.log("Attempted to read non-text file content, length:", content.length);
        } catch (err) {
          // Just store file information if we can't read directly
          console.log("Could not directly read file content, will rely on API extraction");
          content = `Document content will be extracted by the server. File: ${selectedFile.name} (${selectedFile.type})`;
        }
      }
      
      // Always store the original content
      setOriginalText(content);
    } catch (err) {
      console.warn("Could not read file content:", err);
    }
  }, []);

  // Handle option changes
  const handleOptionsChange = (newOptions: any) => {
    setSummaryOptions(newOptions);
  };

  // Handle tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSelectedItem(null);
    
    if (tab === 'upload') {
      // Reset validation results when switching to upload tab
      setValidationResult(null);
      setRubricResult(null);
    } else {
      // Clear error when switching away from upload
      setError('');
    }
  };

  // Handle item selection from library
  const handleItemSelect = (item: LibraryItem) => {
    setSelectedItem(item);
    setValidationResult(null);
    setRubricResult(null);
    
    // Calculate word counts for selected item
    if (item.content) {
      const originalWordCount = countWordsInContent(item.content);
      setOriginalDocumentWordCount(originalWordCount);
    }
    
    if (item.summary) {
      const summaryWordCount = countWordsInContent(item.summary);
      setGeneratedSummaryWordCount(summaryWordCount);
    }
  };

  // Handle adding document to library
  const handleAddDocument = (document: LibraryItem) => {
    setLibraryItems(prev => [document, ...prev]);
  };

  // Handle summary enhancement
  const handleSummaryEnhanced = (enhancedSummary: string) => {
    // Calculate word count for enhanced summary
    const enhancedSummaryWordCount = countWordsInContent(enhancedSummary);
    setGeneratedSummaryWordCount(enhancedSummaryWordCount);
    
    // If viewing a selected item from the library, update it
    if (selectedItem) {
      const updatedItem = {
        ...selectedItem,
        summary: enhancedSummary,
        validated: false,
        validationScore: undefined
      };
      setSelectedItem(updatedItem);
      
      // Update in library list
      setLibraryItems(prevItems =>
        prevItems.map(item => item.id === selectedItem.id ? updatedItem : item)
      );
    } 
    // If in upload view, update summary state
    else if (activeTab === 'upload') {
      setSummary(enhancedSummary);
      setValidationResult(null);
    }
  };

  // Generate summary from document
  const summarizeDocument = async () => {
    if (!file) {
      setError("Please select a file first.");
      return;
    }

    setIsLoading(true);
    setError('');
    setSummary('');
    setSummaryMeta(null);
    setValidationResult(null);
    setRubricResult(null);
    setGeneratedSummaryWordCount(undefined); // Reset summary word count
    
    // Reset progress
    setProcessingProgress({
      stage: 'Initializing...',
      processedChunks: 0,
      totalChunks: 0
    });
    
    // Start progress polling
    startProgressPolling();

    const formData = new FormData();
    formData.append('file', file);
    formData.append('originalText', originalText); // Include original text in request
    formData.append('options', JSON.stringify(summaryOptions));

    try {
      console.log(`Sending file ${file.name} to /api/summarize with options:`, summaryOptions);
      const response = await fetch('/api/summarize', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data?.error || response.statusText || `Request failed: ${response.status}`;
        console.error(`API Error (${response.status}): ${errorMessage}`);
        throw new Error(errorMessage);
      }

      if (!data.summary) {
        throw new Error("API response received, but no summary was included.");
      }

      console.log("Summary received successfully with metadata:", data.meta);
      setSummary(data.summary);
      setSummaryMeta(data.meta);
      
      // Store original content from API if available
      const originalContent = data.originalContent || originalText;
      console.log(`Original content length: ${originalContent.length}`);
      
      // Update the originalText state with the API result
      setOriginalText(originalContent);
      
      // Calculate word counts
      const summaryWordCount = countWordsInContent(data.summary);
      setGeneratedSummaryWordCount(summaryWordCount);
      console.log(`Generated summary word count: ${summaryWordCount}`);
      
      // If the API provided word counts in meta, use those
      if (data.meta?.originalWordCount) {
        setOriginalDocumentWordCount(data.meta.originalWordCount);
      }
      
      if (data.meta?.summaryWordCount) {
        setGeneratedSummaryWordCount(data.meta.summaryWordCount);
      }

      // Add to library
      const newItem: LibraryItem = {
        id: Date.now(),
        title: file.name,
        type: summaryOptions.studyFormat || 'summary',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        validated: false,
        content: originalContent, // Store original content
        summary: data.summary,
        options: summaryOptions
      };
      
      setLibraryItems(prev => [newItem, ...prev]);

    } catch (err) {
      console.error("Error during summarization request:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred. Check console or try again.");
      setSummary('');
      setGeneratedSummaryWordCount(undefined);
    } finally {
      setIsLoading(false);
      
      // Stop progress polling
      if (progressPollingRef.current) {
        clearTimeout(progressPollingRef.current);
        progressPollingRef.current = null;
      }
      
      // Reset progress display after 3 seconds
      setTimeout(() => {
        setProcessingProgress({
          stage: '',
          processedChunks: 0,
          totalChunks: 0
        });
      }, 3000);
    }
  };

  // Save to library and switch to library view
  const viewInLibrary = () => {
    setActiveTab('library');
  };

  return (
    <DarkModeProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AppHeader />
        
        <main className="max-w-7xl mx-auto px-4 py-6">
          <EnhancedTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
          
          {/* Library View */}
          {activeTab === 'library' && !selectedItem && (
            <DocumentLibrary
              items={libraryItems}
              onSelectItem={handleItemSelect}
              onUpload={() => handleTabChange('upload')}
              onAddDocument={handleAddDocument}
              setLibraryItems={setLibraryItems}
            />
          )}
          
          {/* Selected Item View */}
          {activeTab === 'library' && selectedItem && (
            <DocumentViewer
              item={selectedItem}
              onBack={() => setSelectedItem(null)}
              onSummaryEnhanced={handleSummaryEnhanced}
              validationResult={validationResult}
              setValidationResult={setValidationResult}
              rubricResult={rubricResult}
              setRubricResult={setRubricResult}
              originalDocumentWordCount={originalDocumentWordCount}
              generatedSummaryWordCount={generatedSummaryWordCount}
            />
          )}
          
          {/* Upload View */}
          {activeTab === 'upload' && (
            <div className="grid gap-8">
              {/* Upload Card */}
              <DocumentUploader
                file={file}
                setFile={setFile}
                summaryOptions={summaryOptions}
                setSummaryOptions={setSummaryOptions}
                isLoading={isLoading}
                error={error}
                processingProgress={processingProgress}
                handleFileChange={handleFileChange}
                summarizeDocument={summarizeDocument}
                handleOptionsChange={handleOptionsChange}
                originalText={originalText}
                setOriginalText={setOriginalText}
                originalDocumentWordCount={originalDocumentWordCount}
                generatedSummaryWordCount={generatedSummaryWordCount}
              />
              
              {/* Generated Summary Card */}
              {summary && !isLoading && (
                <Tabs value={summaryActiveTab} onValueChange={setSummaryActiveTab} className="w-full mt-[-1rem]">
                  <div className="border-b border-gray-200 dark:border-gray-700">
                    <TabsList className="grid w-full grid-cols-3 bg-gray-50 dark:bg-gray-800 rounded-t-lg p-1 h-auto">
                      <TabsTrigger 
                        value="summary" 
                        className="flex items-center justify-center gap-2 py-2.5 text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:text-indigo-700 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-sm rounded-md data-[state=inactive]:text-gray-600 dark:data-[state=inactive]:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-300"
                      >
                        <BookOpen className="h-4 w-4" />
                        <span>Study Material</span>
                      </TabsTrigger>
                      <TabsTrigger 
                        value="validator" 
                        className="flex items-center justify-center gap-2 py-2.5 text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:text-indigo-700 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-sm rounded-md data-[state=inactive]:text-gray-600 dark:data-[state=inactive]:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-300"
                      >
                        <ListChecks className="h-4 w-4" />
                        <span>Completeness</span>
                        {validationResult && (
                          <Badge 
                            variant="outline" 
                            className={`ml-2 text-xs px-1.5 py-0.5 font-medium ${
                              validationResult.overallScore >= 85
                                ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800"
                                : validationResult.overallScore >= 70
                                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                                  : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800"
                            }`}
                          >
                            {validationResult.overallScore}%
                          </Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger 
                        value="rubric" 
                        className="flex items-center justify-center gap-2 py-2.5 text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:text-indigo-700 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-sm rounded-md data-[state=inactive]:text-gray-600 dark:data-[state=inactive]:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-300"
                      >
                        <ClipboardCheck className="h-4 w-4" />
                        <span>Rubric Score</span>
                        {rubricResult && (
                          <Badge 
                            variant="outline" 
                            className={`ml-2 text-xs px-1.5 py-0.5 font-medium ${
                              rubricResult.overallScore >= 4.5
                                ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800"
                                : rubricResult.overallScore >= 3.5
                                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                                  : rubricResult.overallScore >= 2.5
                                    ? "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                                    : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800"
                            }`}
                          >
                            {rubricResult.overallScore.toFixed(1)}/5
                          </Badge>
                        )}
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  
                  {/* Tab Content Panels */}
                  <TabsContent value="summary" className="mt-0">
                    <DocumentSummaryContent
                      title={file?.name || 'Generated Study Material'}
                      summary={summary}
                      file={file}
                      summaryMeta={summaryMeta}
                      format={summaryOptions.studyFormat}
                      isValidated={validationResult ? validationResult.overallScore >= 85 : false}
                      onViewInLibrary={viewInLibrary}
                      originalContent={originalText} // Pass original content
                    />
                  </TabsContent>
                  
                  <TabsContent value="validator" className="mt-0 bg-white dark:bg-gray-800 rounded-b-lg shadow-md border border-t-0 border-gray-200 dark:border-gray-700">
                    <div className="p-4 sm:p-6">
                      <SummaryValidator
                        file={file}
                        summary={summary}
                        originalText={originalText}
                        onComplete={setValidationResult}
                        onSummaryEnhanced={handleSummaryEnhanced}
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="rubric" className="mt-0 bg-white dark:bg-gray-800 rounded-b-lg shadow-md border border-t-0 border-gray-200 dark:border-gray-700">
                    <div className="p-4 sm:p-6">
                      <SummaryRubricEvaluation
                        file={file}
                        summary={summary}
                        onComplete={setRubricResult}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </div>
          )}
        </main>
      </div>
    </DarkModeProvider>
  );
}