import { NextRequest, NextResponse } from 'next/server';
import pdf from 'pdf-parse'; // For PDF parsing
import mammoth from 'mammoth'; // For DOCX parsing

const API_KEY = process.env.GEMINI_API_KEY;
const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

// Types for validation results
interface ValidationQuestion {
  question: string;
  status: 'correct' | 'partial' | 'missing';
  originalInfo: string;
  foundInSummary: boolean;
  note?: string;
  type?: string; // Question type (factual, conceptual, etc.)
  confidence?: number; // Confidence score (0-1)
}

interface ValidationResult {
  overallScore: number;
  questionCount: number;
  answeredCorrectly: number;
  partiallyAnswered: number;
  unanswered: number;
  questions: ValidationQuestion[];
  missingConcepts: string[];
}

// --- File Reading Logic ---
async function readFileContent(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  console.log(`Attempting to read file: ${file.name}, Type: ${file.type}`);

  if (file.type === 'application/pdf') {
    const data = await pdf(buffer);
    console.log(`Successfully parsed PDF: ${file.name}`);
    return data.text;
  } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') { // DOCX MIME type
    const result = await mammoth.extractRawText({ buffer });
    console.log(`Successfully parsed DOCX: ${file.name}`);
    return result.value;
  } else if (file.type === 'text/plain') {
    console.log(`Reading plain text file: ${file.name}`);
    return buffer.toString('utf-8');
  } else {
    if (!file.type || file.type.startsWith('text/')) {
        console.warn(`Unknown text-like file type '${file.type}', attempting to read as text: ${file.name}`);
        return buffer.toString('utf-8');
    }
    throw new Error(`Unsupported file type: ${file.type || 'Unknown'}`);
  }
}
// --- End File Reading Logic ---

