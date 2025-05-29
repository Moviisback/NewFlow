// File: app/api/enhance-summary/route.ts
import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.GEMINI_API_KEY;
const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

export async function POST(req: NextRequest) {
  if (!API_KEY) {
    console.error("CRITICAL ERROR: GEMINI_API_KEY environment variable is not set.");
    return NextResponse.json({ error: 'Server configuration error: API key not available.' }, { status: 500 });
  }

  try {
    const data = await req.json();
    const { summary, validationResult, originalText } = data;
    
    if (!summary || !validationResult || !originalText) {
      return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
    }

    // Get missing questions from validation result
    const missingQuestions = validationResult.questions.filter(
      (q: { status: string }) => q.status === 'missing' || q.status === 'partial'
    );
    
    if (missingQuestions.length === 0) {
      return NextResponse.json({ 
        enhancedSummary: summary,
        message: 'No improvements needed, summary already addresses all questions.'
      });
    }

    // Generate improvement instructions
    const improvementPrompt = generateImprovementPrompt(summary, missingQuestions, originalText);
    const enhancedSummary = await callGeminiAPI(improvementPrompt);
    
    if (!enhancedSummary) {
      return NextResponse.json({ error: 'Failed to generate enhanced summary.' }, { status: 500 });
    }

    return NextResponse.json({
      enhancedSummary,
      improvedQuestions: missingQuestions.length
    });

  } catch (error: any) {
    console.error('Error in enhance-summary API:', error);
    return NextResponse.json({ 
      error: error.message || 'An unexpected error occurred during summary enhancement.' 
    }, { status: 500 });
  }
}

// Generate a prompt to enhance the summary based on missing information
function generateImprovementPrompt(summary: string, missingQuestions: any[], originalText: string): string {
  // Extract key information to improve
  const improvementRequests = missingQuestions.map((q, i) => 
    `${i+1}. QUESTION: "${q.question}"\n   MISSING INFO: "${q.originalInfo}"\n   CURRENT STATUS: ${q.status} ${q.note ? `\n   NOTE: ${q.note}` : ''}`
  ).join('\n\n');

  return `You are enhancing a study summary by adding missing information identified during validation. Your task is to improve the summary without making it excessively long.

CURRENT SUMMARY:
${summary}

MISSING INFORMATION TO ADD:
${improvementRequests}

ORIGINAL DOCUMENT CONTENT:
${originalText.substring(0, 50000)} ${originalText.length > 50000 ? '... [content truncated for length]' : ''}

INSTRUCTIONS:
1. Add the missing information to appropriate sections of the summary
2. Maintain the existing structure and format
3. Be concise but include all necessary details
4. If related topics are already in the summary, integrate the new information
5. Ensure the final summary is cohesive and well-organized
6. DO NOT remove any existing information unless it's inaccurate

Return the complete enhanced summary, not just the additions. The enhanced summary should be a standalone document that addresses all the identified gaps.`;
}

// Call the Gemini API
async function callGeminiAPI(prompt: string): Promise<string | null> {
  console.log(`Calling Gemini API with prompt length: ${prompt.length}`);
  
  const requestBody = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 16384, // Increased for potentially larger summaries
      topP: 0.8,
      topK: 40
    }
  };

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(120000), // 2-minute timeout
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error(`Gemini API Error (${response.status}):`, responseData);
      return null;
    }

    const content = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;
    return content || null;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return null;
  }
}