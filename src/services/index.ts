// src/services/pdf-parser/index.ts

// Define interfaces
export interface PDFInfo {
  PDFFormatVersion: string;
  IsAcroFormPresent: boolean;
  IsXFAPresent: boolean;
}

export interface PDFParseResult {
  text: string;
  numpages: number;
  numrender: number;
  info: PDFInfo;
  metadata: Record<string, unknown>;
  version: string;
  error?: string;
  suggestion?: string;
}

// PDF Parser Service
export class PDFParserService {
  /**
   * Parse PDF with fallback methods
   */
  static async parseWithFallback(buffer: Buffer): Promise<PDFParseResult> {
    let result: PDFParseResult = {
      text: '',
      numpages: 0,
      numrender: 0,
      info: {
        PDFFormatVersion: '',
        IsAcroFormPresent: false,
        IsXFAPresent: false
      },
      metadata: {},
      version: '',
    };

    // Method 1: Using pdf-parse library first (most reliable for serverless)
    try {
      console.log('Attempting to parse with pdf-parse...');
      const pdfjsLib = await import('pdf-parse');
      const pdfData = await pdfjsLib.default(buffer) as PDFParseResult;
      
      console.log(`pdf-parse extracted text length: ${pdfData.text.length}`);
      console.log(`First 200 characters: ${pdfData.text.substring(0, 200)}`);
      
      if (pdfData.text && pdfData.text.trim().length > 0) {
        console.log('Successfully parsed PDF with pdf-parse');
        return pdfData;
      } else {
        console.log('pdf-parse returned empty text');
        result = { ...result, ...pdfData };
      }
    } catch (pdfParseError) {
      console.error('pdf-parse failed:', pdfParseError);
    }
    
    // Method 2: Using pdfjs-dist without worker (better for serverless)
    try {
      console.log('Attempting to parse with pdfjs-dist (no worker)...');
      const pdfjs = await import('pdfjs-dist');
      
      // Disable worker to avoid serverless issues
      // @ts-ignore - TypeScript doesn't know about this property
      pdfjs.GlobalWorkerOptions.workerSrc = false;
      
      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(buffer)
      });
      
      const pdf = await loadingTask.promise;
      console.log(`PDF has ${pdf.numPages} pages`);
      result.numpages = pdf.numPages;
      
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        console.log(`Extracting text from page ${i}...`);
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }
      
      console.log(`pdfjs-dist extracted text length: ${fullText.length}`);
      
      if (fullText.trim().length > 0) {
        console.log('Successfully parsed PDF with pdfjs-dist');
        result.text = fullText.trim();
        return result;
      } else {
        console.log('pdfjs-dist returned empty text');
      }
    } catch (pdfjsError) {
      console.error('pdfjs-dist failed:', pdfjsError);
    }
    
    // Method 3: Using legacy pdfjs with worker
    try {
      console.log('Attempting to parse with legacy pdfjs...');
      // Import with dynamic path to avoid TypeScript errors
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf');
      
      // Use CDN-hosted worker
      // @ts-ignore - TypeScript doesn't know about this property
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
      
      const loadingTask = pdfjs.getDocument({
        data: buffer,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true,
      });
      
      const pdf = await loadingTask.promise;
      let fullText = '';
      result.numpages = pdf.numPages;
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }
      
      console.log(`Legacy pdfjs extracted text length: ${fullText.length}`);
      
      if (fullText.trim().length > 0) {
        console.log('Successfully parsed PDF with legacy pdfjs');
        result.text = fullText.trim();
        return result;
      } else {
        console.log('Legacy pdfjs returned empty text');
      }
    } catch (legacyError) {
      console.error('Legacy pdfjs failed:', legacyError);
    }
    
    // If all methods fail, return a more informative error
    console.error('All PDF parsing methods failed');
    
    result.error = 'Unable to extract text from PDF. The file might be: 1) Image-only (scanned) PDF requiring OCR, 2) Password-protected, 3) Corrupted, or 4) Using very complex formatting.';
    result.suggestion = 'If this is a scanned PDF, try converting it to a text-based PDF using OCR software first.';
    
    return result;
  }

  /**
   * Validate PDF content
   */
  static validatePDFContent(text: string): boolean {
    if (!text || text.trim().length === 0) {
      return false;
    }

    // Check if the text has meaningful content (not just whitespace or special characters)
    const meaningfulChars = text.replace(/[\s\n\r\t]/g, '').length;
    if (meaningfulChars < 10) {
      return false;
    }

    // Check if the text has some regular words (not just symbols or numbers)
    const words = text.match(/[a-zA-Z]{3,}/g);
    if (!words || words.length < 5) {
      return false;
    }

    return true;
  }
}