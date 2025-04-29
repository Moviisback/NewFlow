'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from "@/hooks/use-toast";
import { Search, File, FileText, Settings, X, Upload } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { summarizeDocumentWithGoogle } from '@/ai/flows/summarize-document-google';
import { SummaryOptions, AIProvider, SummaryLength, FocusArea } from '@/app/types/summary-options';
// import { motion } from 'framer-motion'; // Add framer-motion for animations

// Creating an improved EmptyState component with animation
const EmptyState = ({ onUpload }: { onUpload: () => void }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 p-3 rounded-full bg-muted">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground">
          <Upload size={16} />
        </div>
      </div>
      
      <h3 className="text-xl font-semibold mb-2">
        Let's get started!
      </h3>
      
      <p className="text-muted-foreground mb-6">
        Upload your first study material to create summaries and study aids
      </p>
      
      <Button onClick={onUpload} className="gap-2">
        Upload Document
      </Button>
      
      <p className="text-xs text-muted-foreground mt-4">
        Accepted formats: PDF, DOCX, TXT
      </p>
    </div>
  );
};

// Document interface
interface Document {
  id: string;
  name: string;
  uploadDate: string;
  size: string;
  pages: number;
  status: 'Processing' | 'Completed' | 'Failed';
  summary?: string;
  failureReason?: string;
  fileContent?: string;
  summaryOptions?: SummaryOptions;
}

