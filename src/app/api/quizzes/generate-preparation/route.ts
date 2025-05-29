// app/api/quizzes/generate-preparation/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { questionGenerator } from '@/ai/question-generator';
import { examLevelQuestionGenerator } from '@/ai/enhanced-question-generator';
import { analyzeContentForLearning } from '@/utils/content-analysis';

interface APIError {
  code: string;
  message: string;
  details?: any;
  suggestions?: string[];
}

const requestCache = new Map<string, { data: any; timestamp: number }>();
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let clientIP = '';
  
  try {
    clientIP = req.headers.get('x-forwarded-for') || 
               req.headers.get('x-real-ip') || 
               'unknown';
    
    const rateLimitResult = checkRateLimit(clientIP);
    if (!rateLimitResult.allowed) {
      return NextResponse.json({
        error: 'Rate limit exceeded',
        details: 'Too many requests. Please wait before trying again.',
        retryAfter: rateLimitResult.retryAfter
      }, { status: 429 });
    }

    const requestBody = await parseRequestBody(req);
    const { 
      chunkContent, 
      documentTitle,
      userProgress,
      difficultyPreference = 'medium',
      maxQuestions = 8,
      questionTypes = ['multiple_choice', 'true_false', 'fill_in_blank', 'short_answer'],
      previousAnswered = [],
      examLevel = 'standardized',
      enhancedMode = true
    } = requestBody;

    if (!chunkContent) {
      return createErrorResponse({
        code: 'MISSING_CONTENT',
        message: 'Content chunk is required',
        suggestions: ['Ensure chunkContent is provided in the request']
      }, 400);
    }

    // FIXED: More lenient content validation
    const contentValidation = validateContentQuality(chunkContent);
    if (!contentValidation.valid) {
      // FIXED: Don't fail completely, just warn and continue with basic generation
      console.warn('⚠️ Content validation warning:', contentValidation.reason);
    }

    console.log('🚀 Starting FIXED enhanced question generation:', {
      contentLength: chunkContent.length,
      documentTitle: documentTitle || 'Unknown',
      maxQuestions,
      difficulty: difficultyPreference,
      examLevel,
      enhancedMode
    });

    const cacheKey = generateCacheKey(chunkContent, maxQuestions, difficultyPreference, examLevel);
    const cached = checkCache(cacheKey);
    if (cached) {
      console.log('📦 Returning cached result');
      return NextResponse.json(cached);
    }

    console.log('🔍 Analyzing content with enhanced techniques...');
    const contentAnalysis = analyzeContentForLearning(chunkContent);
    
    console.log('📊 Content Analysis Results:', {
      keyConcepts: contentAnalysis.keyConcepts.length,
      mainConcepts: contentAnalysis.keyConcepts.filter(c => c.isMainConcept).length,
      topics: contentAnalysis.mainTopics.length,
      educationalValue: contentAnalysis.educationalValue,
      contentQuality: contentAnalysis.contentQuality,
      difficultyLevel: contentAnalysis.difficultyLevel
    });
    
    // FIXED: Don't fail for low educational value, just adjust approach
    const meaningfulConcepts = contentAnalysis.keyConcepts.filter(c => 
      c.isMainConcept && (c.importance ?? 0) > 4 // Reduced threshold from 5 to 4
    );
    
    console.log(`🎯 Found ${meaningfulConcepts.length} meaningful concepts for question generation`);
    
    const difficultyLevel = mapDifficultyLevel(difficultyPreference);
    const adjustedQuestionCount = calculateOptimalQuestionCount(
      maxQuestions, 
      contentAnalysis, 
      Math.max(meaningfulConcepts.length, 1) // Ensure at least 1
    );
    
    console.log(`🎯 Generating ${adjustedQuestionCount} questions for ${meaningfulConcepts.length} meaningful concepts`);
    
    let questionResult;
    let generationMethod = 'unknown';
    
    try {
      if (enhancedMode) {
        // FIXED: Try enhanced generation first, but with proper fallback
        try {
          questionResult = await examLevelQuestionGenerator.generateExamLevelQuestions(
            chunkContent,
            contentAnalysis,
            {
              documentTitle,
              maxQuestions: adjustedQuestionCount,
              questionTypes: filterQuestionTypes(questionTypes, contentAnalysis),
              difficultyLevel,
              examLevel,
              previousAnswered
            }
          );
          generationMethod = 'enhanced';
          console.log('✅ Enhanced generation successful');
        } catch (enhancedError) {
          console.warn('⚠️ Enhanced generation failed, falling back to standard generation:', enhancedError);
          
          // FIXED: Proper fallback to standard generation
          questionResult = await questionGenerator.generateComprehensiveQuestions(
            chunkContent,
            {
              documentTitle,
              maxQuestions: adjustedQuestionCount,
              questionTypes: filterQuestionTypes(questionTypes, contentAnalysis),
              difficultyLevel,
              previousAnswered
            }
          );
          generationMethod = 'standard_fallback';
          console.log('✅ Standard fallback generation successful');
        }
      } else {
        // Use standard generation
        questionResult = await questionGenerator.generateComprehensiveQuestions(
          chunkContent,
          {
            documentTitle,
            maxQuestions: adjustedQuestionCount,
            questionTypes: filterQuestionTypes(questionTypes, contentAnalysis),
            difficultyLevel,
            previousAnswered
          }
        );
        generationMethod = 'standard';
        console.log('✅ Standard generation successful');
      }
    } catch (error: any) {
      console.error('❌ All question generation methods failed:', error);
      
      // FIXED: Final fallback - generate simple questions directly
      questionResult = generateSimpleFallbackQuestions(chunkContent, contentAnalysis, adjustedQuestionCount);
      generationMethod = 'simple_fallback';
      console.log('✅ Simple fallback generation used');
    }

    // FIXED: Ensure we always have some questions
    if (!questionResult || !questionResult.questions || questionResult.questions.length === 0) {
      console.warn('⚠️ No questions generated, creating emergency fallback');
      questionResult = generateSimpleFallbackQuestions(chunkContent, contentAnalysis, adjustedQuestionCount);
      generationMethod = 'emergency_fallback';
    }

    // FIXED: More lenient quality filtering
    const qualityQuestions = questionResult.questions.filter(q => {
      // Basic validation only
      const isValid = q && q.question && q.correctAnswer && 
                     q.correctAnswer.length > 1 && 
                     !['the', 'and', 'or', 'a', 'an'].includes(q.correctAnswer.toLowerCase());
      
      if (!isValid) {
        console.log(`❌ Filtered invalid question: "${q?.question?.substring(0, 50)}..."`);
      }
      
      return isValid;
    });

    const finalQuestions = qualityQuestions.length > 0 ? qualityQuestions : questionResult.questions;

    if (finalQuestions.length === 0) {
      // FIXED: Last resort - create basic questions
      const lastResortQuestions = createLastResortQuestions(chunkContent, adjustedQuestionCount);
      
      const response = {
        questions: lastResortQuestions,
        learningObjectives: contentAnalysis.learningObjectives || ['Understand the main concepts'],
        keyConcepts: contentAnalysis.keyConcepts.map(c => c.term).slice(0, 5),
        contentMetadata: {
          difficultyLevel: contentAnalysis.difficultyLevel,
          conceptCount: contentAnalysis.keyConcepts.length,
          meaningfulConcepts: meaningfulConcepts.length,
          educationalValue: contentAnalysis.educationalValue,
          contentQuality: contentAnalysis.contentQuality,
          questionQuality: 'basic',
          processingTime: Date.now() - startTime,
          generationMethod: 'last_resort',
          generationMetadata: {
            totalGenerated: lastResortQuestions.length,
            qualityFiltered: lastResortQuestions.length,
            averageQuality: 5
          }
        },
        suggestions: [
          'Content processed with basic question generation',
          'Consider providing more structured educational content for better questions',
          'Questions generated using simple content analysis'
        ]
      };
      
      cacheResult(cacheKey, response);
      return NextResponse.json(response);
    }

    console.log(`✅ Generated ${questionResult.questions.length} questions, ${qualityQuestions.length} after quality filter`);

    const response = {
      questions: finalQuestions,
      learningObjectives: contentAnalysis.learningObjectives,
      keyConcepts: contentAnalysis.keyConcepts.map(c => c.term),
      contentMetadata: {
        difficultyLevel: contentAnalysis.difficultyLevel,
        conceptCount: contentAnalysis.keyConcepts.length,
        meaningfulConcepts: meaningfulConcepts.length,
        educationalValue: contentAnalysis.educationalValue,
        contentQuality: contentAnalysis.contentQuality,
        questionQuality: generationMethod.includes('enhanced') ? 'enhanced' : 
                        generationMethod.includes('standard') ? 'standard' : 'basic',
        processingTime: Date.now() - startTime,
        generationMethod,
        generationMetadata: questionResult.metadata || {
          totalGenerated: questionResult.questions?.length || 0,
          qualityFiltered: finalQuestions.length,
          averageQuality: 6
        }
      },
      suggestions: generateContentSuggestions(contentAnalysis, questionResult, generationMethod)
    };

    cacheResult(cacheKey, response);

    console.log(`🎉 Successfully completed in ${Date.now() - startTime}ms using ${generationMethod}`);
    
    return NextResponse.json(response);
    
  } catch (error: any) {
    console.error('❌ Unexpected error in question generation:', error);
    
    return createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred during question generation',
      details: {
        error: error instanceof Error ? error.message : String(error),
        processingTime: Date.now() - startTime,
        clientIP: clientIP ? clientIP.substring(0, 8) + '...' : 'unknown'
      },
      suggestions: [
        'Try again with the same content',
        'Reduce the amount of content or question count',
        'Check if the content format is supported',
        'Contact support if the issue persists'
      ]
    }, 500);
  }
}

