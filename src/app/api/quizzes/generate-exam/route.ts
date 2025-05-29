import { NextRequest, NextResponse } from 'next/server';
import { examLevelQuestionGenerator } from '@/ai/enhanced-question-generator';
import { analyzeContentForLearning } from '@/utils/content-analysis';

export async function POST(req: NextRequest) {
  try {
    const { 
      chunks, 
      weakAreas = [], 
      questionCount = 10, 
      questionTypes = ['multiple_choice', 'true_false', 'fill_in_blank', 'short_answer'], 
      difficultyLevel = 50,
      focusOnWeakAreas = false,
      examLevel = 'standardized',
      documentTitle = 'Study Material'
    } = await req.json();

    if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
      return NextResponse.json({ 
        error: 'Missing or invalid content chunks',
        details: 'Chunks array is required and must contain at least one content chunk'
      }, { status: 400 });
    }

    console.log('🎯 Starting real exam question generation:', {
      chunkCount: chunks.length,
      questionCount,
      difficultyLevel,
      examLevel,
      focusOnWeakAreas,
      weakAreasCount: weakAreas.length
    });

    // Combine all chunks into a comprehensive content string
    const combinedContent = chunks.map((chunk: any, index: number) => {
      const chunkContent = typeof chunk === 'string' ? chunk : chunk.content || '';
      return `Section ${index + 1}:\n${chunkContent}`;
    }).join('\n\n');

    if (combinedContent.trim().length < 200) {
      return NextResponse.json({ 
        error: 'Insufficient content for exam generation',
        details: 'Combined content must be at least 200 characters long'
      }, { status: 400 });
    }

    console.log('📄 Analyzing combined content:', {
      totalLength: combinedContent.length,
      chunkCount: chunks.length
    });

    // Analyze the combined content
    const contentAnalysis = analyzeContentForLearning(combinedContent);
    
    console.log('📊 Content analysis results:', {
      educationalValue: contentAnalysis.educationalValue,
      conceptCount: contentAnalysis.keyConcepts.length,
      mainConcepts: contentAnalysis.keyConcepts.filter(c => c.isMainConcept).length,
      topicCoherence: contentAnalysis.topicCoherence,
      difficultyLevel: contentAnalysis.difficultyLevel
    });

    if (contentAnalysis.educationalValue < 3) {
      return NextResponse.json({ 
        error: 'Content has insufficient educational value for exam questions',
        details: { 
          educationalValue: contentAnalysis.educationalValue,
          minimumRequired: 3,
          suggestion: 'Content should include clear concepts, definitions, and educational material'
        }
      }, { status: 400 });
    }

    // Determine exam level based on content analysis and provided level
    const determinedExamLevel = examLevel || (
      contentAnalysis.difficultyLevel === 'advanced' ? 'graduate' :
      contentAnalysis.difficultyLevel === 'intermediate' ? 'standardized' : 'classroom'
    );

    // Adjust question count based on content analysis
    const adjustedQuestionCount = Math.min(
      questionCount,
      Math.max(3, Math.floor(contentAnalysis.keyConcepts.length * 1.2))
    );

    console.log('🎓 Using enhanced question generator for exam:', {
      examLevel: determinedExamLevel,
      adjustedQuestionCount,
      questionTypes: questionTypes.length
    });

    try {
      // Use the REAL enhanced question generator for exam-level questions
      const questionResult = await examLevelQuestionGenerator.generateExamLevelQuestions(
        combinedContent,
        contentAnalysis,
        {
          documentTitle,
          maxQuestions: adjustedQuestionCount,
          questionTypes: questionTypes.filter(type => 
            ['multiple_choice', 'true_false', 'fill_in_blank', 'short_answer', 'essay', 'application'].includes(type)
          ),
          difficultyLevel,
          examLevel: determinedExamLevel,
          focusAreas: weakAreas.map((area: any) => area.topic || area).filter(Boolean),
          previousAnswered: []
        }
      );

      if (!questionResult || !questionResult.questions || questionResult.questions.length === 0) {
        throw new Error('Enhanced generator returned no questions');
      }

      console.log('✅ Enhanced exam generation successful:', {
        questionsGenerated: questionResult.questions.length,
        averageEducationalValue: questionResult.metadata?.averageEducationalValue,
        bloomDistribution: questionResult.metadata?.bloomDistribution,
        examLevel: determinedExamLevel
      });

      // Filter for high-quality exam questions
      const examQualities = questionResult.questions.filter(q => 
        (q.educationalValue || 0) >= 7 && 
        ['understand', 'apply', 'analyze', 'evaluate', 'create'].includes(q.bloomLevel || '')
      );

      const finalQuestions = examQualities.length >= Math.ceil(adjustedQuestionCount * 0.7) 
        ? examQualities 
        : questionResult.questions;

      // If focusing on weak areas, prioritize those questions
      let prioritizedQuestions = finalQuestions;
      if (focusOnWeakAreas && weakAreas.length > 0) {
        const weakAreaTopics = weakAreas.map((area: any) => 
          typeof area === 'string' ? area : area.topic
        ).filter(Boolean);
        
        const weakAreaQuestions = finalQuestions.filter(q => 
          weakAreaTopics.some(topic => 
            q.topic?.toLowerCase().includes(topic.toLowerCase()) ||
            q.conceptTested?.some((concept: string) => 
              concept.toLowerCase().includes(topic.toLowerCase())
            )
          )
        );
        
        const otherQuestions = finalQuestions.filter(q => !weakAreaQuestions.includes(q));
        
        // Prioritize weak area questions but include others to fill quota
        prioritizedQuestions = [
          ...weakAreaQuestions,
          ...otherQuestions.slice(0, Math.max(0, adjustedQuestionCount - weakAreaQuestions.length))
        ].slice(0, adjustedQuestionCount);
        
        console.log('🎯 Prioritized weak area questions:', {
          weakAreaQuestions: weakAreaQuestions.length,
          totalSelected: prioritizedQuestions.length,
          weakAreas: weakAreaTopics
        });
      }

      return NextResponse.json({ 
        questions: prioritizedQuestions.slice(0, adjustedQuestionCount),
        metadata: {
          originalRequestCount: questionCount,
          generatedCount: prioritizedQuestions.length,
          contentAnalysis: {
            educationalValue: contentAnalysis.educationalValue,
            conceptCount: contentAnalysis.keyConcepts.length,
            difficultyLevel: contentAnalysis.difficultyLevel,
            topicCoherence: contentAnalysis.topicCoherence
          },
          examLevel: determinedExamLevel,
          focusedOnWeakAreas: focusOnWeakAreas && weakAreas.length > 0,
          weakAreasCovered: weakAreas.length,
          enhancedGeneration: true,
          generationMetadata: questionResult.metadata
        }
      });

    } catch (enhancedError) {
      console.error('❌ Enhanced exam generation failed:', enhancedError);
      
      // Fallback to basic exam question generation
      console.log('🔄 Using fallback exam generation...');
      
      const fallbackQuestions = generateFallbackExamQuestions(
        combinedContent,
        contentAnalysis,
        adjustedQuestionCount,
        questionTypes,
        difficultyLevel
      );

      return NextResponse.json({ 
        questions: fallbackQuestions,
        metadata: {
          originalRequestCount: questionCount,
          generatedCount: fallbackQuestions.length,
          contentAnalysis: {
            educationalValue: contentAnalysis.educationalValue,
            conceptCount: contentAnalysis.keyConcepts.length,
            difficultyLevel: contentAnalysis.difficultyLevel
          },
          examLevel: determinedExamLevel,
          focusedOnWeakAreas: focusOnWeakAreas,
          fallbackUsed: true,
          enhancedError: enhancedError instanceof Error ? enhancedError.message : String(enhancedError)
        }
      });
    }

  } catch (error) {
    console.error('❌ Error in exam generation:', error);
    return NextResponse.json({ 
      error: 'Failed to generate exam questions',
      details: error instanceof Error ? error.message : 'Unknown error occurred',
      suggestions: [
        'Ensure content chunks are provided and contain educational material',
        'Check that question count is reasonable (3-20)',
        'Verify content has sufficient educational value'
      ]
    }, { status: 500 });
  }
}

