// src/app/api/parse-pdf/route.ts
import { NextResponse } from 'next/server';
import { PDFParserService } from '@/services/pdf-parser';

export async function POST(request: Request) {
  console.log('PDF parsing request received');
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.error('No file provided in the request');
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.includes('pdf')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a PDF file.' },
        { status: 400 }
      );
    }

    console.log(`Processing PDF file: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    try {
      // Use the service to parse with fallback methods
      const result = await PDFParserService.parseWithFallback(buffer);
      
      // Validate the content
      if (result.text && PDFParserService.validatePDFContent(result.text)) {
        console.log('Successfully parsed PDF with valid content');
        return NextResponse.json({ 
          text: result.text,
          numpages: result.numpages,
          info: result.info
        });
      } else {
        // If we have an error from the service, return it
        if (result.error) {
          return NextResponse.json({ 
            text: result.text || '',
            error: result.error,
            suggestion: result.suggestion
          });
        }
        
        // Otherwise, return a generic error
        return NextResponse.json({ 
          text: '',
          error: 'Could not extract meaningful text from the PDF.',
          suggestion: 'Ensure the PDF contains selectable text and is not a scanned image. For scanned documents, use OCR software first.'
        });
      }
    } catch (parseError) {
      console.error('PDF parsing failed:', parseError);
      
      return NextResponse.json({ 
        text: '',
        error: 'Failed to parse PDF. The file might be corrupted or password-protected.',
        details: parseError instanceof Error ? parseError.message : 'Unknown error'
      }, { status: 500 });
    }
    
  } catch (error: unknown) {
    console.error('Request processing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to process request', 
        details: errorMessage
      },
      { status: 500 }
    );
  }
}