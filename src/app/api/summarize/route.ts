// src/app/api/summarize/route.ts
import { NextResponse } from 'next/server';
import { summarizeDocumentWithGoogle } from '@/ai/flows/summarize-document-google';
import { SummaryOptions } from '@/app/types/summary-options';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { documentContent, summaryOptions } = body;
    
    if (!documentContent || !summaryOptions) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await summarizeDocumentWithGoogle({
      documentContent,
      summaryOptions: summaryOptions as SummaryOptions
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Summarization API error:', error);
    console.error('Full error:', error.stack);
    
    // Check if API key is present
    if (!process.env.GOOGLE_GENAI_API_KEY) {
      console.error('GOOGLE_GENAI_API_KEY is not set in environment variables');
    }
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to generate summary',
        details: error.details || 'No additional details available'
      },
      { status: 500 }
    );
  }
}