// Document List component
const DocumentList = ({ 
  documents, 
  handleDeleteDocument, 
  handleShareDocument, 
  handleViewDocument,
  retryUpload 
}: { 
  documents: Document[], 
  handleDeleteDocument: (id: string) => Promise<void>, 
  handleShareDocument: (doc: Document) => void, 
  handleViewDocument: (doc: Document) => void,
  retryUpload: (doc: Document) => Promise<void> 
}) => {
  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <Card key={doc.id} className="overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between p-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="p-2 rounded-md bg-muted flex items-center justify-center">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">
                  {doc.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {doc.uploadDate} • {doc.size} • {doc.pages} pages
                </p>
              </div>
              <div className="ml-auto md:ml-12 mt-2 md:mt-0">
                <span className={`px-2 py-1 rounded-full text-xs ${
                  doc.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                  doc.status === 'Processing' ? 'bg-blue-100 text-blue-800' : 
                  'bg-red-100 text-red-800'
                }`}>
                  {doc.status}
                </span>
              </div>
            </div>
            <div className="flex gap-2 mt-4 md:mt-0">
              {doc.status === 'Completed' && (
                <Button variant="outline" size="sm" onClick={() => handleViewDocument(doc)}>
                  View
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => handleShareDocument(doc)}>
                Share
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDeleteDocument(doc.id)}>
                Delete
              </Button>
              {doc.status === 'Failed' && (
                <Button variant="outline" size="sm" onClick={() => retryUpload(doc)}>
                  Retry
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

// Quiz options interface
interface QuizOptions {
  questionCount: number;
  difficulty: 'easy' | 'medium' | 'hard';
  questionTypes: string[];
}

export default function DocumentsPage() {
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showCustomizationDialog, setShowCustomizationDialog] = useState(false);
  const [showUploadSuccess, setShowUploadSuccess] = useState(false);
  const [viewDocument, setViewDocument] = useState<Document | null>(null);
  const [summaryOptions, setSummaryOptions] = useState<SummaryOptions>({
    summaryLength: 'medium',
    focusArea: 'general',
    includeQuestions: false,
    simplifyLanguage: false,
    languageLevel: 3,
    aiProvider: 'googleAI'
  });

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      // Replace with your actual data fetching logic
      // For now, we'll start with an empty array
      setDocuments([]);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        variant: 'destructive',
        title: "Couldn't load your documents",
        description: "We had trouble connecting to the server. Try refreshing the page.",
      });
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      // Implement your delete logic here
      // Example: await api.deleteDocument(documentId);
      
      // Update local state after successful delete
      setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== documentId));
      
      toast({
        title: "Document deleted",
        description: "Your document has been successfully removed.",
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        variant: 'destructive',
        title: "Delete failed",
        description: "We couldn't delete this document. Please try again.",
      });
    }
  };

  const handleCreateQuiz = async (documentId: string, quizOptions: QuizOptions) => {
    try {
      // Implement your quiz creation logic here
      // Example: await api.createQuiz(documentId, quizOptions);
      
      // Return success
      return Promise.resolve();
    } catch (error) {
      console.error('Error creating quiz:', error);
      return Promise.reject(error);
    }
  };

  const handleShareDocument = (document: Document) => {
    // Implement your share logic here
    // Example: Generate and copy a shareable link
    navigator.clipboard.writeText(`https://studyflow.app/shared/doc/${document.id}`);
    toast({
      title: "Link copied!",
      description: "Share link is now in your clipboard.",
    });
  };

  const handleViewDocument = (document: Document) => {
    setViewDocument(document);
  };

  const handleFileSelection = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
      setShowCustomizationDialog(true);
    }
  }, []);

  const handleUploadWithOptions = async () => {
    if (!selectedFile) return;
    
    setShowCustomizationDialog(false);
    setIsLoading(true);
    setUploadProgress(0);

    try {
      let fileContent = '';
      const fileType = selectedFile.name.split('.').pop()?.toLowerCase();

      if (fileType === 'pdf') {
        // Upload to API for server-side PDF parsing
        const formData = new FormData();
        formData.append('file', selectedFile);

        console.log(`Sending PDF for parsing: ${selectedFile.name}, ${selectedFile.size} bytes`);

        const response = await fetch('/api/parse-pdf', {
          method: 'POST',
          body: formData,
        });

        const responseText = await response.text();
        console.log('Raw response from PDF parser:', responseText);

        if (!response.ok) {
          console.error('PDF parsing API request failed:', responseText);
          throw new Error(`Failed to parse PDF: ${responseText}`);
        }

        try {
          const data = JSON.parse(responseText);
          console.log('Parsed response data:', data);
          
          // Check if we have an error or just empty text
          if (data.error) {
            console.error('Parser reported error:', data.error);
            
            // Show detailed error information
            toast({
              variant: 'default',
              title: "PDF Parsing Issue",
              description: data.error + (data.suggestion ? `\n\n${data.suggestion}` : ''),
            });
            
            // If the PDF couldn't be parsed at all, throw an error
            if (!data.text || data.text.length === 0) {
              throw new Error(data.error || 'No text could be extracted from the PDF.');
            }
          }
          
          fileContent = data.text;
          console.log('Extracted text length:', fileContent.length);
          console.log('First 200 characters:', fileContent.substring(0, 200));
          
          // If we got empty text, throw an error
          if (!fileContent || fileContent.trim().length === 0) {
            console.error('PDF parsing returned empty content');
            throw new Error('The PDF appears to be empty or contains only images.');
          }
        } catch (jsonError) {
          console.error('JSON parsing error:', jsonError);
          throw new Error('Invalid response from PDF parser');
        }
        
        console.log('Extracted PDF text length:', fileContent.length);
      } else if (fileType === 'docx') {
        // For DOCX files, use mammoth
        const mammoth = await import('mammoth');
        const arrayBuffer = await selectedFile.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        fileContent = result.value;
      } else {
        // For text files (txt, csv, etc.)
        fileContent = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsText(selectedFile);
        });
      }

      if (!fileContent) {
        throw new Error('No content extracted from file');
      }

      console.log('Extracted content length:', fileContent.length);
      await summarizeAndCreateDocument(selectedFile, fileContent);
    } catch (error) {
      console.error('Error processing file:', error);
      setIsLoading(false);
      toast({
        variant: 'destructive',
        title: "Upload problem",
        description: error instanceof Error ? error.message : "We had trouble reading your file. Please try again.",
      });
    }
  };

  const summarizeAndCreateDocument = async (file: File, fileContent: string) => {
    try {
      console.log('=== Starting summarization process ===');
      console.log('Attempting to summarize. Extracted raw content:', fileContent);
      console.log('Content length after trim:', fileContent.trim().length);
      
      // First, check if we have actual content to summarize
      if (!fileContent || fileContent.trim().length === 0) {
        console.error('Throwing error: No content available to summarize.');
        throw new Error('No content available to summarize.');
      }
      
      // Log content length for debugging
      console.log('Document content length:', fileContent.length);
      console.log('First 500 characters:', fileContent.substring(0, 500));
      console.log('Summary options:', summaryOptions);
      
      // Call the API endpoint for summarization
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentContent: fileContent,
          summaryOptions: summaryOptions,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate summary');
      }
      
      const summary = await response.json();
      
      if (!summary.summary) {
        throw new Error('No summary returned from the API');
      }
      
      console.log('API Summary:', summary.summary);
      
      const newDocument: Document = {
        id: Math.random().toString(36).substring(7),
        name: file.name,
        uploadDate: new Date().toLocaleDateString(),
        pages: 10, // TODO: Dynamically determine pages
        size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
        status: 'Completed',
        summary: summary.summary,
        fileContent: fileContent,
        summaryOptions: summaryOptions
      };
      
      setDocuments(prevDocuments => [...prevDocuments, newDocument]);
      setIsLoading(false);
      setShowUploadSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowUploadSuccess(false);
      }, 3000);
      
      toast({
        title: "Ready to study! 🎉",
        description: `Your summary is ready to review.`,
      });
    } catch (error: unknown) {
      console.error('AI Summary Error:', error);
      setIsLoading(false);
      
      // Provide more specific error messages
      let errorMessage = "We couldn't summarize your document.";
      if (error instanceof Error) {
        if (error.message.includes('No content')) {
          errorMessage = "The document appears to be empty or the text couldn't be extracted.";
        } else if (error.message.includes('API key')) {
          errorMessage = "There's an issue with the AI configuration. Please contact support.";
        }
      }
      
      toast({
        variant: 'destructive',
        title: "Summary failed",
        description: errorMessage,
      });
      
      // Add the document with a failed status
      const failedDocument: Document = {
        id: Math.random().toString(36).substring(7),
        name: file.name,
        uploadDate: new Date().toLocaleDateString(),
        pages: 0,
        size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
        status: 'Failed',
        failureReason: error instanceof Error ? error.message : 'Unknown error'
      };
      
      setDocuments(prevDocuments => [...prevDocuments, failedDocument]);
    } finally {
      setIsLoading(false);
    }
  };

  const retryUpload = async (document: Document) => {
    setIsLoading(true);
    try {
      // Re-summarize the document with the same options or default options
      if (document.fileContent) {
        const file = new File([new Blob([document.fileContent])], document.name);
        await summarizeAndCreateDocument(
          file,
          document.fileContent
        );
      } else {
        throw new Error("No file content available for retry.");
      }
    } catch (error: unknown) {
      console.error('Retry Failed:', error);
      toast({
        variant: 'destructive',
        title: "Retry didn't work",
        description: `We couldn't re-summarize your document. Try uploading again.`,
      });
      setDocuments(prevDocuments =>
        prevDocuments.map(doc =>
          doc.id === document.id ? { 
            ...doc, 
            status: 'Failed', 
            failureReason: error instanceof Error ? error.message : 'Unknown error' 
          } : doc
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const {getRootProps, getInputProps, isDragActive} = useDropzone({
    onDrop: handleFileSelection, 
    accept: {
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    noClick: false,
    noDrag: false
  });
  
  const cancelUpload = () => {
    setSelectedFile(null);
    setShowCustomizationDialog(false);
  };

  const openUploadDialog = () => {
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      (fileInput as HTMLInputElement).click();
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with friendlier titles and subtitles */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          My Study Materials
        </h1>
        <p className="text-muted-foreground mt-2">
          Upload documents to create AI-powered summaries and study aids
        </p>
      </header>

      {/* Upload success animation */}
      {showUploadSuccess && (
        <Card className="mb-6 bg-green-50 border-green-200">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="p-1 rounded-full bg-green-100">
              <div className="rounded-full bg-green-500 text-white p-1">
                <Icons.check className="h-4 w-4" />
              </div>
            </div>
            <p className="font-medium text-green-800">
              Document uploaded successfully!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Search and Upload Area - Mobile Friendly Layout */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative w-full md:w-2/3">
          <div className="relative">
            <Input
              placeholder="Find your documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
          </div>
        </div>
        <div className="w-full md:w-1/3">
          <div {...getRootProps()}>
            <input {...getInputProps()} />
            <Button className="w-full gap-2 bg-primary">
              <Upload className="h-4 w-4" />
              Upload Document
            </Button>
          </div>
        </div>
      </div>

      {/* Documents List */}
      {isLoading ? (
        <Card className="w-full flex justify-center items-center p-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <p className="text-lg font-medium mb-2">
                Creating your summary...
                <span className="inline-block ml-3">
                  <Icons.spinner className="h-5 w-5 animate-spin" />
                </span>
                This might take a minute for larger documents
              </p>
            </div>
            <p className="text-muted-foreground">Loading documents...</p>
          </div>
        </Card>
      ) : documents.length > 0 ? (
        <DocumentList 
          documents={documents}
          handleDeleteDocument={handleDeleteDocument}
          handleShareDocument={handleShareDocument}
          handleViewDocument={handleViewDocument}
          retryUpload={retryUpload}
        />
      ) : (
        <Card className="w-full bg-background border-dashed border-2">
          <CardContent className="p-0">
            <EmptyState onUpload={openUploadDialog} />
          </CardContent>
        </Card>
      )}

      {/* Customization Dialog - Made more student-friendly */}
      <Dialog open={showCustomizationDialog} onOpenChange={setShowCustomizationDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Customize Your Summary
            </DialogTitle>
            <DialogDescription>
              Tell us how you'd like your study notes to be prepared.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {selectedFile && (
              <div className="flex items-center gap-2 p-2 bg-muted rounded">
                <File className="h-5 w-5 text-primary" />
                <span className="font-medium">{selectedFile.name}</span>
                <span className="text-sm text-muted-foreground">
                  ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                </span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="ai-model">
                AI Model
              </Label>
              <Select 
                value={summaryOptions.aiProvider} 
                onValueChange={(value) => setSummaryOptions({...summaryOptions, aiProvider: value as AIProvider})}
              >
                <SelectTrigger id="ai-model">
                  <SelectValue placeholder="Select AI model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="googleAI">Google AI (Recommended)</SelectItem>
                  <SelectItem value="openAI">OpenAI</SelectItem>
                  <SelectItem value="claude">Anthropic Claude</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary-length">
                Length
              </Label>
              <Select 
                value={summaryOptions.summaryLength} 
                onValueChange={(value) => setSummaryOptions({...summaryOptions, summaryLength: value as SummaryLength})}
              >
                <SelectTrigger id="summary-length">
                  <SelectValue placeholder="Select length" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Short (Quick review)</SelectItem>
                  <SelectItem value="medium">Medium (Balanced)</SelectItem>
                  <SelectItem value="detailed">Detailed (Comprehensive)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="focus-area">
                Focus
              </Label>
              <Select 
                value={summaryOptions.focusArea} 
                onValueChange={(value) => setSummaryOptions({...summaryOptions, focusArea: value as FocusArea})}
              >
                <SelectTrigger id="focus-area">
                  <SelectValue placeholder="Select focus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Overview</SelectItem>
                  <SelectItem value="key-points">Key Points & Concepts</SelectItem>
                  <SelectItem value="research">Research Findings</SelectItem>
                  <SelectItem value="action-items">Action Items & Takeaways</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language-level">
                Complexity
              </Label>
              <div className="flex flex-col space-y-1">
                <Slider
                  id="language-level"
                  value={[summaryOptions.languageLevel]}
                  min={1}
                  max={5}
                  step={1}
                  onValueChange={(value) => setSummaryOptions({...summaryOptions, languageLevel: value[0]})}
                  className="mt-2"
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>
                    Simple & Clear
                  </span>
                  <span>
                    Academic
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <Label htmlFor="include-questions" className="flex items-center gap-2">
                  Include Study Questions
                  <span className="text-xs text-muted-foreground font-normal">
                    Add helpful questions to test your knowledge
                  </span>
                </Label>
              </div>
              <Switch 
                id="include-questions" 
                checked={summaryOptions.includeQuestions}
                onCheckedChange={(checked) => setSummaryOptions({...summaryOptions, includeQuestions: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <Label htmlFor="simplify-language" className="flex items-center gap-2">
                  Simplify Language
                  <span className="text-xs text-muted-foreground font-normal">
                    Make complex topics easier to understand
                  </span>
                </Label>
              </div>
              <Switch 
                id="simplify-language" 
                checked={summaryOptions.simplifyLanguage}
                onCheckedChange={(checked) => setSummaryOptions({...summaryOptions, simplifyLanguage: checked})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cancelUpload}>
              Cancel
            </Button>
            <Button onClick={handleUploadWithOptions} disabled={!selectedFile}>
              <Upload className="h-4 w-4 mr-2" />
              Process Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Document Dialog */}
      <Dialog open={!!viewDocument} onOpenChange={() => setViewDocument(null)}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{viewDocument?.name}</DialogTitle>
            <DialogDescription>
              Document summary and details
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Summary</h3>
                <div className="bg-muted p-4 rounded-md">
                  <p className="whitespace-pre-wrap">{viewDocument?.summary || 'No summary available'}</p>
                </div>
              </div>
              
              {viewDocument?.summaryOptions && (
                <div>
                  <h3 className="font-semibold mb-2">Summary Options Used</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Summary Length:</p>
                      <p>{viewDocument.summaryOptions.summaryLength}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Focus Area:</p>
                      <p>{viewDocument.summaryOptions.focusArea}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Language Level:</p>
                      <p>{viewDocument.summaryOptions.languageLevel}/5</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">AI Provider:</p>
                      <p>{viewDocument.summaryOptions.aiProvider}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div>
                <h3 className="font-semibold mb-2">Document Info</h3>
                <div className="space-y-2">
                  <p><span className="text-muted-foreground">Uploaded:</span> {viewDocument?.uploadDate}</p>
                  <p><span className="text-muted-foreground">Size:</span> {viewDocument?.size}</p>
                  <p><span className="text-muted-foreground">Pages:</span> {viewDocument?.pages}</p>
                  <p><span className="text-muted-foreground">Status:</span> {viewDocument?.status}</p>
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDocument(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}