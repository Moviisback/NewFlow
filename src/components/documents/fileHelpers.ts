// components/documents/fileHelpers.ts
import { ACCEPTED_FILE_TYPES, ACCEPTED_MIME_TYPES, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from './types';
import jsPDF from 'jspdf';

// Helper function to read file content
export const readFileContent = async (file: File): Promise<string> => {
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
    reader.readAsText(file); // Reads as text, suitable for TXT, and potentially for extracting text from other formats if pre-processed
  });
};

// Validate file size and type
export const validateFile = (file: File): { valid: boolean; error?: string } => {
  // Check file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max: ${MAX_FILE_SIZE_MB} MB.`
    };
  }

  // Check file type
  const fileExtension = file.name.split('.').pop()?.toLowerCase();

  // Assuming ACCEPTED_FILE_TYPES is a comma-separated string like ".txt,.pdf,.docx"
  const acceptedExtensionsArray = ACCEPTED_FILE_TYPES.split(',').map(ext => ext.trim().toLowerCase());
  const isValidExtension = fileExtension && acceptedExtensionsArray.includes(`.${fileExtension}`);

  // Assuming ACCEPTED_MIME_TYPES is an array of strings from your types.ts
  const isValidMime = ACCEPTED_MIME_TYPES.includes(file.type);

  // If the browser doesn't provide a MIME type, but the extension is valid, we can be more lenient.
  // Some systems/browsers might not set file.type correctly for all file types (e.g., .docx sometimes).
  if (file.type === '' && isValidExtension) {
    return { valid: true };
  }

  // If both checks are available, one of them must be true.
  // If MIME type is available and invalid, and extension is also invalid, then it's an error.
  if (!isValidExtension && !isValidMime) {
    return {
      valid: false,
      error: `Unsupported file format. Please upload ${ACCEPTED_FILE_TYPES.replaceAll(',', ', ')}.`
    };
  }

  // If we reach here, it means either:
  // 1. Extension is valid (MIME might be empty or also valid)
  // 2. MIME is valid (Extension might be different but MIME is what we trust in this case if extension isn't on the list)
  return { valid: true };
};

/**
 * Initiates a simple text file download
 * @param content Text content to download
 * @param filename Filename to use (without extension)
 */
export const downloadTextFile = (content: string, filename: string): void => {
  try {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log(`Text file download complete: ${filename}.txt`);
  } catch (error) {
    console.error('Error downloading text file:', error);
  }
};

/**
 * Initiates a download of the provided content - FIXED VERSION
 * @param content The string content to download
 * @param filename The base name for the downloaded file (without extension)
 * @param type The type of file to download, 'txt' or 'pdf'. Defaults to 'txt'
 */
export const downloadContent = (content: string, filename: string, type: 'txt' | 'pdf' = 'txt'): void => {
  if (!content) {
    console.warn("Attempted to download empty content");
    return;
  }
  
  console.log(`Downloading ${filename} as ${type}...`);
  
  // For text files, use the simple download method
  if (type === 'txt') {
    downloadTextFile(content, filename);
    return;
  }
  
  // For PDF, try to generate a better formatted file
  try {
    // Create new PDF document
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4'
    });
    
    // Set document properties
    doc.setProperties({
      title: filename,
      subject: 'Study Notes',
      author: 'Study Notes App',
      creator: 'Study Notes App'
    });
    
    // Configure text settings
    const FONT_SIZE = 11;
    const LINE_HEIGHT = 7; // mm
    const MARGIN = 20; // mm
    
    // Get page dimensions
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const textWidth = pageWidth - (MARGIN * 2);
    
    // Add title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(filename, MARGIN, MARGIN);
    
    // Reset to normal text settings
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FONT_SIZE);
    
    // Start position for content
    let y = MARGIN + 10;
    
    // Clean up text for better formatting
    const cleanText = content
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    // Split into paragraphs and process
    const paragraphs = cleanText.split('\n\n');
    
    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) continue;
      
      // Check if we need a new page
      if (y > pageHeight - MARGIN) {
        doc.addPage();
        y = MARGIN;
      }
      
      // Split paragraph into lines that fit the width
      const lines = doc.splitTextToSize(paragraph, textWidth);
      
      // Draw text lines
      for (const line of lines) {
        if (y > pageHeight - MARGIN) {
          doc.addPage();
          y = MARGIN;
        }
        
        doc.text(line, MARGIN, y);
        y += LINE_HEIGHT;
      }
      
      // Add space after paragraph
      y += 3;
    }
    
    // Save PDF file
    doc.save(`${filename}.pdf`);
    console.log(`PDF download complete: ${filename}.pdf`);
  } catch (error) {
    console.error('Error creating PDF:', error);
    // Fall back to text download if PDF creation fails
    console.log('Falling back to text download');
    downloadTextFile(content, filename);
  }
};

/**
 * Simplified download handler that ensures consistent behavior
 * @param content The content to download
 * @param filename The filename (without extension)
 * @param fileType The file extension/type (txt by default)
 * @returns A function that will trigger the download when called
 */
export const createDownloadHandler = (content: string, filename: string, fileType: string = 'txt') => {
  return () => {
    console.log(`Starting download: ${filename}.${fileType}`);
    
    try {
      // Simple approach for better reliability
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Make sure filename has proper extension
      const cleanFilename = filename.replace(/\.[^/.]+$/, ""); // Remove existing extension
      a.download = `${cleanFilename}.${fileType}`;
      
      // Append to body, click, and clean up
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log("Download completed successfully");
    } catch (error) {
      console.error("Error during download:", error);
      alert("Error downloading file. Please try again.");
    }
  };
};

// Load library items from localStorage
export const loadLibraryFromStorage = () => {
  try {
    const storedItems = localStorage.getItem('libraryItems');
    if (storedItems) {
      return JSON.parse(storedItems);
    }
    return null;
  } catch (error) {
    console.error("Error loading library from storage:", error);
    return null;
  }
};

// Save library items to localStorage
export const saveLibraryToStorage = (items: any[]) => {
  try {
    localStorage.setItem('libraryItems', JSON.stringify(items));
    return true;
  } catch (error) {
    console.error("Error saving library to storage:", error);
    return false;
  }
};