// FIXED: Helper functions

async function parseRequestBody(req: NextRequest) {
  try {
    return await req.json();
  } catch (error) {
    throw new Error('Invalid JSON in request body');
  }
}

function validateContentQuality(content: string): {
  valid: boolean;
  reason?: string;
  details?: any;
  suggestions?: string[];
} {
  // FIXED: More lenient validation
  if (!content || content.trim().length < 30) {
    return {
      valid: false,
      reason: 'Content too short for question generation',
      details: { length: content?.length || 0, minimum: 30 },
      suggestions: ['Provide more substantial content for better questions']
    };
  }

  if (content.length > 15000) {
    return {
      valid: false,
      reason: 'Content too long for processing',
      details: { length: content.length, maximum: 15000 },
      suggestions: ['Break content into smaller chunks']
    };
  }

  // Content is valid even if it doesn't have perfect educational structure
  return { valid: true };
}

function mapDifficultyLevel(difficulty: string | number): number {
  if (typeof difficulty === 'number') return Math.max(0, Math.min(100, difficulty));
  
  const difficultyMap: { [key: string]: number } = {
    'easy': 25, 'basic': 25, 'beginner': 20,
    'medium': 50, 'moderate': 50, 'intermediate': 55,
    'hard': 75, 'challenging': 75, 'advanced': 80,
    'expert': 90, 'master': 95
  };
  
  return difficultyMap[difficulty.toString().toLowerCase()] || 50;
}

