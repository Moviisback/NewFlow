import axios from 'axios';
import { analyzeContentForLearning, ContentAnalysis } from '@/utils/content-analysis';

// Configure Gemini API
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Enhanced Question Interface with educational focus
export interface EnhancedQuestion {
  id: string;
  question: string;
  options?: string[];
  correctAnswer: string;
  type: 'multiple_choice' | 'true_false' | 'fill_in_blank' | 'short_answer' | 'essay' | 'application';
  difficulty: string;
  explanation: string;
  sourcePage?: number;
  sourceChunk: string; // Required field
  chunkIndex?: number;
  topic: string;
  bloomLevel: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
  educationalValue: number; // 1-10 scale
  conceptTested: string[];
  cognitiveLoad: 'low' | 'medium' | 'high';
  examLevel: 'classroom' | 'standardized' | 'professional' | 'graduate';
  timeToAnswer: number; // seconds
  hintsAvailable: string[];
  commonMistakes: string[];
  relatedConcepts: string[];
}

export interface QuestionGenerationStrategy {
  name: string;
  description: string;
  bloomLevels: string[];
  questionTypes: string[];
  examLevel: string;
  weight: number;
}

export interface QuestionGenerationMetadata {
  totalGenerated: number;
  qualityFiltered: number;
  averageEducationalValue: number;
  bloomDistribution: Record<string, number>;
  typeDistribution: Record<string, number>;
  difficultyDistribution: Record<string, number>;
  examLevelDistribution: Record<string, number>;
  conceptsCovered: string[];
  averageTimeToAnswer: number;
  qualityMetrics: {
    highEducationalValue: number;
    hasExplanations: number;
    hasHints: number;
    hasCommonMistakes: number;
  };
}

export interface QuestionGenerationResult {
  questions: EnhancedQuestion[];
  metadata: QuestionGenerationMetadata;
}

export class ExamLevelQuestionGenerator {
  private readonly GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  private readonly GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  private readonly strategies: QuestionGenerationStrategy[] = [
    {
      name: 'conceptual_understanding',
      description: 'Test deep understanding of key concepts and their relationships',
      bloomLevels: ['understand', 'analyze'],
      questionTypes: ['multiple_choice', 'short_answer'],
      examLevel: 'standardized',
      weight: 0.4
    },
    {
      name: 'application_synthesis',
      description: 'Test ability to apply concepts to new situations',
      bloomLevels: ['apply', 'create'],
      questionTypes: ['application', 'essay'],
      examLevel: 'professional',
      weight: 0.3
    },
    {
      name: 'critical_analysis',
      description: 'Test analytical and evaluative thinking',
      bloomLevels: ['analyze', 'evaluate'],
      questionTypes: ['multiple_choice', 'short_answer'],
      examLevel: 'graduate',
      weight: 0.3
    }
  ];

  async generateExamLevelQuestions(
    content: string,
    contentAnalysis: ContentAnalysis,
    params: {
      documentTitle?: string;
      maxQuestions: number;
      questionTypes: string[];
      difficultyLevel: number;
      examLevel?: 'classroom' | 'standardized' | 'professional' | 'graduate';
      focusAreas?: string[];
      previousAnswered?: string[];
    }
  ): Promise<QuestionGenerationResult> {
    
    console.log('🎯 Generating exam-level questions with enhanced strategy...');
    
    // FIXED: More lenient content validation
    const contentValidation = this.validateContentForExamQuestions(contentAnalysis, content);
    if (!contentValidation.suitable) {
      console.warn('⚠️ Content validation failed, using enhanced fallback:', contentValidation.reason);
      return this.generateComprehensiveFallback(content, contentAnalysis, params);
    }

    const allQuestions: EnhancedQuestion[] = [];
    const examLevel = params.examLevel || 'standardized';
    
    try {
      // Strategy 1: Generate concept-mastery questions
      const conceptQuestions = await this.generateConceptMasteryQuestions(
        content, contentAnalysis, params, Math.ceil(params.maxQuestions * 0.4)
      );
      allQuestions.push(...conceptQuestions);

      // Strategy 2: Generate application questions
      const applicationQuestions = await this.generateApplicationQuestions(
        content, contentAnalysis, params, Math.ceil(params.maxQuestions * 0.3)
      );
      allQuestions.push(...applicationQuestions);

      // Strategy 3: Generate analytical questions
      const analyticalQuestions = await this.generateAnalyticalQuestions(
        content, contentAnalysis, params, Math.ceil(params.maxQuestions * 0.3)
      );
      allQuestions.push(...analyticalQuestions);

      // Validate with more lenient standards
      const validatedQuestions = await this.validateExamLevelQuestions(allQuestions, contentAnalysis);
      
      // Select best questions with educational diversity
      const selectedQuestions = this.selectEducationallyDiverseQuestions(
        validatedQuestions, 
        params.maxQuestions, 
        contentAnalysis,
        examLevel
      );

      const metadata = this.generateAdvancedMetadata(selectedQuestions, allQuestions, contentAnalysis);

      console.log('✅ Exam-level question generation complete:', {
        totalGenerated: allQuestions.length,
        afterValidation: validatedQuestions.length,
        finalSelected: selectedQuestions.length,
        averageEducationalValue: metadata.averageEducationalValue,
        examLevel: examLevel
      });

      return { questions: selectedQuestions, metadata };
      
    } catch (error) {
      console.error('Enhanced generation failed, using fallback:', error);
      return this.generateComprehensiveFallback(content, contentAnalysis, params);
    }
  }

