import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

interface ValidationRequest {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  explanation?: string;
  sourceChunk?: string;
  topic?: string;
}

interface ValidationResult {
  isCorrect: boolean;
  score: number; // 0-100
  feedback: string;
  keyPointsCovered: string[];
  missedPoints: string[];
  suggestions: string[];
}

export async function POST(req: NextRequest) {
  try {
    const body: ValidationRequest = await req.json();
    
    // Validate request
    if (!body.question || !body.userAnswer || !body.correctAnswer) {
      return NextResponse.json({
        error: 'Missing required fields: question, userAnswer, correctAnswer'
      }, { status: 400 });
    }

    // Check if answer is too short
    if (body.userAnswer.trim().length < 10) {
      return NextResponse.json({
        isCorrect: false,
        score: 0,
        feedback: "Answer is too short. Please provide a more detailed response with at least 10 characters.",
        keyPointsCovered: [],
        missedPoints: ["Insufficient detail in response"],
        suggestions: ["Expand your answer with more specific details", "Include examples if relevant"]
      });
    }

    // If no API key, use fallback validation
    if (!GEMINI_API_KEY) {
      console.warn('No Gemini API key found, using fallback validation');
      return NextResponse.json(fallbackValidation(body.userAnswer, body.correctAnswer));
    }

    // Create AI validation prompt
    const prompt = `
# EDUCATIONAL ANSWER VALIDATION TASK

You are an expert educator evaluating a student's answer. Your job is to assess whether the student demonstrates understanding of the key concepts, even if they don't use the exact same words.

## QUESTION:
${body.question}

## STUDENT'S ANSWER:
${body.userAnswer}

## MODEL ANSWER:
${body.correctAnswer}

${body.explanation ? `## ADDITIONAL CONTEXT:\n${body.explanation}` : ''}

${body.sourceChunk ? `## SOURCE MATERIAL:\n${body.sourceChunk}` : ''}

## EVALUATION CRITERIA:
1. **Conceptual Understanding**: Does the student show they understand the main concepts?
2. **Key Points Coverage**: Are the essential points from the model answer covered?
3. **Accuracy**: Is the information factually correct?
4. **Completeness**: Is the answer sufficiently detailed?
5. **Clarity**: Is the answer well-expressed and coherent?

## EVALUATION GUIDELINES:
- **90-100%**: Excellent understanding, covers all key points, may include additional insights
- **80-89%**: Good understanding, covers most key points with minor gaps
- **70-79%**: Adequate understanding, covers basic points but missing some details
- **60-69%**: Partial understanding, covers some points but has significant gaps
- **50-59%**: Limited understanding, mentions relevant concepts but lacks depth
- **Below 50%**: Poor understanding, major misconceptions or missing key concepts

## RESPONSE FORMAT (JSON only):
{
  "isCorrect": boolean (true if score >= 70),
  "score": number (0-100),
  "feedback": "Detailed feedback explaining the evaluation",
  "keyPointsCovered": ["point1", "point2"],
  "missedPoints": ["missed1", "missed2"],
  "suggestions": ["suggestion1", "suggestion2"]
}

Evaluate the student's answer now:`;

    try {
      const response = await axios.post(
        `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
        {
          contents: [{
            parts: [{ text: prompt }]
          }]
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        }
      );

      const responseText = response.data.candidates[0]?.content?.parts[0]?.text || '';
      
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        console.warn('No valid JSON found in AI validation response');
        return NextResponse.json(fallbackValidation(body.userAnswer, body.correctAnswer));
      }

      const result = JSON.parse(jsonMatch[0]);
      
      // Validate the result structure
      const validatedResult: ValidationResult = {
        isCorrect: Boolean(result.isCorrect),
        score: Math.max(0, Math.min(100, Number(result.score) || 0)),
        feedback: String(result.feedback || 'Answer evaluated'),
        keyPointsCovered: Array.isArray(result.keyPointsCovered) ? result.keyPointsCovered : [],
        missedPoints: Array.isArray(result.missedPoints) ? result.missedPoints : [],
        suggestions: Array.isArray(result.suggestions) ? result.suggestions : []
      };

      return NextResponse.json(validatedResult);

    } catch (aiError) {
      console.error('AI validation failed:', aiError);
      // Fall back to simple validation
      return NextResponse.json(fallbackValidation(body.userAnswer, body.correctAnswer));
    }

  } catch (error) {
    console.error('Answer validation error:', error);
    return NextResponse.json({
      error: 'Failed to validate answer'
    }, { status: 500 });
  }
}

// Fallback validation using keyword matching and similarity
function fallbackValidation(userAnswer: string, correctAnswer: string): ValidationResult {
  const userWords = userAnswer.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2);
    
  const correctWords = correctAnswer.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2);

  // Remove common stop words
  const stopWords = new Set([
    'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above',
    'below', 'between', 'among', 'under', 'over', 'is', 'are', 'was', 'were', 'be',
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'can', 'must', 'this', 'that', 'these', 'those'
  ]);

  const meaningfulUserWords = userWords.filter(word => !stopWords.has(word));
  const meaningfulCorrectWords = correctWords.filter(word => !stopWords.has(word));

  // Find matching concepts
  const matchedConcepts: string[] = [];
  const missedConcepts: string[] = [];

  meaningfulCorrectWords.forEach(correctWord => {
    const isMatched = meaningfulUserWords.some(userWord => 
      userWord.includes(correctWord) || 
      correctWord.includes(userWord) ||
      levenshteinSimilarity(userWord, correctWord) > 0.7
    );
    
    if (isMatched) {
      matchedConcepts.push(correctWord);
    } else {
      missedConcepts.push(correctWord);
    }
  });

  // Calculate score based on concept coverage and length appropriateness
  let score = 0;
  
  if (meaningfulCorrectWords.length > 0) {
    const conceptScore = (matchedConcepts.length / meaningfulCorrectWords.length) * 80;
    score += conceptScore;
  }

  // Bonus points for appropriate length and structure
  if (userAnswer.length >= 50) score += 10; // Adequate length
  if (userAnswer.length >= 100) score += 5; // Good length
  if (userAnswer.includes('.')) score += 5; // Complete sentences

  // Penalty for very short answers
  if (userAnswer.length < 30) score -= 20;

  score = Math.max(0, Math.min(100, Math.round(score)));
  const isCorrect = score >= 70;

  // Generate feedback
  let feedback = '';
  if (score >= 90) {
    feedback = "Excellent answer! You've demonstrated strong understanding of the key concepts.";
  } else if (score >= 80) {
    feedback = "Good answer! You've covered most of the important points with good understanding.";
  } else if (score >= 70) {
    feedback = "Adequate answer. You show understanding but could include more detail on some points.";
  } else if (score >= 60) {
    feedback = "Partial understanding shown. Your answer covers some key points but misses important details.";
  } else if (score >= 50) {
    feedback = "Limited understanding demonstrated. Consider reviewing the material and focusing on key concepts.";
  } else {
    feedback = "Your answer needs significant improvement. Please review the material and try to address the main concepts.";
  }

  // Generate suggestions based on what's missing
  const suggestions: string[] = [];
  if (missedConcepts.length > 0) {
    suggestions.push(`Try to include information about: ${missedConcepts.slice(0, 3).join(', ')}`);
  }
  if (userAnswer.length < 50) {
    suggestions.push("Expand your answer with more detailed explanations");
  }
  if (!userAnswer.includes('because') && !userAnswer.includes('since') && !userAnswer.includes('due to')) {
    suggestions.push("Explain the reasoning behind your answer");
  }
  if (score < 70) {
    suggestions.push("Review the source material and identify the main concepts");
  }

  return {
    isCorrect,
    score,
    feedback,
    keyPointsCovered: matchedConcepts.slice(0, 5), // Limit to top 5
    missedPoints: missedConcepts.slice(0, 5), // Limit to top 5
    suggestions: suggestions.slice(0, 3) // Limit to 3 suggestions
  };
}

// Simple Levenshtein distance for word similarity
function levenshteinSimilarity(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  
  const distance = matrix[str2.length][str1.length];
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength === 0 ? 1 : (maxLength - distance) / maxLength;
}

export async function GET() {
  return NextResponse.json({
    message: 'AI Answer Validation API',
    version: '1.0',
    endpoints: {
      'POST /': 'Validate a student answer using AI'
    },
    usage: 'Send POST request with question, userAnswer, and correctAnswer'
  });
}