import { NextRequest, NextResponse } from 'next/server';
import { examLevelQuestionGenerator } from '@/ai/enhanced-question-generator';
import { analyzeContentForLearning } from '@/utils/content-analysis';

export async function POST(req: NextRequest) {
  try {
    // Fetch and validate the request body
    const { 
      topics, 
      documentIds, 
      questionType = 'mix',
      difficultyLevel = 50,
      questionCount = 5, 
      timeLimit = 10,
      flagConfusingTerms = true,
      addBrainBoost = false
    } = await req.json();
    
    // Basic validation checks
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Missing or invalid document IDs' }, 
        { status: 400 }
      );
    }
    
    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Missing or invalid topics' }, 
        { status: 400 }
      );
    }
    
    if (questionCount <= 0 || questionCount > 50) {
      return NextResponse.json(
        { success: false, message: 'Question count must be between 1 and 50' }, 
        { status: 400 }
      );
    }
    
    console.log('🚀 Starting real question generation for quiz:', {
      documentIds,
      topics,
      questionCount,
      questionType,
      difficultyLevel
    });
    
    // TODO: In a real implementation, fetch actual document content from database/storage
    // For now, this is a placeholder that should be replaced with actual document fetching
    // You'll need to implement document retrieval based on your storage system
    
    // Example of how this should work:
    // const documents = await fetchDocumentsFromDatabase(documentIds);
    
    // For now, using placeholder content - REPLACE THIS WITH REAL DOCUMENT FETCHING
    const mockDocumentContent = `
Educational Content About ${topics.join(', ')}

This section covers important concepts related to ${topics.join(' and ')}.

Key Concepts:
${topics.map(topic => `- ${topic}: This is a fundamental concept that plays a crucial role in understanding the broader subject matter.`).join('\n')}

Important Principles:
The relationship between ${topics[0]} and other concepts is essential for comprehensive understanding. 
${topics.length > 1 ? `Additionally, ${topics[1]} provides crucial context for practical applications.` : ''}

Examples and Applications:
In practical scenarios, these concepts are applied through various methodologies and frameworks.
Understanding these principles enables better decision-making and problem-solving capabilities.

Conclusion:
Mastery of these concepts - ${topics.join(', ')} - is fundamental for success in this field.
The interconnected nature of these topics requires holistic understanding for effective application.
    `.trim();

    console.log('📄 Using content for question generation:', {
      contentLength: mockDocumentContent.length,
      topics: topics.length
    });

    // Analyze content for educational value
    const contentAnalysis = analyzeContentForLearning(mockDocumentContent);
    
    console.log('📊 Content analysis results:', {
      educationalValue: contentAnalysis.educationalValue,
      conceptCount: contentAnalysis.keyConcepts.length,
      topicCoherence: contentAnalysis.topicCoherence
    });

    if (contentAnalysis.educationalValue < 4) {
      return NextResponse.json({
        success: false,
        message: 'Content has insufficient educational value for question generation',
        details: { educationalValue: contentAnalysis.educationalValue }
      }, { status: 400 });
    }
    
    // Determine question types to include based on questionType parameter
    const questionTypes = [];
    if (questionType === 'mix' || questionType === 'multiple_choice') {
      questionTypes.push('multiple_choice');
    }
    if (questionType === 'mix' || questionType === 'true_false') {
      questionTypes.push('true_false');
    }
    if (questionType === 'mix' || questionType === 'fill_in_blank') {
      questionTypes.push('fill_in_blank');
    }
    if (questionType === 'mix' || questionType === 'short_answer') {
      questionTypes.push('short_answer');
    }

    // Default to mixed types if none specified
    if (questionTypes.length === 0) {
      questionTypes.push('multiple_choice', 'true_false', 'short_answer');
    }

    // Determine exam level based on difficulty
    const examLevel = difficultyLevel >= 75 ? 'graduate' :
                     difficultyLevel >= 60 ? 'professional' :
                     difficultyLevel >= 40 ? 'standardized' : 'classroom';

    console.log('🎯 Generating questions with enhanced AI:', {
      questionCount,
      questionTypes,
      examLevel,
      difficultyLevel
    });

    try {
      // Use the REAL enhanced question generator
      const questionResult = await examLevelQuestionGenerator.generateExamLevelQuestions(
        mockDocumentContent,
        contentAnalysis,
        {
          documentTitle: `Quiz on ${topics.join(', ')}`,
          maxQuestions: questionCount,
          questionTypes,
          difficultyLevel,
          examLevel,
          focusAreas: topics,
          previousAnswered: []
        }
      );

      if (!questionResult || !questionResult.questions || questionResult.questions.length === 0) {
        throw new Error('No questions generated by enhanced generator');
      }

      console.log('✅ Successfully generated questions:', {
        count: questionResult.questions.length,
        types: [...new Set(questionResult.questions.map(q => q.type))],
        avgEducationalValue: questionResult.metadata?.averageEducationalValue
      });

      // Generate glossary terms if requested
      let glossary = null;
      if (flagConfusingTerms) {
        glossary = contentAnalysis.keyConcepts
          .filter(concept => concept.isMainConcept)
          .slice(0, 5)
          .map(concept => `${concept.term}: ${concept.definitions[0] || `Key concept related to ${topics.join(' and ')}`}`);
      }
      
      // Add a brain boost question if requested
      let finalQuestions = [...questionResult.questions];
      if (addBrainBoost && questionResult.questions.length > 0) {
        // Create a synthesis question that combines multiple concepts
        const brainBoostQuestion = {
          id: `brainboost_${Date.now()}`,
          question: `Analyze how the concepts of ${topics.slice(0, 2).join(' and ')} work together to achieve better understanding. What are the key relationships and implications?`,
          type: 'short_answer',
          difficulty: 'advanced',
          correctAnswer: `The integration of ${topics.slice(0, 2).join(' and ')} creates synergistic effects that enhance overall comprehension through their interconnected principles and complementary applications.`,
          explanation: 'This question tests your ability to synthesize multiple concepts and understand their relationships, which demonstrates deeper learning.',
          topic: topics.join(', '),
          bloomLevel: 'create',
          examLevel: 'graduate',
          educationalValue: 9,
          conceptTested: topics.slice(0, 2),
          cognitiveLoad: 'high',
          timeToAnswer: 300,
          hintsAvailable: ['Think about how these concepts complement each other', 'Consider both theoretical and practical connections'],
          commonMistakes: ['Discussing concepts in isolation rather than showing relationships'],
          relatedConcepts: topics
        };
        
        finalQuestions.push(brainBoostQuestion);
      }
      
      // Return the real generated quiz
      return NextResponse.json({
        success: true,
        questions: finalQuestions,
        glossary,
        metadata: {
          documentIds,
          topics,
          questionCount: finalQuestions.length,
          difficultyLevel,
          timeLimit,
          examLevel,
          contentAnalysis: {
            educationalValue: contentAnalysis.educationalValue,
            conceptCount: contentAnalysis.keyConcepts.length,
            topicCoherence: contentAnalysis.topicCoherence
          },
          generationMetadata: questionResult.metadata
        }
      });
      
    } catch (aiError) {
      console.error('❌ Enhanced question generation failed:', aiError);
      
      // Fallback to basic question generation if enhanced fails
      console.log('🔄 Falling back to basic question generation...');
      
      const fallbackQuestions = generateBasicFallbackQuestions(
        mockDocumentContent, 
        topics, 
        questionCount, 
        questionTypes
      );
      
      return NextResponse.json({
        success: true,
        questions: fallbackQuestions,
        glossary: flagConfusingTerms ? topics.map(topic => `${topic}: Key concept in this subject area`) : null,
        metadata: {
          documentIds,
          topics,
          questionCount: fallbackQuestions.length,
          difficultyLevel,
          timeLimit,
          fallbackUsed: true,
          originalError: aiError instanceof Error ? aiError.message : String(aiError)
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error in quiz generation endpoint:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to generate quiz. Please try again.',
        details: error instanceof Error ? error.stack : undefined
      }, 
      { status: 500 }
    );
  }
}

