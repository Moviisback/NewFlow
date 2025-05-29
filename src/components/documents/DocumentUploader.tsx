// components/documents/DocumentUploader.tsx
import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileText, X, Loader2, AlertCircle, BookOpen, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import SummaryOptionsSelector from '@/components/summary-options';
import { SummaryOptions, detailLevelPercentages } from '@/types/summaryOptions';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getFileTypeKey, getTypeIcon } from './colorUtils';
import { ACCEPTED_FILE_TYPES, ACCEPTED_MIME_TYPES, MAX_FILE_SIZE_MB, MAX_FILE_SIZE_BYTES, ProcessingProgress } from './types';

interface DocumentUploaderProps {
  file: File | null;
  setFile: (file: File | null) => void;
  summaryOptions: SummaryOptions;
  setSummaryOptions: (options: SummaryOptions) => void;
  isLoading: boolean;
  error: string;
  processingProgress: ProcessingProgress;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  summarizeDocument: () => void;
  handleOptionsChange: (options: SummaryOptions) => void;
  originalText: string;
  setOriginalText: (text: string) => void;
  originalDocumentWordCount: number; // New prop for original word count
  generatedSummaryWordCount?: number; // New prop for summary word count
}

const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  file,
  setFile,
  summaryOptions,
  setSummaryOptions,
  isLoading,
  error,
  processingProgress,
  handleFileChange,
  summarizeDocument,
  handleOptionsChange,
  originalText,
  setOriginalText,
  originalDocumentWordCount,
  generatedSummaryWordCount
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // *** FIXED: Always update targetPercentage when detailLevel changes ***
  const updateSummaryOptions = (newOptions: SummaryOptions) => {
    // ALWAYS update targetPercentage based on detailLevel
    if (newOptions.detailLevel) {
      newOptions.targetPercentage = detailLevelPercentages[newOptions.detailLevel];
    }
    handleOptionsChange(newOptions);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('border-indigo-400', 'bg-indigo-50');
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('border-indigo-400', 'bg-indigo-50');
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('border-indigo-400', 'bg-indigo-50');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      processFile(droppedFile);
      e.dataTransfer.clearData();
    }
  };

  // Helper function to read file content
  const readFileContent = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          resolve(e.target.result as string);
        } else {
          reject(new Error("Failed to read file content"));
        }
      };
      reader.onerror = () => reject(new Error("File reading error"));
      reader.readAsText(file);
    });
  };

  // Process a file (validate and set)
  const processFile = useCallback(async (selectedFile: File | null) => {
    if (!selectedFile) {
      setFile(null);
      return;
    }

    // Check file size
    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      alert(`File is too large (${(selectedFile.size / 1024 / 1024).toFixed(1)} MB). Max: ${MAX_FILE_SIZE_MB} MB.`);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Check file type
    const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
    const isValidExtension = fileExtension && ACCEPTED_FILE_TYPES.split(',').includes(`.${fileExtension}`);
    const isValidMime = ACCEPTED_MIME_TYPES.includes(selectedFile.type);

    if (!isValidExtension && !isValidMime) {
      if (!isValidExtension) {
        alert(`Unsupported file format based on extension (.${fileExtension}). Please upload ${ACCEPTED_FILE_TYPES.replaceAll(',', ', ')}.`);
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      // Allow if extension is okay but mime type is weird/missing
      console.warn(`File MIME type '${selectedFile.type}' not explicitly accepted, but extension '.${fileExtension}' is valid. Proceeding...`);
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
      setOriginalText('');
    }
  }, [setFile, setOriginalText]);

  // Clear file handler
  const clearFile = () => {
    setFile(null);
    setOriginalText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Get file type information for styling
  const fileTypeKey = file ? getFileTypeKey({ title: file.name, type: file.type }) : null;

  return (
    <Card className="shadow-lg border border-gray-200 rounded-xl overflow-hidden">
      <CardHeader className="bg-gray-50 border-b border-gray-200 p-5">
        <CardTitle className="text-lg font-semibold text-gray-800">Upload Document</CardTitle>
        <CardDescription className="text-sm text-gray-500">
          Select or drop a TXT, PDF, or DOCX file (Max {MAX_FILE_SIZE_MB}MB).
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        {!file ? (
          <div
            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors duration-200 ease-in-out ${
              error
                ? 'border-red-400 hover:border-red-500 bg-red-50'
                : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50'
              }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            aria-label="File upload area"
            tabIndex={0}
            onKeyDown={(e: React.KeyboardEvent) => { 
              if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); 
            }}
          >
            <div className="mb-4 rounded-full bg-indigo-100 p-4">
              <Upload className="h-8 w-8 text-indigo-500" />
            </div>
            <p className="text-base font-medium text-gray-700 mb-1">
              Drop file here or <span className="text-indigo-600 font-semibold">click to browse</span>
            </p>
            <p className="text-xs text-gray-500">
              Supports: {ACCEPTED_FILE_TYPES.replaceAll(',', ', ')}
            </p>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept={ACCEPTED_FILE_TYPES}
              onChange={handleFileChange}
              id="file-upload-input"
            />
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50">
            <div className="flex items-center space-x-3 overflow-hidden flex-1 min-w-0 mr-2">
              {fileTypeKey && getTypeIcon(fileTypeKey)}
              <div className="overflow-hidden">
                <p className="font-medium truncate text-sm text-gray-800" title={file.name}>
                  {file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB - {file.type || 'Unknown type'}
                  {originalDocumentWordCount > 0 && ` - ${originalDocumentWordCount.toLocaleString()} words`}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={clearFile}
              aria-label="Remove selected file"
              className="flex-shrink-0 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full w-8 h-8"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        )}
        
        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>

      {/* Summary Options - Only show when file selected */}
      {file && !isLoading && (
        <div className="px-6 pb-6">
          <div className="mb-3 flex items-center border-t pt-4">
            <BookOpen className="h-5 w-5 mr-2 text-indigo-600" />
            <h3 className="text-base font-semibold text-gray-800">Study Material Options</h3>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 ml-1 text-gray-400 hover:text-gray-600">
                    <Info className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs p-3 text-xs bg-gray-800 text-white rounded-md shadow-lg">
                  <p>Customize the format, length, and focus of the generated study material. Your choices tailor the output to your learning style.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {/* Pass the word count information to the SummaryOptionsSelector */}
          <SummaryOptionsSelector
            options={summaryOptions}
            onChange={updateSummaryOptions}
            onApply={summarizeDocument}
            isLoading={isLoading}
            originalDocumentWordCount={originalDocumentWordCount}
            actualGeneratedSummaryWordCount={generatedSummaryWordCount}
          />
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="px-6 pb-6 flex flex-col items-center text-sm text-gray-600">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mb-2" />
          <span>{processingProgress.stage || "Processing..."}</span>
          {processingProgress.totalChunks > 0 && (
            <div className="w-full max-w-xs mt-2">
              <div className="text-xs text-gray-500 mb-1 text-center">
                {processingProgress.processedChunks} / {processingProgress.totalChunks} sections
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                <div
                  className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (processingProgress.processedChunks / Math.max(1, processingProgress.totalChunks)) * 100)}%` }}
                />
              </div>
            </div>
          )}
          {processingProgress.error && (
            <span className="text-red-500 text-xs mt-2">{processingProgress.error}</span>
          )}
        </div>
      )}

      {/* Footer with Generate Button - Only shown when not loading */}
      {file && !isLoading && (
        <CardFooter className="flex justify-end px-6 pb-6 pt-0">
          <Button
            onClick={summarizeDocument}
            disabled={!file}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg"
          >
            Generate Study Material
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default DocumentUploader;