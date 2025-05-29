// components/study-viewer/components/TextDocumentViewer.tsx
import React, { useEffect, useState } from 'react';
import { FileText, AlertTriangle, FileType2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Fix the import path - import TextDensity directly from the parent types file
import { TextDensity } from '../types';

interface TextDocumentViewerProps {
  documentContent: string;
  documentName: string;
  fontSize: number;
  textDensity: TextDensity;
  onDownload?: () => void;
}

const TextDocumentViewer: React.FC<TextDocumentViewerProps> = ({
  documentContent,
  documentName,
  fontSize,
  textDensity,
  onDownload
}) => {
  const [formattedContent, setFormattedContent] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [contentType, setContentType] = useState<'text' | 'pdf' | 'binary'>('text');

  // Debug logging for download function
  useEffect(() => {
    console.log("TextDocumentViewer - onDownload available:", !!onDownload);
  }, [onDownload]);

  // Process document content when it changes
  useEffect(() => {
    if (!documentContent) {
      setFormattedContent('<p class="text-gray-500 dark:text-gray-400">No original content available.</p>');
      setIsProcessing(false);
      return;
    }

    // Detect content type
    if (isPdfContent(documentContent)) {
      setContentType('pdf');
      processPdfContent(documentContent, documentName);
    } else if (isBinaryContent(documentContent)) {
      setContentType('binary');
      setFormattedContent(createBinaryContentMessage(documentName));
      setIsProcessing(false);
    } else {
      setContentType('text');
      setFormattedContent(formatTextContent(documentContent, documentName));
      setIsProcessing(false);
    }
  }, [documentContent, documentName]);

  // Process PDF content
  const processPdfContent = async (pdfContent: string, fileName: string) => {
    try {
      const extractedText = await extractPdfText(pdfContent);
      
      if (extractedText && extractedText.trim().length > 0) {
        setFormattedContent(formatTextContent(extractedText, fileName));
      } else {
        setFormattedContent(createEmptyPdfMessage(fileName));
      }
    } catch (error) {
      console.error('Error processing PDF:', error);
      setFormattedContent(createEmptyPdfMessage(fileName));
      setIsError(true);
    } finally {
      setIsProcessing(false);
    }
  };

  // Check if content is a PDF
  const isPdfContent = (content: string): boolean => {
    return content.trim().startsWith('%PDF-') || 
           content.includes('%PDF-1.') || 
           content.includes('Binary PDF Document') ||
           documentName.toLowerCase().endsWith('.pdf');
  };

  // Check if content appears to be binary data
  const isBinaryContent = (content: string): boolean => {
    // If more than 5% of the first 1000 chars are non-printable, it's likely binary
    const sampleSize = Math.min(1000, content.length);
    const sample = content.substring(0, sampleSize);
    let nonPrintableCount = 0;
    
    for (let i = 0; i < sample.length; i++) {
      const code = sample.charCodeAt(i);
      if (code < 32 && code !== 9 && code !== 10 && code !== 13) { // Exclude tab, LF, CR
        nonPrintableCount++;
      }
    }
    
    return (nonPrintableCount / sampleSize) > 0.05 || 
           content.includes('Binary Document') ||
           content.includes('File content will be extracted by the server');
  };

  // Extract text from PDF content
  const extractPdfText = async (pdfContent: string): Promise<string> => {
    try {
      // Simple extraction of text from PDF content
      const textLines: string[] = [];
      const lines = pdfContent.split('\n');
      
      for (const line of lines) {
        if (line.includes('BT') && line.includes('ET')) { // Text object markers
          let text = line.replace(/BT|ET/g, '').trim();
          if (text) textLines.push(text);
        } else if (line.includes('(') && line.includes(')') && line.includes('Tj')) {
          // Extract text between parentheses
          const match = line.match(/\((.*?)\)\s*Tj/);
          if (match && match[1]) textLines.push(match[1]);
        }
      }
      
      return textLines.join('\n') || extractTextFromBinary(pdfContent);
    } catch (error) {
      console.error('PDF extraction error:', error);
      return extractTextFromBinary(pdfContent);
    }
  };
  
  // Fallback extraction for binary-like content
  const extractTextFromBinary = (content: string): string => {
    // Try to extract any readable text from binary-like content
    const textChunks: string[] = [];
    let currentChunk = '';
    
    for (let i = 0; i < content.length; i++) {
      const code = content.charCodeAt(i);
      // If it's a printable ASCII character
      if (code >= 32 && code <= 126) {
        currentChunk += content[i];
      } else if (code === 10 || code === 13) { // newlines
        currentChunk += '\n';
      } else {
        // Non-printable character - if we have a chunk, save it
        if (currentChunk.length > 20) { // Only keep substantial chunks
          textChunks.push(currentChunk);
        }
        currentChunk = '';
      }
    }
    
    // Add the last chunk if it's substantial
    if (currentChunk.length > 20) {
      textChunks.push(currentChunk);
    }
    
    return textChunks.join('\n\n');
  };

  // Format text content with basic HTML structure
  const formatTextContent = (content: string, fileName: string): string => {
    if (!content || content.trim().length === 0) {
      return '<p class="text-gray-500 dark:text-gray-400">No content available.</p>';
    }

    // Split content into lines for processing
    const lines = content.split('\n');
    const processedLines: string[] = [];
    let inCodeBlock = false;
    let inListBlock = false;
    
    // Add title
    processedLines.push(`<h1 class="text-xl font-bold mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">${fileName}</h1>`);
    
    // Process each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) {
        if (inListBlock) {
          processedLines.push('</ul>');
          inListBlock = false;
        }
        continue;
      }
      
      // Check for page markers (from PDF extraction)
      if (line.startsWith('--- Page ') && line.endsWith(' ---')) {
        if (inListBlock) {
          processedLines.push('</ul>');
          inListBlock = false;
        }
        if (inCodeBlock) {
          processedLines.push('</pre>');
          inCodeBlock = false;
        }
        
        processedLines.push(`<div class="text-sm text-center text-gray-400 dark:text-gray-500 my-4 border-t border-gray-200 dark:border-gray-700 pt-2">${line}</div>`);
        continue;
      }
      
      // Check for potential headings
      const isHeading = (
        (line.toUpperCase() === line && line.length > 10 && line.length < 80) || 
        (i > 0 && i < lines.length - 1 && !lines[i-1].trim() && !lines[i+1].trim() && line.length < 100) ||
        /^\d+\.\s+[A-Z]/.test(line) || // Numbered headings
        /^[A-Z][A-Za-z\s]{5,50}$/.test(line) // Title case phrases
      );
      
      if (isHeading) {
        if (inCodeBlock) {
          processedLines.push('</pre>');
          inCodeBlock = false;
        }
        if (inListBlock) {
          processedLines.push('</ul>');
          inListBlock = false;
        }
        
        const headingLevel = line.length < 30 ? 'h2' : 'h3';
        const headingClass = headingLevel === 'h2' 
          ? 'text-lg font-semibold mt-6 mb-2 text-indigo-700 dark:text-indigo-400' 
          : 'text-md font-medium mt-4 mb-2 text-gray-800 dark:text-gray-200';
        const headingId = `heading-${line.toLowerCase().replace(/[^\w]+/g, '-').substring(0, 30)}`;
        processedLines.push(`<${headingLevel} id="${headingId}" class="${headingClass}">${escapeHtml(line)}</${headingLevel}>`);
      } 
      // Check for list items
      else if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*') || /^\d+[\.\)]/.test(line)) {
        if (inCodeBlock) {
          processedLines.push('</pre>');
          inCodeBlock = false;
        }
        
        if (!inListBlock) {
          processedLines.push('<ul class="list-disc ml-5 mb-4">');
          inListBlock = true;
        }
        const listItemContent = line.replace(/^[•\-*]|\d+[\.\)]/, '').trim();
        processedLines.push(`<li class="mb-1">${escapeHtml(listItemContent)}</li>`);
      }
      // Code or preformatted text detection
      else if (lines[i].search(/\S/) > 3 || line.includes('function ') || line.includes('class ') || line.startsWith('import ')) {
        if (inListBlock) {
          processedLines.push('</ul>');
          inListBlock = false;
        }
        
        if (!inCodeBlock) {
          processedLines.push('<pre class="bg-gray-50 dark:bg-gray-800 p-3 rounded-md my-3 font-mono text-sm overflow-x-auto">');
          inCodeBlock = true;
        }
        processedLines.push(escapeHtml(lines[i]));
      }
      // Regular paragraph
      else {
        if (inCodeBlock) {
          processedLines.push('</pre>');
          inCodeBlock = false;
        }
        if (inListBlock) {
          processedLines.push('</ul>');
          inListBlock = false;
        }
        
        // Detect if this line is likely part of the previous paragraph
        const isParagraphContinuation = i > 0 && 
                                      processedLines.length > 0 && 
                                      processedLines[processedLines.length - 1].startsWith('<p') &&
                                      line.length > 0 && 
                                      !isHeading && 
                                      !line.startsWith('•') && 
                                      !line.startsWith('-');
        
        if (isParagraphContinuation) {
          // Remove the closing paragraph tag and add this line
          const lastLine = processedLines.pop();
          if (lastLine) {
            const newLastLine = lastLine.replace('</p>', ' ' + escapeHtml(line) + '</p>');
            processedLines.push(newLastLine);
          }
        } else {
          processedLines.push(`<p class="mb-3">${escapeHtml(line)}</p>`);
        }
      }
    }
    
    // Close any open blocks
    if (inListBlock) processedLines.push('</ul>');
    if (inCodeBlock) processedLines.push('</pre>');
    
    return processedLines.join('\n');
  };
  
  // Create a message for binary content
  const createBinaryContentMessage = (fileName: string): string => {
    return `
      <div class="p-6 flex flex-col items-center justify-center text-center">
        <div class="w-16 h-16 bg-amber-50 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-8 w-8 text-amber-500 dark:text-amber-400">
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path>
            <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
            <path d="M10 12v-2a2 2 0 1 1 4 0v2"></path>
            <path d="M8 18h8"></path>
            <path d="M10 12h4"></path>
          </svg>
        </div>
        <h2 class="text-lg font-semibold mb-2">Binary Document Content</h2>
        <p class="text-gray-600 dark:text-gray-400 max-w-lg mb-4">
          "${fileName}" appears to contain binary or non-text content that cannot be displayed directly.
        </p>
        <div class="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 text-left rounded-md">
          <p class="text-sm text-amber-800 dark:text-amber-300">
            To view this document, you may need to download it and open it with its associated application.
          </p>
        </div>
        ${onDownload ? `
        <div class="mt-6">
          <button 
            class="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-medium"
            onclick="document.dispatchEvent(new CustomEvent('document-download-click'))"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Download Document
          </button>
        </div>
        ` : ''}
      </div>
    `;
  };
  
  // Set up event listener for custom download button click
  useEffect(() => {
    const handleDownloadClick = () => {
      if (onDownload) {
        console.log("Custom download button clicked");
        onDownload();
      }
    };
    
    document.addEventListener('document-download-click', handleDownloadClick);
    return () => {
      document.removeEventListener('document-download-click', handleDownloadClick);
    };
  }, [onDownload]);
  
  // Create a message for PDFs that couldn't be extracted
  const createEmptyPdfMessage = (fileName: string): string => {
    return `
      <div class="p-6 flex flex-col items-center justify-center text-center">
        <div class="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-8 w-8 text-blue-500 dark:text-blue-400">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
        </div>
        <h2 class="text-lg font-semibold mb-2">PDF Document</h2>
        <p class="text-gray-600 dark:text-gray-400 max-w-lg mb-4">
          "${fileName}" is a PDF document. The text content could not be fully extracted for display here.
        </p>
        <div class="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 text-left rounded-md">
          <p class="text-sm text-blue-800 dark:text-blue-300">
            This may be because the PDF contains scanned images of text, is protected, or uses complex formatting. 
            For the best experience with this document, please use the "Summary" view or download the document.
          </p>
        </div>
        ${onDownload ? `
        <div class="mt-6">
          <button 
            class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
            onclick="document.dispatchEvent(new CustomEvent('document-download-click'))"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Download PDF
          </button>
        </div>
        ` : ''}
      </div>
    `;
  };

  // Helper function to escape HTML special characters
  const escapeHtml = (unsafe: string): string => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // Show loading state
  if (isProcessing) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-gray-500 dark:text-gray-400 flex flex-col items-center">
          <div className="w-6 h-6 border-t-2 border-b-2 border-indigo-500 rounded-full animate-spin mb-3"></div>
          Loading document content...
        </div>
      </div>
    );
  }

  // Show error state
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <div className="w-16 h-16 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="h-8 w-8 text-red-500 dark:text-red-400" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Error Loading Document</h3>
        <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
          There was a problem processing this document. It may be in an unsupported format or contain corrupted data.
        </p>
        {onDownload && (
          <Button 
            onClick={onDownload}
            className="mt-4 bg-red-600 hover:bg-red-700 text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Original
          </Button>
        )}
      </div>
    );
  }

  // Main content display
  return (
    <div className="px-8 py-6 mx-auto" style={{ 
      fontSize: `${fontSize}px`,
      lineHeight: textDensity === 'comfortable' ? '1.8' : '1.5',
      maxWidth: contentType === 'binary' || contentType === 'pdf' ? 'none' : (textDensity === 'comfortable' ? '3xl' : '4xl')
    }}>
      {/* Document actions */}
      {onDownload && (
        <div className="flex justify-end mb-4">
          <Button 
            onClick={onDownload}
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download Original</span>
          </Button>
        </div>
      )}
      
      {/* Content */}
      <div 
        className="document-content prose prose-indigo dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: formattedContent }}
      />
      
      {/* Footer with download button for text content */}
      {onDownload && contentType === 'text' && (
        <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-center">
          <Button 
            onClick={onDownload}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Document
          </Button>
        </div>
      )}
    </div>
  );
};

export default TextDocumentViewer;