export async function POST(req: NextRequest) {
  if (!API_KEY) {
    console.error("CRITICAL ERROR: GEMINI_API_KEY environment variable is not set.");
    return NextResponse.json({ error: 'Server configuration error: API key not available.' }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const summary = formData.get('summary') as string | null;
    
    if (!file || !summary) {
      return NextResponse.json({ error: 'Both file and summary are required.' }, { status: 400 });
    }

    // Extract the file content using the file reading logic
    let originalText: string;
    try {
      originalText = await readFileContent(file);
      
      if (!originalText || originalText.trim().length === 0) {
        return NextResponse.json({ error: 'Failed to extract text from the provided file.' }, { status: 400 });
      }
    } catch (fileError: any) {
      console.error("Error reading file:", fileError);
      return NextResponse.json({ error: `Failed to process the file: ${fileError.message}` }, { status: 400 });
    }

    console.log(`Validating summary. Original length: ${originalText.length}, Summary length: ${summary.length}`);

    // First API call: Generate questions from original text
    const questionsPrompt = generateQuestionsPrompt(originalText);
    const questionsResponse = await callGeminiAPI(questionsPrompt);
    
    if (!questionsResponse) {
      return NextResponse.json({ error: 'Failed to generate test questions from original content.' }, { status: 500 });
    }

    // Parse generated questions
    const questions = parseGeneratedQuestions(questionsResponse);
    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: 'Could not extract valid questions from the API response.' }, { status: 500 });
    }

    console.log(`Generated ${questions.length} test questions from original content.`);

    // Second API call: Evaluate summary against questions
    const evaluationPrompt = generateEvaluationPrompt(summary, questions);
    const evaluationResponse = await callGeminiAPI(evaluationPrompt);
    
    if (!evaluationResponse) {
      return NextResponse.json({ error: 'Failed to evaluate summary against test questions.' }, { status: 500 });
    }

    // Parse evaluation results
    const validationResult = parseEvaluationResults(evaluationResponse, questions);
    
    console.log(`Validation complete. Overall score: ${validationResult.overallScore}%`);
    return NextResponse.json(validationResult);

  } catch (error: any) {
    console.error('Unhandled error in validation API:', error);
    const errorMessage = error.message || 'An unexpected error occurred during validation.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Helper function to generate a prompt for creating diverse test questions
function generateQuestionsPrompt(originalText: string): string {
  return `You are an expert educational assessment specialist. Your task is to create a diverse set of high-quality test questions based on the document provided below.

TASK OVERVIEW:
1. Generate 12-15 questions that test understanding of the MOST IMPORTANT concepts, principles, and information in the document
2. Create a balanced mix of different question types (specified below)
3. For each question, provide the specific information from the document that would be needed to answer it correctly

QUESTION TYPES TO INCLUDE:
1. FACTUAL QUESTIONS (25-30% of questions):
   * Who, what, when, where questions that test recall of specific factual information
   * Example: "Who invented TCP/IP?" or "What year was the World Wide Web created?"
   * Focus on the most significant facts, names, dates, definitions, or statistics

2. CONCEPTUAL QUESTIONS (25-30% of questions):
   * Questions that test understanding of key concepts, theories, or principles
   * Example: "Explain the concept of packet switching" or "Define Moore's Law and its significance"
   * Focus on fundamental concepts that are central to understanding the topic

3. ANALYTICAL QUESTIONS (20-25% of questions):
   * Questions that require comparing, contrasting, or analyzing relationships
   * Example: "How does TCP differ from UDP?" or "Compare and contrast traditional circuit-switching with packet-switching"
   * Focus on important distinctions or relationships between key concepts

4. APPLICATION/SIGNIFICANCE QUESTIONS (20-25% of questions):
   * Questions about why concepts matter, their implications, or how they apply
   * Example: "Why was the development of the Mosaic browser significant?" or "How did packet switching impact network reliability?"
   * Focus on the broader impact, implications, or applications of key ideas

PRIORITIZATION GUIDELINES:
* Emphasize concepts or information that appear in:
  - Introductions or conclusions
  - Section headings or subheadings
  - Repeated mentions throughout the document
  - Explicitly stated as important (e.g., "crucially," "significantly," "importantly")
* Focus on substantive content, not minor details or tangential information
* Ensure questions cover the most important themes throughout the entire document

OUTPUT FORMAT:
Format your response as a JSON array, where each question object contains:
- 'question': The question text
- 'type': The question type (factual, conceptual, analytical, or application)
- 'originalInfo': The specific information from the document that answers this question
- 'importance': A rating from 1-5 indicating how important this information is to understanding the document (5 being most important)

IMPORTANT: Return ONLY valid JSON without any additional text or formatting. The response must be parseable using JSON.parse().

Document Text:
${originalText.substring(0, 50000)} ${originalText.length > 50000 ? '... [content truncated for length]' : ''}`;
}

// Helper function to generate a prompt for evaluating the summary against questions
function generateEvaluationPrompt(summary: string, questions: any[]): string {
  const questionsList = questions.map((q, i) => {
    const importance = q.importance ? ` [Importance: ${q.importance}/5]` : '';
    const type = q.type ? ` [Type: ${q.type}]` : '';
    return `${i+1}. ${q.question}${type}${importance}\nOriginal info: "${q.originalInfo}"`;
  }).join('\n\n');
  
  return `You are an expert in educational assessment and content evaluation. Your task is to determine how effectively a study summary captures the KEY CONCEPTS and IMPORTANT INFORMATION from an original document.

I have a set of important questions derived from the original document, along with the expected information needed to answer each question. Your job is to evaluate whether the provided summary contains sufficient CONCEPTUAL UNDERSTANDING to answer each question effectively.

EVALUATION GUIDELINES:
For each question, evaluate whether the summary contains enough information to properly answer it:

1. CORRECT: The summary provides sufficient information to fully answer the question with proper context and key details, even if using different wording or terminology. A student using only this summary could correctly answer the question.

2. PARTIAL: The summary mentions relevant concepts but provides incomplete information needed to fully answer the question. Important details, context, or relationships are missing. A student might construct a partial answer but would lack some key information.

3. MISSING: The summary lacks the necessary information to answer the question at all. Critical concepts or ideas needed to address the question are absent. A student could not construct a meaningful answer from the summary alone.

IMPORTANT EVALUATION PRINCIPLES:
- Focus on CONCEPTUAL UNDERSTANDING, not exact wording match
- Consider SYNONYMS, PARAPHRASING, and ALTERNATIVE EXPLANATIONS as valid
- Assess if the summary captures the RELATIONSHIPS and CONNECTIONS between concepts
- Look for the SIGNIFICANCE and IMPLICATIONS of ideas, not just their mention
- For each evaluation, try to EXTRACT and CITE specific portions of the summary that relate to the question

SUMMARY TEXT:
${summary}

QUESTIONS FROM ORIGINAL DOCUMENT:
${questionsList}

FORMAT YOUR RESPONSE AS FOLLOWS:
1. For each question, provide:
   - 'questionIndex': The question number (1-indexed)
   - 'status': Either "correct", "partial", or "missing"
   - 'foundInSummary': Boolean indicating if any relevant information is present
   - 'confidence': A value between 0 and 1 indicating your confidence in this evaluation
   - 'extractedAnswer': The specific text from the summary that addresses this question (if any)
   - 'note': Brief explanation justifying your evaluation decision (required for "partial" or "missing" status)

2. A list of key concepts that appear to be missing from the summary

3. Overall statistics:
   - 'answeredCorrectly': Count of questions with status "correct"
   - 'partiallyAnswered': Count of questions with status "partial"
   - 'unanswered': Count of questions with status "missing"
   - 'overallScore': Calculated completeness percentage using this formula: (correct*1.0 + partial*0.5) / total * 100

IMPORTANT: Return ONLY valid JSON without any additional text or explanations. The response must be parseable using JSON.parse().`;
}

// Helper function to call the Gemini API
async function callGeminiAPI(prompt: string): Promise<string | null> {
  const requestBody = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096, // Increased to handle more detailed question generation
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
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error(`Gemini API Error (${response.status}):`, responseData);
      return null;
    }

    // Extract content from the Gemini response
    const content = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;
    return content || null;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return null;
  }
}

