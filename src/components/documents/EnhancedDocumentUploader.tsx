// components/documents/EnhancedDocumentUploader.tsx
import React, { useState, useRef, useCallback } from 'react';
import { 
  Upload, 
  FileText, 
  X, 
  Loader2, 
  AlertCircle, 
  BookOpen, 
  Info, 
  FileUp,
  File as FileIcon,
  Check
} from 'lucide-react';
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
import { Progress } from "@/components/ui/progress";
import SummaryOptionsSelector from '@/components/summary-options';
import { SummaryOptions } from '@/types/summaryOptions';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getFileTypeKey, getTypeIcon, typeColors } from './colorUtils';
import { ACCEPTED_FILE_TYPES, ACCEPTED_MIME_TYPES, MAX_FILE_SIZE_MB, MAX_FILE_SIZE_BYTES, ProcessingProgress } from './types';
import { readFileContent, validateFile } from './fileHelpers';

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
}

const EnhancedDocumentUploader: React.FC<DocumentUploaderProps> = ({
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
  setOriginalText
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileReadError, setFileReadError] = useState<string | null>(null);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState<boolean>(false);

  // Drag and drop handlers with improved states
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragActive) setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      processFile(droppedFile);
      e.dataTransfer.clearData();
    }
  };

  // Process a file (validate and set)
  const processFile = useCallback(async (selectedFile: File | null) => {
    // Reset states
    setFileReadError(null);
    setFilePreview(null);
    
    if (!selectedFile) {
      setFile(null);
      return;
    }

    // Validate file
    const validation = validateFile(selectedFile);
    if (!validation.valid) {
      setFileReadError(validation.error || 'Invalid file');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Set file and show success animation
    setFile(selectedFile);
    setShowSuccessAnimation(true);
    setTimeout(() => setShowSuccessAnimation(false), 1500);

    // Try to generate preview
    try {
      const fileType = getFileTypeKey({ title: selectedFile.name, type: selectedFile.type });
      
      // For PDFs, try to create a thumbnail preview
      if (fileType === 'pdf' && window.URL) {
        setFilePreview(window.URL.createObjectURL(selectedFile));
      }
      
      // For text files, read content for preview
      if (selectedFile.type === 'text/plain' || selectedFile.name.toLowerCase().endsWith('.txt')) {
        try {
          const content = await readFileContent(selectedFile);
          setOriginalText(content);
        } catch (err) {
          console.warn("Could not read text file content:", err);
          setOriginalText('');
        }
      }
    } catch (err) {
      console.warn("Could not create file preview:", err);
    }
  }, [setFile, setOriginalText]);

  // Calculate progress percentage
  const progressPercentage = processingProgress.totalChunks > 0
    ? Math.min(100, (processingProgress.processedChunks / Math.max(1, processingProgress.totalChunks)) * 100)
    : 0;

  // File thumbnail renderer
  const renderFileThumbnail = () => {
    if (!file) return null;
    
    const fileTypeKey = getFileTypeKey({ title: file.name, type: file.type });
    const typeColor = typeColors[fileTypeKey] || typeColors.default;
    const fileTypeIcon = getTypeIcon(fileTypeKey);

    return (
      <div className="relative flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50 transition-all duration-300 group hover:bg-gray-100 dark:hover:bg-gray-800">
        {/* File Icon/Preview */}
        <div className={`flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-lg ${typeColor.bg} dark:bg-opacity-20 ${typeColor.border} dark:border-gray-600`}>
          {fileTypeIcon}
        </div>
        
        {/* File Details */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <h4 className="font-medium truncate text-sm text-gray-800 dark:text-gray-200" title={file.name}>
            {file.name}
          </h4>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="truncate">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
            <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></span>
            <span className="truncate">{file.type || 'Unknown type'}</span>
          </div>
          {showSuccessAnimation && (
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs mt-1 animate-fadeIn">
              <Check className="h-3 w-3" />
              <span>Ready to process</span>
            </div>
          )}
        </div>
        
        {/* Delete Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setFile(null);
            setFilePreview(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
          aria-label="Remove selected file"
          className="flex-shrink-0 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
    );
  };

  return (
    <Card className="shadow-lg border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <CardHeader className="bg-gray-50 dark:bg-gray-800/70 border-b border-gray-200 dark:border-gray-700 p-5">
        <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <FileUp className="h-5 w-5 text-indigo-500" />
          Upload Document
        </CardTitle>
        <CardDescription className="text-sm text-gray-500 dark:text-gray-400">
          Select or drop a TXT, PDF, or DOCX file (Max {MAX_FILE_SIZE_MB}MB).
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        {!file ? (
          <div
            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-300 ease-in-out ${
              dragActive
                ? 'border-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10 dark:border-indigo-700'
                : error
                  ? 'border-red-400 hover:border-red-500 bg-red-50/50 dark:bg-red-900/10 dark:border-red-700'
                  : 'border-gray-300 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10'
              }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDragEnter={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            aria-label="File upload area"
            tabIndex={0}
            onKeyDown={(e: React.KeyboardEvent) => { 
              if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); 
            }}
          >
            <div className={`mb-4 rounded-full p-4 ${
              dragActive 
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 scale-110' 
                : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 dark:text-indigo-400'
              } transition-all duration-300`}>
              <Upload className="h-8 w-8" />
            </div>
            <p className="text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
              {dragActive 
                ? 'Drop file here to upload' 
                : 'Drop file here or '} 
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                {!dragActive && 'click to browse'}
              </span>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Supports: {ACCEPTED_FILE_TYPES.replaceAll(',', ', ')}
            </p>
            {/* File type icons */}
            <div className="flex gap-2 mt-4">
              <span className="rounded-md bg-red-50 dark:bg-red-900/20 p-2 text-red-500 dark:text-red-400">
                <FileText size={16} />
              </span>
              <span className="rounded-md bg-blue-50 dark:bg-blue-900/20 p-2 text-blue-500 dark:text-blue-400">
                <FileText size={16} />
              </span>
              <span className="rounded-md bg-gray-50 dark:bg-gray-700 p-2 text-gray-500 dark:text-gray-400">
                <FileText size={16} />
              </span>
            </div>
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
          renderFileThumbnail()
        )}
        
        {/* File Read Error Display */}
        {fileReadError && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{fileReadError}</AlertDescription>
          </Alert>
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
          <div className="mb-3 flex items-center border-t pt-4 dark:border-gray-700">
            <BookOpen className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">Study Material Options</h3>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 ml-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                    <Info className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs p-3 text-xs bg-gray-800 text-white dark:bg-gray-700 rounded-md shadow-lg">
                  <p>Customize the format, length, and focus of the generated study material. Your choices tailor the output to your learning style.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {/* Use existing options selector */}
          <SummaryOptionsSelector
            options={summaryOptions}
            onChange={handleOptionsChange}
            onApply={summarizeDocument}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="px-6 pb-6 flex flex-col items-center text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center justify-center mb-2">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-2 border-indigo-200 dark:border-indigo-900/50"></div>
              <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-t-2 border-indigo-500 dark:border-indigo-400 animate-spin"></div>
              <Loader2 className="absolute top-0 left-0 w-12 h-12 text-indigo-500 dark:text-indigo-400 animate-pulse" />
            </div>
          </div>
          <span className="font-medium mb-1">{processingProgress.stage || "Processing..."}</span>
          
          {processingProgress.totalChunks > 0 && (
            <div className="w-full max-w-xs mt-2">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>Progress</span>
                <span>{processingProgress.processedChunks} / {processingProgress.totalChunks} sections</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mt-1 overflow-hidden">
                <div
                  className="bg-indigo-500 dark:bg-indigo-600 h-1.5 rounded-full transition-all duration-500 relative"
                  style={{ width: `${progressPercentage}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                </div>
              </div>
            </div>
          )}
          
          {processingProgress.error && (
            <span className="text-red-500 dark:text-red-400 text-xs mt-2 bg-red-50 dark:bg-red-900/20 p-2 rounded-md">
              {processingProgress.error}
            </span>
          )}
        </div>
      )}

      {/* Footer with Generate Button - Only shown when not loading */}
      {file && !isLoading && (
        <CardFooter className="flex justify-end px-6 pb-6 pt-0">
          <Button
            onClick={summarizeDocument}
            disabled={!file}
            className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600 text-white font-medium py-2 px-4 rounded-lg"
          >
            Generate Study Material
          </Button>
        </CardFooter>
      )}
      
      {/* Animation styles */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-in-out;
        }
        
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </Card>
  );
};

export default EnhancedDocumentUploader;