function calculateOptimalQuestionCount(
  requestedCount: number, 
  analysis: any, 
  meaningfulConcepts: number
): number {
  // FIXED: More conservative calculation
  const baseCount = Math.min(
    requestedCount,
    Math.max(2, Math.floor(meaningfulConcepts * 1.5))
  );
  
  // Don't reduce count too much based on educational value
  return Math.max(2, Math.min(requestedCount, baseCount));
}

function filterQuestionTypes(requestedTypes: string[], analysis: any): string[] {
  const supportedTypes = ['multiple_choice', 'true_false', 'fill_in_blank', 'short_answer'];
  const validTypes = requestedTypes.filter(type => supportedTypes.includes(type));
  
  if (validTypes.length === 0) {
    return ['multiple_choice', 'true_false'];
  }
  
  return validTypes;
}

// FIXED: Simple fallback question generation
function generateSimpleFallbackQuestions(content: string, analysis: any, count: number): any {
  const questions: any[] = [];
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
  const concepts = analysis.keyConcepts.length > 0 ? 
    analysis.keyConcepts.map((c: any) => c.term) : 
    extractSimpleConcepts(content);
  
  for (let i = 0; i < Math.min(count, Math.max(2, sentences.length)); i++) {
    const concept = concepts[i % Math.max(1, concepts.length)] || 'main concept';
    const sentence = sentences[i % Math.max(1, sentences.length)] || content.substring(0, 100);
    
    if (i % 2 === 0) {
      // True/False question
      questions.push({
        id: `fallback_tf_${Date.now()}_${i}`,
        question: `True or False: The content discusses ${concept}.`,
        type: 'true_false',
        correctAnswer: 'True',
        difficulty: 'easy',
        explanation: `${concept} is mentioned in the provided content.`,
        topic: concept,
        sourceChunk: sentence
      });
    } else {
      // Multiple choice question
      questions.push({
        id: `fallback_mc_${Date.now()}_${i}`,
        question: `What is mentioned in the content regarding ${concept}?`,
        type: 'multiple_choice',
        options: [
          `Information about ${concept}`,
          'Unrelated information',
          'No specific details',
          'Contradictory statements'
        ],
        correctAnswer: `Information about ${concept}`,
        difficulty: 'easy',
        explanation: `The content provides information about ${concept}.`,
        topic: concept,
        sourceChunk: sentence
      });
    }
  }
  
  return {
    questions,
    metadata: {
      totalGenerated: questions.length,
      qualityFiltered: questions.length,
      averageQuality: 5
    }
  };
}