// Helper function to parse questions from API response
function parseGeneratedQuestions(response: string): any[] {
  try {
    // Extract JSON from response (in case there's any wrapper text)
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('Could not find valid JSON array in response');
      return [];
    }
    
    const questions = JSON.parse(jsonMatch[0]);
    return Array.isArray(questions) ? questions : [];
  } catch (error) {
    console.error('Error parsing questions JSON:', error);
    console.log('Raw response:', response);
    return [];
  }
}

// Helper function to parse evaluation results
function parseEvaluationResults(response: string, originalQuestions: any[]): ValidationResult {
  try {
    // Extract JSON from response (in case there's any wrapper text)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Could not find valid JSON object in evaluation response');
      throw new Error('Invalid evaluation response format');
    }
    
    const results = JSON.parse(jsonMatch[0]);
    
    // Map response back to original questions for the full result
    const questions: ValidationQuestion[] = originalQuestions.map((q, index) => {
      const evaluation = results.questionEvaluations?.find((e: any) => e.questionIndex === index + 1);
      
      return {
        question: q.question,
        type: q.type || 'unknown',
        status: evaluation?.status || 'missing',
        originalInfo: q.originalInfo,
        foundInSummary: evaluation?.foundInSummary || false,
        note: evaluation?.note,
        confidence: evaluation?.confidence || 0
      };
    });

    // Calculate overall score if not provided
    let overallScore = results.overallScore;
    if (overallScore === undefined) {
      const correct = results.answeredCorrectly || 0;
      const partial = results.partiallyAnswered || 0;
      const total = questions.length;
      
      overallScore = Math.round(((correct + (partial * 0.5)) / total) * 100);
    }

    return {
      overallScore: overallScore,
      questionCount: questions.length,
      answeredCorrectly: results.answeredCorrectly || 0,
      partiallyAnswered: results.partiallyAnswered || 0,
      unanswered: results.unanswered || 0,
      questions: questions,
      missingConcepts: results.missingConcepts || []
    };
  } catch (error) {
    console.error('Error parsing evaluation results:', error);
    console.log('Raw response:', response);
    throw new Error('Failed to parse evaluation results');
  }
}