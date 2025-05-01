// src/app/api/parse-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PDFParserService } from '@/services/pdf-parser';
import { Buffer } from 'buffer';

export async function POST(request: NextRequest) {
  try {
    console.log('PDF parsing request received');
    
    // Check if the request is a valid FormData request
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Invalid request format. Expected multipart/form-data.' },
        { status: 400 }
      );
    }
    
    // Parse the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided.' },
        { status: 400 }
      );
    }
    
    console.log(`Received file: ${file.name}, ${file.size} bytes, ${file.type}`);
    
    // Check if the file is a PDF
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'File must be a PDF.' },
        { status: 400 }
      );
    }
    
    // Read the file as an array buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log(`Processing PDF: ${buffer.length} bytes`);
    
    // Parse the PDF
    const result = await PDFParserService.parseWithFallback(buffer);
    
    // Validate the parsed content
    const isValid = PDFParserService.validatePDFContent(result.text);
    
    if (!isValid && !result.error) {
      result.error = 'PDF content could not be properly extracted. The file might contain only images or be heavily formatted.';
      result.suggestion = 'Try a different document or convert this document to a more accessible format.';
    }
    
    console.log(`Parsing complete. Extracted ${result.text.length} characters.`);
    console.log(`PDF has ${result.numpages} pages.`);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('PDF parsing error:', error);
    
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'An unexpected error occurred while parsing the PDF.',
        suggestion: 'Try again with a different PDF file or check the server logs for more details.'
      },
      { status: 500 }
    );
  }
}