function extractSimpleConcepts(content: string): string[] {
  const words = content.match(/\b[A-Z][a-zA-Z]{2,}\b/g) || [];
  const concepts = [...new Set(words)].filter(word => 
    word.length > 3 && word.length < 20 && 
    !['The', 'This', 'That', 'These', 'Those', 'With', 'From', 'They', 'Were', 'Been', 'Have', 'Will'].includes(word)
  );
  return concepts.length > 0 ? concepts.slice(0, 5) : ['topic', 'concept', 'information'];
}

function createLastResortQuestions(content: string, count: number): any[] {
  const questions: any[] = [];
  
  for (let i = 0; i < Math.min(count, 3); i++) {
    questions.push({
      id: `last_resort_${Date.now()}_${i}`,
      question: `Based on the content, what information is provided?`,
      type: 'short_answer',
      correctAnswer: 'The content provides educational information on the topic.',
      difficulty: 'easy',
      explanation: 'This question tests basic comprehension of the content.',
      topic: 'General',
      sourceChunk: content.substring(0, 100) + '...'
    });
  }
  
  return questions;
}

function generateContentSuggestions(analysis: any, questionResult?: any, method?: string): string[] {
  const suggestions: string[] = [];
  
  if (method?.includes('fallback')) {
    suggestions.push('Questions generated using fallback method - consider providing more structured content');
  }
  
  if (analysis.educationalValue < 6) {
    suggestions.push('Consider adding more detailed explanations and examples to improve question quality');
  }
  
  if (analysis.keyConcepts.length < 3) {
    suggestions.push('Include more specific concepts and technical terms for richer questions');
  }
  
  return suggestions;
}

function checkRateLimit(clientIP: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const windowMs = 60 * 1000; 
  const maxRequests = 15; // Increased for better UX
  
  const clientData = rateLimitMap.get(clientIP);
  
  if (!clientData || now > clientData.resetTime) {
    rateLimitMap.set(clientIP, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }
  
  if (clientData.count >= maxRequests) {
    return { 
      allowed: false, 
      retryAfter: Math.ceil((clientData.resetTime - now) / 1000) 
    };
  }
  
  clientData.count++;
  return { allowed: true };
}

function generateCacheKey(content: string, maxQuestions: number, difficulty: string | number, examLevel: string): string {
  const contentHash = content.substring(0, 100) + content.length;
  return `${contentHash}-${maxQuestions}-${String(difficulty)}-${examLevel}`.replace(/[^a-zA-Z0-9-]/g, '');
}

function checkCache(key: string): any | null {
  const cached = requestCache.get(key);
  if (!cached) return null;
  
  const maxAge = 10 * 60 * 1000;
  if (Date.now() - cached.timestamp > maxAge) {
    requestCache.delete(key);
    return null;
  }
  
  return cached.data;
}

function cacheResult(key: string, data: any): void {
  if (requestCache.size > 100) {
    const oldestKey = requestCache.keys().next().value;
    if (oldestKey !== undefined) {
      requestCache.delete(oldestKey);
    }
  }
  
  requestCache.set(key, {
    data,
    timestamp: Date.now()
  });
}

function createErrorResponse(error: APIError, status: number) {
  return NextResponse.json({
    error: error.message,
    code: error.code,
    details: error.details,
    suggestions: error.suggestions,
    timestamp: new Date().toISOString()
  }, { status });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const testContent = searchParams.get('test');
  
  if (!testContent) {
    return NextResponse.json({ 
      message: 'FIXED Enhanced question generation API',
      version: '3.1',
      features: ['Robust fallback mechanisms', 'Time-based chunking', 'Lenient validation'],
      endpoints: {
        'POST /': 'Generate questions with enhanced fallback',
        'GET /?test=content': 'Test content analysis'
      }
    });
  }
  
  try {
    const validation = validateContentQuality(testContent);
    const analysis = testContent ? analyzeContentForLearning(testContent) : null;
    
    return NextResponse.json({
      contentValidation: validation,
      analysis: analysis ? {
        keyConcepts: analysis.keyConcepts.length,
        meaningfulConcepts: analysis.keyConcepts.filter(c => c.isMainConcept).length,
        educationalValue: analysis.educationalValue,
        contentQuality: analysis.contentQuality,
        difficultyLevel: analysis.difficultyLevel,
        topConcepts: analysis.keyConcepts.slice(0, 5).map(c => c.term)
      } : null,
      recommendations: {
        suitableForQuestions: validation.valid,
        suggestedQuestionCount: analysis ? Math.min(6, Math.max(2, analysis.keyConcepts.length)) : 2,
        contentQuality: analysis?.educationalValue != null ? (
                           analysis.educationalValue > 7 ? 'excellent' : 
                           analysis.educationalValue > 5 ? 'good' : 
                           analysis.educationalValue > 3 ? 'fair' : 'basic'
                         ) : 'unknown'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Failed to analyze test content',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}