// Fallback question generation for when AI fails
function generateBasicFallbackQuestions(
  content: string,
  topics: string[],
  questionCount: number,
  questionTypes: string[]
): any[] {
  console.log('🔧 Generating basic fallback questions...');
  
  const questions = [];
  
  // Extract sentences for creating questions
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
  
  for (let i = 0; i < Math.min(questionCount, topics.length * 2); i++) {
    const topic = topics[i % topics.length];
    const questionType = questionTypes[i % questionTypes.length];
    const questionId = `fallback_${Date.now()}_${i}`;
    
    let question;
    
    switch (questionType) {
      case 'multiple_choice':
        question = {
          id: questionId,
          question: `Which of the following best describes ${topic}?`,
          type: 'multiple_choice',
          options: [
            `${topic} is a fundamental concept discussed in the material`,
            `${topic} is rarely mentioned in educational contexts`,
            `${topic} is not relevant to this subject area`,
            `${topic} is only used in advanced applications`
          ],
          correctAnswer: `${topic} is a fundamental concept discussed in the material`,
          difficulty: 'medium',
          explanation: `${topic} is identified as a key concept in the educational content.`,
          topic,
          bloomLevel: 'understand',
          educationalValue: 6
        };
        break;
        
      case 'true_false':
        question = {
          id: questionId,
          question: `True or False: ${topic} is an important concept for understanding this subject.`,
          type: 'true_false',
          correctAnswer: 'True',
          difficulty: 'easy',
          explanation: `${topic} is indeed a key concept that helps explain the main ideas.`,
          topic,
          bloomLevel: 'remember',
          educationalValue: 5
        };
        break;
        
      case 'fill_in_blank':
        question = {
          id: questionId,
          question: `Fill in the blank: _____ is a key concept that helps explain the main principles in this area.`,
          type: 'fill_in_blank',
          correctAnswer: topic,
          difficulty: 'medium',
          explanation: `${topic} is identified as a central concept in the material.`,
          topic,
          bloomLevel: 'remember',
          educationalValue: 6
        };
        break;
        
      case 'short_answer':
      default:
        question = {
          id: questionId,
          question: `Explain the significance of ${topic} in the context of this subject area.`,
          type: 'short_answer',
          correctAnswer: `${topic} is significant because it provides fundamental understanding and serves as a building block for more complex concepts in this field.`,
          difficulty: 'medium',
          explanation: `This question tests understanding of ${topic} and its role in the broader context.`,
          topic,
          bloomLevel: 'understand',
          educationalValue: 7
        };
        break;
    }
    
    questions.push(question);
  }
  
  console.log(`✅ Generated ${questions.length} fallback questions`);
  return questions;
}

// Helper function to convert numerical difficulty to text
function getDifficultyText(difficultyLevel: number): string {
  if (difficultyLevel < 30) return "basic";
  if (difficultyLevel < 60) return "moderate";
  if (difficultyLevel < 85) return "challenging";
  return "expert";
}