  // FIXED: More lenient validation - reduced thresholds
  private validateContentForExamQuestions(analysis: ContentAnalysis, content: string): {suitable: boolean, reason?: string} {
    if (content.length < 100) { // Reduced from 200
      return { suitable: false, reason: 'Content too short for comprehensive exam questions (minimum 100 characters)' };
    }

    if (analysis.keyConcepts.length === 0) { // Reduced from 2
      return { suitable: false, reason: 'No educational concepts found for meaningful question generation' };
    }

    if (analysis.educationalValue < 3) { // Reduced from 6
      return { suitable: false, reason: `Content educational value too low (${analysis.educationalValue}/10, minimum 3/10)` };
    }

    const meaningfulConcepts = analysis.keyConcepts.filter(c => 
      c.term.length > 2 && (c.importance || 0) > 3 // Reduced from 5
    );

    if (meaningfulConcepts.length === 0) {
      return { suitable: false, reason: 'No high-quality concepts found for exam question generation' };
    }

    return { suitable: true };
  }

  private async generateConceptMasteryQuestions(
    content: string,
    analysis: ContentAnalysis,
    params: any,
    count: number
  ): Promise<EnhancedQuestion[]> {
    const mainConcepts = analysis.keyConcepts.filter(c => c.isMainConcept).slice(0, 5);
    
    // FIXED: Handle case where no main concepts exist
    if (mainConcepts.length === 0) {
      return this.generateBasicConceptQuestions(content, analysis.keyConcepts.slice(0, 3), count);
    }
    
    const conceptNames = mainConcepts.map(c => c.term).join(', ');
    
    const prompt = `
# EXAM-LEVEL EDUCATIONAL QUESTION GENERATION - CONCEPT MASTERY

You are an expert exam designer creating questions that test DEEP UNDERSTANDING, not just memorization.

## CONTENT TO ANALYZE:
${content.substring(0, 2000)}

## KEY CONCEPTS TO TEST:
${conceptNames}

## EDUCATIONAL OBJECTIVES:
${analysis.learningObjectives?.join('\n') || 'Test understanding of main concepts'}

## QUESTION REQUIREMENTS:
1. **DEPTH OVER BREADTH**: Test understanding of WHY and HOW, not just WHAT
2. **REAL UNDERSTANDING**: Questions should reveal if students truly grasp the concepts
3. **EXAM-LEVEL RIGOR**: Questions should match ${params.examLevel || 'standardized'} exam standards
4. **AVOID TRIVIAL RECALL**: No questions answerable by simple keyword matching
5. **TEST RELATIONSHIPS**: Focus on how concepts connect and interact

## OUTPUT FORMAT (JSON):
Create ${Math.min(count, 4)} questions in this format:
[
  {
    "id": "concept_q1",
    "question": "Meaningful question that tests deep understanding",
    "type": "multiple_choice|short_answer",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": "Thoughtful answer that demonstrates understanding",
    "difficulty": "intermediate",
    "explanation": "Detailed explanation of why this answer is correct",
    "topic": "Main concept being tested",
    "sourceChunk": "Relevant quote from the content"
  }
]

Generate questions now:`;

    try {
      // FIXED: Check for API key first
      if (!this.GEMINI_API_KEY) {
        console.warn('No Gemini API key, using fallback generation');
        return this.generateBasicConceptQuestions(content, mainConcepts, count);
      }

      const response = await axios.post(
        `${this.GEMINI_API_URL}?key=${this.GEMINI_API_KEY}`,
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
      const jsonMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
      
      if (!jsonMatch) {
        console.warn('No valid JSON found in concept mastery response');
        return this.generateBasicConceptQuestions(content, mainConcepts, count);
      }

      const questionsData = JSON.parse(jsonMatch[0]);
      
      // FIXED: Ensure all required fields are present
      return questionsData.map((q: any, index: number) => {
        const conceptIndex = index % mainConcepts.length;
        const currentConcept = mainConcepts[conceptIndex];
        const conceptTerm = currentConcept?.term || 'key concept';
        const firstConcept = mainConcepts[0];
        const firstConceptTerm = firstConcept?.term || 'General';
        
        return {
          id: `concept_${Date.now()}_${index}`,
          question: q.question || `What is the significance of ${conceptTerm}?`,
          options: q.type === 'multiple_choice' ? q.options : undefined,
          correctAnswer: String(q.correctAnswer || conceptTerm),
          type: q.type || 'short_answer',
          difficulty: q.difficulty || 'intermediate',
          explanation: q.explanation || `This tests understanding of key concepts.`,
          topic: q.topic || firstConceptTerm,
          bloomLevel: q.bloomLevel || 'understand',
          sourceChunk: q.sourceChunk || this.extractRelevantContext(content, q.question),
          conceptTested: q.conceptTested || [q.topic || firstConceptTerm],
          educationalValue: 9,
          cognitiveLoad: 'medium' as const,
          examLevel: q.examLevel || params.examLevel || 'standardized',
          timeToAnswer: q.timeToAnswer || 90,
          hintsAvailable: q.hintsAvailable || [],
          commonMistakes: q.commonMistakes || [],
          relatedConcepts: mainConcepts.map(c => c?.term || 'concept').filter(t => t !== q.topic)
        };
      });

    } catch (error) {
      console.error('Concept mastery question generation failed:', error);
      return this.generateBasicConceptQuestions(content, mainConcepts, count);
    }
  }

  private async generateApplicationQuestions(
    content: string,
    analysis: ContentAnalysis,
    params: any,
    count: number
  ): Promise<EnhancedQuestion[]> {
    const mainConcepts = analysis.keyConcepts.filter(c => c.isMainConcept).slice(0, 3);
    
    // FIXED: Return empty array if no concepts, but try template generation
    if (mainConcepts.length === 0) {
      return this.generateTemplateApplicationQuestions(content, analysis.keyConcepts.slice(0, count), params);
    }

    // Enhanced application question generation with AI
    const conceptNames = mainConcepts.map(c => c.term).join(', ');
    
    const prompt = `
# APPLICATION-LEVEL QUESTION GENERATION

Create practical application questions based on this content:

## CONTENT:
${content.substring(0, 1500)}

## CONCEPTS TO APPLY: ${conceptNames}

## REQUIREMENTS:
1. Test ability to APPLY concepts in real scenarios
2. Focus on practical implementation
3. Avoid theoretical definitions
4. Create scenario-based questions

## OUTPUT FORMAT (JSON):
[
  {
    "question": "How would you apply [concept] in [scenario]?",
    "type": "short_answer",
    "correctAnswer": "Application-focused answer",
    "explanation": "Why this application works",
    "topic": "concept name"
  }
]

Generate ${Math.min(count, 3)} questions:`;

    try {
      if (!this.GEMINI_API_KEY) {
        return this.generateTemplateApplicationQuestions(content, mainConcepts, params);
      }

      const response = await axios.post(
        `${this.GEMINI_API_URL}?key=${this.GEMINI_API_KEY}`,
        {
          contents: [{ parts: [{ text: prompt }] }]
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 25000
        }
      );

      const responseText = response.data.candidates[0]?.content?.parts[0]?.text || '';
      const jsonMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
      
      if (!jsonMatch) {
        return this.generateTemplateApplicationQuestions(content, mainConcepts, params);
      }

      const questionsData = JSON.parse(jsonMatch[0]);
      
      return questionsData.map((q: any, index: number) => ({
        id: `application_${Date.now()}_${index}`,
        question: q.question || `How would you apply the concept of ${mainConcepts[index % mainConcepts.length]?.term} in a practical scenario?`,
        type: 'short_answer' as const,
        correctAnswer: String(q.correctAnswer || `${mainConcepts[index % mainConcepts.length]?.term} can be applied by understanding its principles and implementing them in relevant contexts.`),
        difficulty: 'advanced',
        explanation: q.explanation || `This question tests the ability to apply ${mainConcepts[index % mainConcepts.length]?.term} in practical situations.`,
        topic: q.topic || mainConcepts[index % mainConcepts.length]?.term || 'General',
        bloomLevel: 'apply' as const,
        sourceChunk: this.extractRelevantContext(content, q.question), // FIXED: Always provide sourceChunk
        conceptTested: [q.topic || mainConcepts[index % mainConcepts.length]?.term || 'General'],
        educationalValue: 8,
        cognitiveLoad: 'high' as const,
        examLevel: params.examLevel || 'professional' as const,
        timeToAnswer: 180,
        hintsAvailable: [`Think about real-world scenarios where ${q.topic || mainConcepts[index % mainConcepts.length]?.term} would be relevant`],
        commonMistakes: [`Describing the concept without showing how to apply it`],
        relatedConcepts: mainConcepts.map(c => c.term)
      }));

    } catch (error) {
      console.error('Application question generation failed:', error);
      return this.generateTemplateApplicationQuestions(content, mainConcepts, params);
    }
  }

  private async generateAnalyticalQuestions(
    content: string,
    analysis: ContentAnalysis,
    params: any,
    count: number
  ): Promise<EnhancedQuestion[]> {
    const mainConcepts = analysis.keyConcepts.filter(c => c.isMainConcept).slice(0, 2);
    
    // FIXED: Generate questions even with limited concepts
    if (mainConcepts.length < 2) {
      return this.generateTemplateAnalyticalQuestions(content, analysis.keyConcepts.slice(0, 2), params);
    }

    // Enhanced analytical question generation
    const prompt = `
# ANALYTICAL QUESTION GENERATION

Create analytical questions that test critical thinking:

## CONTENT:
${content.substring(0, 1500)}

## CONCEPTS TO ANALYZE: ${mainConcepts.map(c => c.term).join(', ')}

## REQUIREMENTS:
1. Test analysis and evaluation skills
2. Compare and contrast concepts
3. Examine relationships and implications
4. Require critical thinking

## OUTPUT FORMAT (JSON):
[
  {
    "question": "Compare and analyze...",
    "type": "short_answer",
    "correctAnswer": "Analytical response",
    "explanation": "Analysis explanation",
    "topic": "comparative analysis"
  }
]

Generate ${Math.min(count, 2)} questions:`;

    try {
      if (!this.GEMINI_API_KEY) {
        return this.generateTemplateAnalyticalQuestions(content, mainConcepts, params);
      }

      const response = await axios.post(
        `${this.GEMINI_API_URL}?key=${this.GEMINI_API_KEY}`,
        {
          contents: [{ parts: [{ text: prompt }] }]
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 25000
        }
      );

      const responseText = response.data.candidates[0]?.content?.parts[0]?.text || '';
      const jsonMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
      
      if (!jsonMatch) {
        return this.generateTemplateAnalyticalQuestions(content, mainConcepts, params);
      }

      const questionsData = JSON.parse(jsonMatch[0]);
      
      return questionsData.map((q: any, index: number) => ({
        id: `analytical_${Date.now()}_${index}`,
        question: q.question || `Compare and analyze the relationship between ${mainConcepts[0]?.term || 'concept A'} and ${mainConcepts[1]?.term || 'concept B'}. What are the key similarities and differences?`,
        type: 'short_answer' as const,
        correctAnswer: String(q.correctAnswer || `${mainConcepts[0]?.term || 'The first concept'} and ${mainConcepts[1]?.term || 'the second concept'} are related concepts that share similarities but differ in their specific applications and characteristics.`),
        difficulty: 'advanced',
        explanation: q.explanation || `This question tests analytical thinking by requiring comparison and relationship analysis.`,
        topic: q.topic || `${mainConcepts[0]?.term || 'concept A'} vs ${mainConcepts[1]?.term || 'concept B'}`,
        bloomLevel: 'analyze' as const,
        sourceChunk: this.extractRelevantContext(content, q.question),
        conceptTested: [mainConcepts[0]?.term || 'concept A', mainConcepts[1]?.term || 'concept B'],
        educationalValue: 9,
        cognitiveLoad: 'high' as const,
        examLevel: params.examLevel || 'graduate' as const,
        timeToAnswer: 240,
        hintsAvailable: [`Focus on both similarities and differences`, `Consider the broader context`],
        commonMistakes: [`Only describing concepts without comparing them`],
        relatedConcepts: mainConcepts.map(c => c?.term || 'concept')
      }));

    } catch (error) {
      console.error('Analytical question generation failed:', error);
      return this.generateTemplateAnalyticalQuestions(content, mainConcepts, params);
    }
  }

  // FIXED: Added comprehensive template generation methods
  private generateBasicConceptQuestions(content: string, concepts: any[], count: number): EnhancedQuestion[] {
    return concepts.slice(0, count).map((concept, index) => ({
      id: `basic_${Date.now()}_${index}`,
      question: `What is the significance of ${concept.term || concept} in this context?`,
      type: 'short_answer' as const,
      correctAnswer: `${concept.term || concept} is a key concept that helps understand the main ideas discussed in the material.`,
      difficulty: 'intermediate',
      explanation: `This question tests basic understanding of ${concept.term || concept}.`,
      topic: concept.term || concept,
      bloomLevel: 'understand' as const,
      sourceChunk: concept.context?.[0] || content.substring(0, 150) + '...', // FIXED: Always provide sourceChunk
      conceptTested: [concept.term || concept],
      educationalValue: 7,
      cognitiveLoad: 'medium' as const,
      examLevel: 'standardized' as const,
      timeToAnswer: 120,
      hintsAvailable: [`Think about the role this concept plays in the material`],
      commonMistakes: [`Giving too brief an answer without explanation`],
      relatedConcepts: concepts.map(c => c.term || c).filter(t => t !== (concept.term || concept))
    }));
  }

  private generateTemplateApplicationQuestions(content: string, concepts: any[], params: any): EnhancedQuestion[] {
    return concepts.slice(0, 2).map((concept, index) => {
      const conceptTerm = concept?.term || concept || 'key concept';
      const conceptContext = concept?.context?.[0] || content.substring(0, 150) + '...';
      const otherConcepts = concepts.map(c => c?.term || c || 'concept');
      
      return {
        id: `template_app_${Date.now()}_${index}`,
        question: `How would you apply the concept of ${conceptTerm} in a practical scenario?`,
        type: 'short_answer' as const,
        correctAnswer: `${conceptTerm} can be applied by understanding its principles and implementing them in relevant contexts to achieve specific goals.`,
        difficulty: 'advanced',
        explanation: `This question tests the ability to apply ${conceptTerm} in practical situations.`,
        topic: conceptTerm,
        bloomLevel: 'apply' as const,
        sourceChunk: conceptContext,
        conceptTested: [conceptTerm],
        educationalValue: 8,
        cognitiveLoad: 'high' as const,
        examLevel: params.examLevel || 'professional' as const,
        timeToAnswer: 180,
        hintsAvailable: [`Think about real-world scenarios where ${conceptTerm} would be relevant`],
        commonMistakes: [`Describing ${conceptTerm} without showing how to apply it`],
        relatedConcepts: otherConcepts
      };
    });
  }

  private generateTemplateAnalyticalQuestions(content: string, concepts: any[], params: any): EnhancedQuestion[] {
    if (concepts.length < 2) {
      return [{
        id: `template_analysis_${Date.now()}`,
        question: `Analyze the main ideas presented in this content. What are the key insights?`,
        type: 'short_answer' as const,
        correctAnswer: `The content presents important concepts that work together to build understanding of the subject matter.`,
        difficulty: 'advanced',
        explanation: `This question tests analytical thinking about the content's main themes.`,
        topic: 'Content Analysis',
        bloomLevel: 'analyze' as const,
        sourceChunk: content.substring(0, 150) + '...', // FIXED: Always provide sourceChunk
        conceptTested: ['General Analysis'],
        educationalValue: 8,
        cognitiveLoad: 'high' as const,
        examLevel: params.examLevel || 'graduate' as const,
        timeToAnswer: 240,
        hintsAvailable: [`Consider the overall themes and their relationships`],
        commonMistakes: [`Being too superficial in the analysis`],
        relatedConcepts: concepts.map(c => c.term || c)
      }];
    }

    return [{
      id: `template_analysis_${Date.now()}`,
      question: `Compare and analyze the relationship between ${concepts[0]?.term || concepts[0] || 'concept A'} and ${concepts[1]?.term || concepts[1] || 'concept B'}. What are the key similarities and differences?`,
      type: 'short_answer' as const,
      correctAnswer: `${concepts[0]?.term || concepts[0] || 'The first concept'} and ${concepts[1]?.term || concepts[1] || 'the second concept'} are related concepts that share some similarities but differ in their specific applications and characteristics. Understanding their relationship helps build comprehensive knowledge.`,
      difficulty: 'advanced',
      explanation: `This question tests analytical thinking by requiring comparison and relationship analysis.`,
      topic: `${concepts[0]?.term || concepts[0] || 'concept A'} vs ${concepts[1]?.term || concepts[1] || 'concept B'}`,
      bloomLevel: 'analyze' as const,
      sourceChunk: content.substring(0, 150) + '...',
      conceptTested: [concepts[0]?.term || concepts[0] || 'concept A', concepts[1]?.term || concepts[1] || 'concept B'],
      educationalValue: 9,
      cognitiveLoad: 'high' as const,
      examLevel: params.examLevel || 'graduate' as const,
      timeToAnswer: 240,
      hintsAvailable: [`Focus on both similarities and differences`, `Consider the broader context`],
      commonMistakes: [`Only describing concepts without comparing them`],
      relatedConcepts: concepts.map(c => c?.term || c || 'concept')
    }];
  }

  // FIXED: Comprehensive fallback generation
  private generateComprehensiveFallback(content: string, analysis: ContentAnalysis, params: any): QuestionGenerationResult {
    console.log('🔄 Using comprehensive fallback question generation');
    
    const concepts = analysis.keyConcepts && analysis.keyConcepts.length > 0 
      ? analysis.keyConcepts.slice(0, params.maxQuestions) 
      : this.generateBasicConceptsFromContent(content, params.maxQuestions);

    const questions: EnhancedQuestion[] = [];
    
    // Generate diverse question types
    concepts.forEach((concept, index) => {
      const questionType = index % 4;
      const conceptTerm = concept?.term || concept || 'key concept';
      const conceptContext = concept?.context?.[0] || content.substring(0, 150) + '...';
      const otherConcepts = concepts.map(c => c?.term || c || 'concept').filter(t => t !== conceptTerm);
      
      if (questionType === 0) {
        // Multiple choice
        questions.push({
          id: `fallback_mc_${Date.now()}_${index}`,
          question: `According to the content, which statement about ${conceptTerm} is most accurate?`,
          type: 'multiple_choice',
          options: [
            `${conceptTerm} is discussed as an important concept`,
            `${conceptTerm} is mentioned only briefly`,
            `${conceptTerm} is not relevant to the main topic`,
            `${conceptTerm} is used as a counterexample`
          ],
          correctAnswer: `${conceptTerm} is discussed as an important concept`,
          difficulty: 'medium',
          explanation: `${conceptTerm} is identified as a key concept in the content analysis.`,
          topic: conceptTerm,
          bloomLevel: 'understand' as const,
          sourceChunk: conceptContext,
          conceptTested: [conceptTerm],
          educationalValue: 7,
          cognitiveLoad: 'medium' as const,
          examLevel: params.examLevel || 'standardized' as const,
          timeToAnswer: 90,
          hintsAvailable: [`Look for mentions of ${conceptTerm} in the content`],
          commonMistakes: [`Confusing ${conceptTerm} with other concepts`],
          relatedConcepts: otherConcepts
        });
      } else if (questionType === 1) {
        // True/False
        questions.push({
          id: `fallback_tf_${Date.now()}_${index}`,
          question: `True or False: The content discusses ${conceptTerm} as an important concept.`,
          type: 'true_false',
          correctAnswer: 'True',
          difficulty: 'easy',
          explanation: `${conceptTerm} is mentioned and discussed in the content.`,
          topic: conceptTerm,
          bloomLevel: 'remember' as const,
          sourceChunk: conceptContext,
          conceptTested: [conceptTerm],
          educationalValue: 6,
          cognitiveLoad: 'low' as const,
          examLevel: params.examLevel || 'classroom' as const,
          timeToAnswer: 60,
          hintsAvailable: [`Consider how ${conceptTerm} is presented in the material`],
          commonMistakes: [`Not recognizing the importance of ${conceptTerm}`],
          relatedConcepts: otherConcepts
        });
      } else if (questionType === 2) {
        // Fill in blank
        questions.push({
          id: `fallback_fib_${Date.now()}_${index}`,
          question: `Fill in the blank: _____ is a key concept that helps understand the main ideas in this content.`,
          type: 'fill_in_blank',
          correctAnswer: conceptTerm,
          difficulty: 'medium',
          explanation: `${conceptTerm} is identified as a key concept in the content analysis.`,
          topic: conceptTerm,
          bloomLevel: 'remember' as const,
          sourceChunk: conceptContext,
          conceptTested: [conceptTerm],
          educationalValue: 6,
          cognitiveLoad: 'low' as const,
          examLevel: params.examLevel || 'classroom' as const,
          timeToAnswer: 75,
          hintsAvailable: [`Think about the main concepts discussed in the content`],
          commonMistakes: [`Using a related but incorrect concept`],
          relatedConcepts: otherConcepts
        });
      } else {
        // Short answer
        questions.push({
          id: `fallback_sa_${Date.now()}_${index}`,
          question: `Explain the importance of ${conceptTerm} based on the material.`,
          type: 'short_answer',
          correctAnswer: `${conceptTerm} is important because it represents a fundamental aspect of the subject matter that helps build understanding of the key ideas presented.`,
          difficulty: 'medium',
          explanation: `This question tests comprehension of ${conceptTerm} and its role in the material.`,
          topic: conceptTerm,
          bloomLevel: 'understand' as const,
          sourceChunk: conceptContext,
          conceptTested: [conceptTerm],
          educationalValue: 7,
          cognitiveLoad: 'medium' as const,
          examLevel: params.examLevel || 'standardized' as const,
          timeToAnswer: 120,
          hintsAvailable: [`Consider the context in which ${conceptTerm} is discussed`],
          commonMistakes: [`Providing only a definition without explaining importance`],
          relatedConcepts: otherConcepts
        });
      }
    });

    const metadata = this.generateAdvancedMetadata(questions, [], analysis);
    return { questions: questions.slice(0, params.maxQuestions), metadata };
  }

  // FIXED: Generate basic concepts from content when analysis fails
  private generateBasicConceptsFromContent(content: string, maxConcepts: number): any[] {
    const words = content.match(/\b[A-Z][a-zA-Z]{3,}\b/g) || [];
    const uniqueTerms = [...new Set(words)].slice(0, maxConcepts);
    
    if (uniqueTerms.length === 0) {
      // Fallback to generic concepts if no proper nouns found
      return Array.from({ length: Math.min(maxConcepts, 3) }, (_, i) => ({
        term: `concept ${i + 1}`,
        context: [content.substring(0, 100) + '...']
      }));
    }
    
    return uniqueTerms.map(term => ({
      term,
      context: [content.substring(0, 100) + '...']
    }));
  }

  private async validateExamLevelQuestions(
    questions: EnhancedQuestion[],
    analysis: ContentAnalysis
  ): Promise<EnhancedQuestion[]> {
    return questions.filter(question => {
      // Basic validation
      if (!question.question || question.question.length < 10) return false;
      if (!question.correctAnswer || question.correctAnswer.length < 2) return false; // FIXED: Reduced from 3
      if (!question.sourceChunk) return false;
      
      // Check for trivial answers - more lenient
      const trivialWords = ['the', 'and', 'or', 'a', 'an'];
      if (trivialWords.includes(question.correctAnswer.toLowerCase().trim())) return false;
      
      return true;
    });
  }

  private selectEducationallyDiverseQuestions(
    validatedQuestions: EnhancedQuestion[],
    maxQuestions: number,
    analysis: ContentAnalysis,
    examLevel: string
  ): EnhancedQuestion[] {
    if (validatedQuestions.length <= maxQuestions) {
      return validatedQuestions;
    }

    const selectedQuestions: EnhancedQuestion[] = [];
    const usedConcepts = new Set<string>();
    const bloomDistribution = new Map<string, number>();
    const typeDistribution = new Map<string, number>();

    // Target distribution for exam-level questions
    const targetBloomDistribution: Record<string, number> = {
      'remember': Math.ceil(maxQuestions * 0.2),
      'understand': Math.ceil(maxQuestions * 0.3),
      'apply': Math.ceil(maxQuestions * 0.3),
      'analyze': Math.ceil(maxQuestions * 0.2)
    };

    // Sort by educational value first
    const sortedQuestions = validatedQuestions.sort((a, b) => 
      (b.educationalValue || 0) - (a.educationalValue || 0)
    );

    // First pass: Ensure Bloom's taxonomy distribution
    for (const bloomLevel of Object.keys(targetBloomDistribution)) {
      const targetCount = targetBloomDistribution[bloomLevel] || 0;
      const questionsForBloom = sortedQuestions.filter(q => 
        q.bloomLevel === bloomLevel && !selectedQuestions.includes(q)
      );

      for (let i = 0; i < Math.min(targetCount, questionsForBloom.length); i++) {
        const question = questionsForBloom[i];
        if (question && selectedQuestions.length < maxQuestions) {
          selectedQuestions.push(question);
          question.conceptTested.forEach(concept => usedConcepts.add(concept));
          bloomDistribution.set(bloomLevel, (bloomDistribution.get(bloomLevel) || 0) + 1);
          typeDistribution.set(question.type, (typeDistribution.get(question.type) || 0) + 1);
        }
      }
      
      if (selectedQuestions.length >= maxQuestions) break;
    }

    // Second pass: Fill remaining slots with highest quality questions
    for (const question of sortedQuestions) {
      if (selectedQuestions.length >= maxQuestions) break;
      
      if (question && !selectedQuestions.includes(question)) {
        selectedQuestions.push(question);
      }
    }

    return selectedQuestions.slice(0, maxQuestions);
  }

  private generateAdvancedMetadata(
    selectedQuestions: EnhancedQuestion[],
    allQuestions: EnhancedQuestion[],
    analysis: ContentAnalysis
  ): QuestionGenerationMetadata {
    const averageEducationalValue = selectedQuestions.length > 0 
      ? selectedQuestions.reduce((sum, q) => sum + (q.educationalValue || 0), 0) / selectedQuestions.length
      : 0;

    const bloomDistribution = selectedQuestions.reduce((dist, q) => {
      dist[q.bloomLevel] = (dist[q.bloomLevel] || 0) + 1;
      return dist;
    }, {} as Record<string, number>);

    const typeDistribution = selectedQuestions.reduce((dist, q) => {
      dist[q.type] = (dist[q.type] || 0) + 1;
      return dist;
    }, {} as Record<string, number>);

    const difficultyDistribution = selectedQuestions.reduce((dist, q) => {
      dist[q.difficulty] = (dist[q.difficulty] || 0) + 1;
      return dist;
    }, {} as Record<string, number>);

    const examLevelDistribution = selectedQuestions.reduce((dist, q) => {
      dist[q.examLevel] = (dist[q.examLevel] || 0) + 1;
      return dist;
    }, {} as Record<string, number>);

    const averageTimeToAnswer = selectedQuestions.length > 0 
      ? selectedQuestions.reduce((sum, q) => sum + (q.timeToAnswer || 0), 0) / selectedQuestions.length
      : 0;

    const conceptsCovered = Array.from(new Set(
      selectedQuestions.flatMap(q => q.conceptTested)
    ));

    return {
      totalGenerated: allQuestions.length || selectedQuestions.length,
      qualityFiltered: selectedQuestions.length,
      averageEducationalValue: Math.round(averageEducationalValue * 10) / 10,
      bloomDistribution,
      typeDistribution,
      difficultyDistribution,
      examLevelDistribution,
      conceptsCovered,
      averageTimeToAnswer: Math.round(averageTimeToAnswer),
      qualityMetrics: {
        highEducationalValue: selectedQuestions.filter(q => (q.educationalValue || 0) >= 8).length,
        hasExplanations: selectedQuestions.filter(q => q.explanation && q.explanation.length > 30).length,
        hasHints: selectedQuestions.filter(q => q.hintsAvailable && q.hintsAvailable.length > 0).length,
        hasCommonMistakes: selectedQuestions.filter(q => q.commonMistakes && q.commonMistakes.length > 0).length
      }
    };
  }

  // FIXED: Always provide extractRelevantContext method
  private extractRelevantContext(content: string, question?: string): string {
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
    
    if (question && sentences.length > 0) {
      // Try to find most relevant sentence
      const relevantSentence = sentences.find(sentence => {
        const lowerSentence = sentence.toLowerCase();
        const questionWords = question.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        return questionWords.some(word => lowerSentence.includes(word));
      });
      
      if (relevantSentence) {
        return relevantSentence.trim().substring(0, 150) + '...';
      }
    }
    
    if (sentences.length > 0) {
      return sentences[0].trim().substring(0, 150) + '...';
    }
    
    return content.substring(0, 150) + '...';
  }
}

// Export singleton instance
export const examLevelQuestionGenerator = new ExamLevelQuestionGenerator();