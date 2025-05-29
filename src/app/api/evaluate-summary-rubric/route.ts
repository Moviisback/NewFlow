import { NextRequest, NextResponse } from 'next/server';
import pdf from 'pdf-parse'; // For PDF parsing
import mammoth from 'mammoth'; // For DOCX parsing
import { RubricScore } from '@/types/rubric';

const API_KEY = process.env.GEMINI_API_KEY;
const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

// --- File Reading Logic (reused from your existing code) ---
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

    console.log(`Evaluating summary against rubric. Original length: ${originalText.length}, Summary length: ${summary.length}`);

    // Generate the rubric evaluation prompt
    const evaluationPrompt = generateRubricEvaluationPrompt(originalText, summary, file.name);
    
    // Call Gemini API for the evaluation
    const evaluationResponse = await callGeminiAPI(evaluationPrompt);
    
    if (!evaluationResponse) {
      return NextResponse.json({ error: 'Failed to evaluate summary against educational rubric.' }, { status: 500 });
    }

    // Parse evaluation results
    const rubricResults = parseRubricResults(evaluationResponse);
    
    console.log(`Rubric evaluation complete. Overall score: ${rubricResults.overallScore}/5`);
    return NextResponse.json(rubricResults);

  } catch (error: any) {
    console.error('Unhandled error in rubric evaluation API:', error);
    const errorMessage = error.message || 'An unexpected error occurred during evaluation.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Helper function to generate prompt for rubric evaluation
function generateRubricEvaluationPrompt(originalText: string, summary: string, fileName: string): string {
  return `You are an expert educational content evaluator with experience in assessing study materials. Your task is to evaluate a student summary against a comprehensive educational rubric.

ORIGINAL DOCUMENT:
Title: ${fileName}
${originalText.substring(0, 50000)} ${originalText.length > 50000 ? '... [content truncated for length]' : ''}

STUDENT SUMMARY TO EVALUATE:
${summary}

EVALUATION RUBRIC:
For each criterion below, assign a score from 1 (Poor) to 5 (Excellent). Provide a brief justification citing specific parts of the summary and suggest improvements if a score is low.

1. Coverage of Core Content (Score 1-5)
   Focus: Check that all essential topics are included (key concepts, definitions, processes, formulas, events, or cases relevant to the subject).
   Scoring:
   - 5: Complete. Every major concept or fact is covered accurately.
   - 4: Mostly complete. Only minor details or one small concept are missing.
   - 3: Partial coverage. Several important topics are missing or only briefly mentioned.
   - 2: Incomplete. Major concepts are missing; summary feels insufficient.
   - 1: Minimal. Most core content is missing or incorrect.

2. Clarity and Coherence (Score 1-5)
   Focus: Evaluate readability and organization. The summary should be easy to follow without the original text, using clear language and logical flow.
   Scoring:
   - 5: Very clear. Well-organized; ideas flow logically. Language is simple and precise.
   - 4: Clear. Minor wording or order issues, but generally easy to follow.
   - 3: Somewhat clear. Occasional unclear phrasing or slight disorganization; still understandable with effort.
   - 2: Unclear. Poor organization or phrasing makes it hard to follow without the original.
   - 1: Incoherent. Jumbled or fragmented; very confusing.

3. Conceptual Linkages (Score 1-5)
   Focus: Check if relationships between ideas are made explicit (cause-effect, comparisons, categories, sequences, hierarchies).
   Scoring:
   - 5: Highly connected. Clear linking phrases or organization show how concepts relate.
   - 4: Mostly connected. Many connections are explicit; a few could be stated more clearly.
   - 3: Some linkage. A few relationships noted but many ideas stand alone without explicit links.
   - 2: Weak linkage. Most concepts are listed without showing relationships.
   - 1: No linkage. Ideas are disjointed; missing logical connections.

4. Usefulness for Exam Prep (Score 1-5)
   Focus: Determine if the summary highlights exam-relevant information that aids recall and application.
   Scoring:
   - 5: Highly useful. Emphasizes definitions, formulas, key facts; includes example problems or mnemonic cues relevant to tests.
   - 4: Useful. Covers most important exam points; may lack only minor examples or cues.
   - 3: Somewhat useful. Contains general facts but misses specific hints or examples that aid testing.
   - 2: Low usefulness. Important facts are buried or incomplete; few cues to recall application.
   - 1: Not useful. Lacks exam-relevant content; unlikely to help in a test setting.

5. Conciseness without Oversimplification (Score 1-5)
   Focus: Evaluate brevity and precision. The summary should be as short as possible while preserving meaning.
   Scoring:
   - 5: Very concise and complete. Succinct language; all important information included, no irrelevant content.
   - 4: Mostly concise. Minor redundant phrases or a bit of extra detail that could be trimmed.
   - 3: Moderately concise. Some repetition or wordiness; still understandable but can be tightened.
   - 2: Verbose or terse. Either too wordy (contains irrelevant info) or too brief (cuts out necessary detail, causing confusion).
   - 1: Poor brevity. Extremely long/wordy or too skeletal, losing critical content.

6. Subject-Specific Accuracy (Score 1-5)
   Focus: Check factual correctness and proper use of terminology within the discipline.
   Scoring:
   - 5: Accurate. No factual errors; technical terms and examples are used correctly.
   - 4: Mostly accurate. Minor errors or slight misuse of a term that do not change understanding.
   - 3: Some inaccuracies. A few factual mistakes or vague terms that could mislead.
   - 2: Many errors. Several incorrect facts or misused terminology.
   - 1: Inaccurate. Fundamental errors; content is largely incorrect.

7. Cognitive Engagement (Score 1-5)
   Focus: Determine if the summary uses learning aids to boost memory and understanding.
   Scoring:
   - 5: Highly engaging. Uses bullets, numbered lists or headings; includes analogies or visual cues; information is grouped or ordered to aid recall.
   - 4: Moderately engaging. Some structure (e.g. bullet points) and possibly one analogy or example; could add one more memory aid.
   - 3: Some engagement. Minimal formatting (one list or brief sub-heading) but mostly plain text; few memory cues.
   - 2: Low engagement. Dense text, minimal use of lists or analogies; hard to pick out key points quickly.
   - 1: Not engaging. No structural cues; presented as a single block of text with no mnemonic aids.

OUTPUT FORMAT:
Format your response as a JSON object with the following structure:
{
  "overallScore": number (average of all criteria, rounded to 1 decimal place),
  "criteria": {
    "coreContent": {
      "name": "Coverage of Core Content",
      "score": number (1-5),
      "justification": "string",
      "suggestedImprovements": "string" (only include if score is below 4)
    },
    "clarityCoherence": {
      "name": "Clarity and Coherence",
      "score": number (1-5),
      "justification": "string",
      "suggestedImprovements": "string" (only include if score is below 4)
    },
    "conceptualLinkages": {
      "name": "Conceptual Linkages",
      "score": number (1-5),
      "justification": "string",
      "suggestedImprovements": "string" (only include if score is below 4)
    },
    "examPrep": {
      "name": "Usefulness for Exam Prep",
      "score": number (1-5),
      "justification": "string",
      "suggestedImprovements": "string" (only include if score is below 4)
    },
    "conciseness": {
      "name": "Conciseness without Oversimplification",
      "score": number (1-5),
      "justification": "string",
      "suggestedImprovements": "string" (only include if score is below 4)
    },
    "accuracy": {
      "name": "Subject-Specific Accuracy",
      "score": number (1-5),
      "justification": "string",
      "suggestedImprovements": "string" (only include if score is below 4)
    },
    "cognitiveEngagement": {
      "name": "Cognitive Engagement",
      "score": number (1-5),
      "justification": "string",
      "suggestedImprovements": "string" (only include if score is below 4)
    }
  },
  "strengths": ["string", "string", "string"], // List 3 major strengths
  "weaknesses": ["string", "string", "string"], // List 3 areas for improvement (if any)
  "overallFeedback": "string" // Brief overall assessment (2-3 sentences)
}

IMPORTANT: Return ONLY valid JSON without any additional text or formatting. The response must be parseable using JSON.parse().`;
}

// Helper function to call the Gemini API (reuse from your existing code)
async function callGeminiAPI(prompt: string): Promise<string | null> {
  console.log(`Calling Gemini API for rubric evaluation, prompt length: ${prompt.length}`);
  
  const requestBody = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
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
      // Add a larger timeout for API calls
      signal: AbortSignal.timeout(120000), // 2-minute timeout
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error(`Gemini API Error (${response.status}):`, responseData);
      const errorDetail = responseData?.error?.message || `Request failed with status ${response.status}`;
      throw new Error(`Gemini API Error: ${errorDetail}`);
    }

    // Extract content from the response
    const content = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content || content.trim().length === 0) {
      throw new Error('The API returned an empty or invalid response.');
    }

    console.log(`API call successful, response length: ${content.length}`);
    return content;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
}

// Helper function to parse the rubric evaluation results
function parseRubricResults(response: string): RubricScore {
  try {
    // Extract JSON from response (in case there's any wrapper text)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Could not find valid JSON object in evaluation response');
      throw new Error('Invalid evaluation response format');
    }
    
    const results = JSON.parse(jsonMatch[0]);
    return results as RubricScore;
  } catch (error) {
    console.error('Error parsing rubric evaluation results:', error);
    console.log('Raw response:', response);
    throw new Error('Failed to parse evaluation results');
  }
}