// Fallback exam question generation when enhanced AI fails
function generateFallbackExamQuestions(
  content: string,
  analysis: any,
  questionCount: number,
  questionTypes: string[],
  difficultyLevel: number
): any[] {
  console.log('🔧 Generating fallback exam questions...');
  
  const questions = [];
  const mainConcepts = analysis.keyConcepts.filter((c: any) => c.isMainConcept).slice(0, 10);
  const allConcepts = analysis.keyConcepts.slice(0, 15);
  
  // Generate questions based on available concepts
  const conceptsToUse = mainConcepts.length > 0 ? mainConcepts : allConcepts;
  
  for (let i = 0; i < Math.min(questionCount, conceptsToUse.length * 2); i++) {
    const concept = conceptsToUse[i % conceptsToUse.length];
    const questionType = questionTypes[i % questionTypes.length];
    const difficulty = difficultyLevel > 60 ? 'hard' : difficultyLevel > 40 ? 'medium' : 'easy';
    
    let question;
    
    switch (questionType) {
      case 'multiple_choice':
        question = {
          id: `exam_fallback_mc_${Date.now()}_${i}`,
          question: `In the context of this material, how would you best describe the role of ${concept.term}?`,
          type: 'multiple_choice',
          options: [
            `${concept.term} serves as a fundamental concept that supports understanding`,
            `${concept.term} is mentioned only briefly without significant detail`,
            `${concept.term} contradicts other concepts presented in the material`,
            `${concept.term} is not relevant to the main educational objectives`
          ],
          correctAnswer: `${concept.term} serves as a fundamental concept that supports understanding`,
          difficulty,
          explanation: `${concept.term} is identified as a key concept with high importance in the educational content, making it fundamental to understanding the material.`,
          topic: concept.term,
          bloomLevel: 'understand',
          educationalValue: 7,
          examLevel: 'standardized',
          conceptTested: [concept.term],
          sourceChunk: concept.context?.[0] || content.substring(0, 150) + '...'
        };
        break;
        
      case 'true_false':
        question = {
          id: `exam_fallback_tf_${Date.now()}_${i}`,
          question: `True or False: ${concept.term} plays a significant role in understanding the core principles discussed in this material.`,
          type: 'true_false',
          correctAnswer: 'True',
          difficulty,
          explanation: `This is true because ${concept.term} is identified as a key concept that helps explain the main ideas and principles.`,
          topic: concept.term,
          bloomLevel: 'understand',
          educationalValue: 6,
          examLevel: 'standardized',
          conceptTested: [concept.term],
          sourceChunk: concept.context?.[0] || content.substring(0, 150) + '...'
        };
        break;
        
      case 'short_answer':
        question = {
          id: `exam_fallback_sa_${Date.now()}_${i}`,
          question: `Analyze the importance of ${concept.term} within the context of this educational material. How does it contribute to overall understanding?`,
          type: 'short_answer',
          correctAnswer: `${concept.term} is important because it provides foundational understanding that connects to other concepts and helps build comprehensive knowledge. It contributes to overall understanding by serving as a key building block that supports more complex ideas and practical applications.`,
          difficulty,
          explanation: `This question tests analytical thinking about ${concept.term} and requires understanding of its role in the broader educational context.`,
          topic: concept.term,
          bloomLevel: 'analyze',
          educationalValue: 8,
          examLevel: 'standardized',
          conceptTested: [concept.term],
          sourceChunk: concept.context?.[0] || content.substring(0, 150) + '...'
        };
        break;
        
      case 'fill_in_blank':
      default:
        question = {
          id: `exam_fallback_fib_${Date.now()}_${i}`,
          question: `Complete this statement: _____ is a crucial concept that helps explain the fundamental principles discussed in this educational material.`,
          type: 'fill_in_blank',
          correctAnswer: concept.term,
          difficulty,
          explanation: `${concept.term} is the correct answer as it is identified as a key concept that plays a crucial role in explaining the fundamental principles.`,
          topic: concept.term,
          bloomLevel: 'remember',
          educationalValue: 6,
          examLevel: 'standardized',
          conceptTested: [concept.term],
          sourceChunk: concept.context?.[0] || content.substring(0, 150) + '...'
        };
        break;
    }
    
    questions.push(question);
  }
  
  console.log(`✅ Generated ${questions.length} fallback exam questions`);
  return questions;
}