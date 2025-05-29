// components/documents/DocumentViewer.tsx
import React, { useState, useRef, useCallback } from 'react';
import { ChevronRight, Download, Check, BookOpen, ListChecks, ClipboardCheck, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { typeColors, getFileTypeKey } from './colorUtils';
import { LibraryItem, ValidationResult } from './types';
import { RubricScore } from '@/types/rubric';
import FullscreenStudyViewer from '@/components/study-viewer/FullscreenStudyViewer';
import { extractTableOfContents, extractKeyInformation } from '@/components/study-viewer';
import { downloadContent } from './fileHelpers';

// Import components used for validation and rubric evaluation 
import SummaryValidator from '@/components/summary-validator';
import SummaryRubricEvaluation from '@/components/summary-rubric-evaluation';

interface DocumentViewerProps {
  item: LibraryItem;
  onBack: () => void;
  onSummaryEnhanced: (enhancedSummary: string) => void;
  validationResult: ValidationResult | null;
  setValidationResult: (result: ValidationResult | null) => void;
  rubricResult: RubricScore | null;
  setRubricResult: (result: RubricScore | null) => void;
  originalDocumentWordCount: number;  // New prop for original document word count
  generatedSummaryWordCount?: number; // New prop for generated summary word count
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({
  item,
  onBack,
  onSummaryEnhanced,
  validationResult,
  setValidationResult,
  rubricResult,
  setRubricResult,
  originalDocumentWordCount,
  generatedSummaryWordCount
}) => {
  const [activeTab, setActiveTab] = useState<string>('summary');
  const [isFullScreenViewerOpen, setIsFullScreenViewerOpen] = useState<boolean>(false);
  const fileTypeKey = getFileTypeKey(item);

  // Check if original content is available
  const hasOriginalContent = !!item.content && item.content.trim().length > 0;

  // Handler for opening fullscreen viewer
  const openFullscreenViewer = () => {
    setIsFullScreenViewerOpen(true);
  };

  // Define a proper download handler
  const handleDownload = useCallback(() => {
    console.log("Download triggered from DocumentViewer");
    
    try {
      // Use the downloadContent helper or direct approach
      const blob = new Blob([item.summary || ''], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Adjust filename based on type
      const itemTypeKey = getFileTypeKey(item);
      const extension = ['pdf', 'docx', 'xlsx'].includes(itemTypeKey) ? itemTypeKey : 'txt';
      a.download = `${item.title.replace(/\.[^/.]+$/, "")} - ${itemTypeKey}.${extension}`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log("Download completed successfully");
    } catch (error) {
      console.error("Error during download:", error);
    }
  }, [item]);

  // Calculate summary percentage for display
  const summaryPercentage = originalDocumentWordCount > 0 && generatedSummaryWordCount 
    ? Math.round((generatedSummaryWordCount / originalDocumentWordCount) * 100)
    : undefined;

  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex items-center text-sm px-3 py-1.5 h-auto"
        >
          <ChevronRight className="h-4 w-4 mr-1 rotate-180" />
          Back to Library
        </Button>

        {/* Display type badge using typeColors */}
        <Badge
          variant="outline"
          className={`border ${typeColors[fileTypeKey]?.border || typeColors.default.border} ${typeColors[fileTypeKey]?.light || typeColors.default.light} ${typeColors[fileTypeKey]?.text || typeColors.default.text}`}
        >
          {fileTypeKey.toUpperCase()}
        </Badge>
      </div>

      {/* Tabs for Summary/Validator/Rubric */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
          <Card className="shadow-md rounded-t-none border-t-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100">{item.title}</CardTitle>
                <div className="flex items-center gap-2">
                  {item.validated && (
                    <Badge variant="outline" className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 flex items-center gap-1.5 px-2 py-0.5">
                      <Check className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">Validated</span>
                    </Badge>
                  )}
                  {hasOriginalContent && (
                    <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 flex items-center gap-1.5 px-2 py-0.5">
                      <span className="text-xs font-medium">Original Content Available</span>
                    </Badge>
                  )}
                </div>
              </div>
              <CardDescription className="text-xs text-gray-500 dark:text-gray-400 pt-1">
                Created: {item.date}
                {item.options?.studyFormat && ` | Format: ${item.options.studyFormat}`}
                {/* Display word count information if available */}
                {generatedSummaryWordCount && originalDocumentWordCount > 0 && (
                  <> | <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                    {generatedSummaryWordCount.toLocaleString()} words
                    {summaryPercentage && ` (${summaryPercentage}% of original)`}
                  </span></>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={item.summary || 'No summary content available.'}
                readOnly
                className="min-h-[300px] sm:min-h-[400px] bg-gray-50 dark:bg-gray-800 focus:ring-0 focus:outline-none border border-gray-200 dark:border-gray-700 rounded-md whitespace-pre-wrap p-4 text-sm dark:text-gray-200"
                aria-label="Generated study material content"
              />
            </CardContent>
            <CardFooter className="flex justify-between gap-3">
              {/* Word count info with file icon */}
              {originalDocumentWordCount > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Original: {originalDocumentWordCount.toLocaleString()} words</span>
                </div>
              )}
              <div className="flex gap-2 ml-auto">
                {/* Added fullscreen viewer button */}
                <Button 
                  variant="outline" 
                  onClick={openFullscreenViewer}
                  className="flex items-center gap-2"
                >
                  <BookOpen size={16} /> Open in Fullscreen
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleDownload}
                  className="flex items-center gap-2"
                >
                  <Download size={16} /> Download
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="validator" className="mt-0 bg-white dark:bg-gray-800 rounded-b-lg shadow-md border border-t-0 border-gray-200 dark:border-gray-700">
          <div className="p-4 sm:p-6">
            <SummaryValidator
              file={null} // Pass null file, as we use stored content
              summary={item.summary || ''}
              originalText={item.content || ''}
              onComplete={(result) => setValidationResult(result)}
              onSummaryEnhanced={onSummaryEnhanced}
            />
          </div>
        </TabsContent>

        <TabsContent value="rubric" className="mt-0 bg-white dark:bg-gray-800 rounded-b-lg shadow-md border border-t-0 border-gray-200 dark:border-gray-700">
          <div className="p-4 sm:p-6">
            <SummaryRubricEvaluation
              file={null} // Pass null file
              summary={item.summary || ''}
              onComplete={(result) => setRubricResult(result)}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Fullscreen Study Viewer */}
      <FullscreenStudyViewer
        isOpen={isFullScreenViewerOpen}
        onClose={() => setIsFullScreenViewerOpen(false)}
        title={item.title}
        date={item.date}
        summary={item.summary || ''}
        originalContent={item.content || ''} // Pass original content to viewer
        isValidated={item.validated}
        format={item.options?.studyFormat || 'standard'}
        tableOfContents={extractTableOfContents(item.summary || '')}
        keyInformation={extractKeyInformation(item.summary || '')}
        onDownload={handleDownload}
        onViewInLibrary={() => {}} // This is from the library already
        // You may also want to pass the word count information to the fullscreen viewer
        // if the component accepts these props
      />
    </div>
  );
};

export default DocumentViewer;