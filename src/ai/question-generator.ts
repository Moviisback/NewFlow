import axios from 'axios';
import { analyzeContentForLearning, ContentAnalysis } from '@/utils/content-analysis';

// Configure Gemini API
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export interface Question {
  id: string;
  question: string;
  options?: string[];
  correctAnswer: string;
  type: 'multiple_choice' | 'true_false' | 'fill_in_blank' | 'short_answer';
  difficulty: string;
  explanation?: string;
  sourcePage?: number;
  sourceChunk?: string;
  chunkIndex?: number;
  topic?: string;
  bloomLevel?: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
  educationalValue?: number; // 1-10 scale
  conceptTested?: string[];
  cognitiveLoad?: 'low' | 'medium' | 'high';
}

export interface QuestionValidation {
  isValid: boolean;
  educationalValue: number;
  issues: string[];
  suggestions: string[];
  qualityScore: number;
}

export interface QuestionGenerationResult {
  questions: Question[];
  metadata: {
    totalGenerated: number;
    qualityFiltered: number;
    averageQuality: number;
    conceptsCovered: string[];
    difficultyDistribution: Record<string, number>;
  };
}

export class EnhancedQuestionGenerator {
  
  async generateComprehensiveQuestions(
    chunkContent: string, 
    params: {
      documentTitle?: string;
      maxQuestions: number;
      questionTypes: string[];
      difficultyLevel: number;
      previousAnswered?: string[];
    }
  ): Promise<QuestionGenerationResult> {
    
    console.log('🎯 Starting comprehensive question generation...');
    
    // Analyze content with enhanced techniques
    const contentAnalysis = analyzeContentForLearning(chunkContent);
    
    // Validate content suitability
    const contentValidation = this.validateContentForQuestions(contentAnalysis, chunkContent);
    if (!contentValidation.suitable) {
      throw new Error(`Content not suitable for question generation: ${contentValidation.reason}`);
    }
    
    console.log('📊 Content analysis results:', {
      concepts: contentAnalysis.keyConcepts.length,
      mainConcepts: contentAnalysis.keyConcepts.filter(c => c.isMainConcept).length,
      educationalValue: contentAnalysis.educationalValue,
      difficulty: contentAnalysis.difficultyLevel
    });
    
    // Generate questions using multiple strategies
    const allQuestions: Question[] = [];
    
    try {
      // Strategy 1: AI-generated questions with enhanced prompt
      const aiQuestions = await this.generateAIQuestions(chunkContent, contentAnalysis, params);
      allQuestions.push(...aiQuestions);
      console.log(`🤖 Generated ${aiQuestions.length} AI questions`);
    } catch (error) {
      console.warn('AI question generation failed:', error);
    }
    
    // Strategy 2: Template-based questions for reliability
    const templateQuestions = this.generateTemplateQuestions(contentAnalysis, chunkContent, params);
    allQuestions.push(...templateQuestions);
    console.log(`📝 Generated ${templateQuestions.length} template questions`);
    
    // Strategy 3: Concept-based questions for coverage
    const conceptQuestions = this.generateConceptBasedQuestions(contentAnalysis, chunkContent, params);
    allQuestions.push(...conceptQuestions);
    console.log(`🧠 Generated ${conceptQuestions.length} concept questions`);
    
    // Validate and filter questions with RELAXED validation
    const validatedQuestions = await this.validateAndRankQuestions(allQuestions, contentAnalysis, chunkContent);
    
    // Select best questions with diversity
    const selectedQuestions = this.selectDiverseQuestions(validatedQuestions, params.maxQuestions, contentAnalysis);
    
    // Generate metadata
    const metadata = this.generateMetadata(selectedQuestions, allQuestions, contentAnalysis);
    
    console.log('✅ Question generation complete:', {
      totalGenerated: allQuestions.length,
      afterValidation: validatedQuestions.length,
      finalSelected: selectedQuestions.length,
      averageQuality: metadata.averageQuality
    });
    
    return {
      questions: selectedQuestions,
      metadata
    };
  }
  
  private validateContentForQuestions(analysis: ContentAnalysis, content: string): {suitable: boolean, reason?: string} {
    // Check minimum content length
    if (content.length < 100) {
      return { suitable: false, reason: 'Content too short (minimum 100 characters)' };
    }
    
    // Check for educational concepts
    if (analysis.keyConcepts.length === 0) {
      return { suitable: false, reason: 'No identifiable educational concepts found' };
    }
    
    // Relaxed educational value check (was 3, now 2)
    if (analysis.educationalValue < 2) {
      return { suitable: false, reason: 'Content has very low educational value for question generation' };
    }
    
    // Check for meaningful concepts (relaxed threshold)
    const meaningfulConcepts = analysis.keyConcepts.filter(c => 
      c.term.length > 2 && c.importance > 2 // Reduced from 3 to 2
    );
    
    if (meaningfulConcepts.length === 0) {
      return { suitable: false, reason: 'No meaningful concepts found for question generation' };
    }
    
    return { suitable: true };
  }
  
  private async generateAIQuestions(
    content: string,
    analysis: ContentAnalysis,
    params: any
  ): Promise<Question[]> {
    
    const mainConcepts = analysis.keyConcepts.filter(c => c.isMainConcept).slice(0, 5);
    const conceptNames = mainConcepts.map(c => c.term).join(', ');
    
    const prompt = `
# EDUCATIONAL QUESTION GENERATION

Create ${Math.min(6, params.maxQuestions)} educational questions from this content.

## CONTENT:
${content}

## KEY CONCEPTS TO TEST: ${conceptNames}

## REQUIREMENTS:
1. Questions must test understanding of: ${conceptNames}
2. Answers should be concepts, terms, or ideas from the content
3. Focus on "why" and "how", not just "what"
4. Make questions educational and meaningful

## QUESTION TYPES:
- Multiple choice: Test conceptual understanding
- True/False: Test relationships between concepts  
- Fill in blank: Test key terms (not common words like "the", "and")
- Short answer: Test explanations and applications

## OUTPUT FORMAT (JSON):
[
  {
    "id": "q1",
    "question": "Question text here",
    "type": "multiple_choice|true_false|fill_in_blank|short_answer",
    "options": ["A", "B", "C", "D"], // only for multiple_choice
    "correctAnswer": "Correct answer from content",
    "difficulty": "easy|medium|hard",
    "explanation": "Why this answer is correct",
    "topic": "Main concept tested",
    "sourceChunk": "Quote from content supporting answer"
  }
]

Generate questions now:`;

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
          timeout: 25000
        }
      );
      
      const content_response = response.data.candidates[0]?.content?.parts[0]?.text || '';
      
      // Extract JSON from response
      const jsonMatch = content_response.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (!jsonMatch) {
        console.warn('No valid JSON found in AI response');
        return [];
      }
      
      const questionsData = JSON.parse(jsonMatch[0]);
      
      // Process and format questions
      return questionsData.map((q: any, index: number) => ({
        id: `ai_${Date.now()}_${index}`,
        question: q.question,
        options: q.type === 'multiple_choice' ? q.options : undefined,
        correctAnswer: String(q.correctAnswer),
        type: q.type,
        difficulty: q.difficulty || 'medium',
        explanation: q.explanation,
        topic: q.topic || 'General',
        bloomLevel: 'understand',
        sourceChunk: q.sourceChunk || this.extractRelevantContext(content, q.question, q.correctAnswer),
        conceptTested: [q.topic || 'General'],
        educationalValue: 8,
        cognitiveLoad: 'medium'
      }));
      
    } catch (error) {
      console.error('AI question generation failed:', error);
      return [];
    }
  }
  
  private generateTemplateQuestions(
    analysis: ContentAnalysis,
    content: string,
    params: any
  ): Question[] {
    const questions: Question[] = [];
    const mainConcepts = analysis.keyConcepts.filter(c => c.isMainConcept).slice(0, 4);
    
    // Template 1: Definition/Understanding questions
    mainConcepts.slice(0, 2).forEach((concept, index) => {
      questions.push({
        id: `template_def_${Date.now()}_${index}`,
        question: `What is the significance of ${concept.term} in this context?`,
        type: 'multiple_choice',
        options: [
          `${concept.term} is an important concept discussed in the content`,
          `${concept.term} is barely mentioned`,
          `${concept.term} is not relevant to the topic`,
          `${concept.term} is used as a counterexample`
        ],
        correctAnswer: `${concept.term} is an important concept discussed in the content`,
        difficulty: 'medium',
        explanation: `${concept.term} is identified as a key concept with high importance in the content.`,
        topic: concept.term,
        bloomLevel: 'understand',
        sourceChunk: concept.context[0] || content.substring(0, 100),
        conceptTested: [concept.term],
        educationalValue: 7,
        cognitiveLoad: 'medium'
      });
    });
    
    // Template 2: True/False about main concepts
    mainConcepts.slice(0, 2).forEach((concept, index) => {
      questions.push({
        id: `template_tf_${Date.now()}_${index}`,
        question: `True or False: ${concept.term} is essential for understanding the main topic discussed.`,
        type: 'true_false',
        correctAnswer: 'True',
        difficulty: 'easy',
        explanation: `${concept.term} is a main concept that helps explain the core ideas.`,
        topic: concept.term,
        bloomLevel: 'understand',
        sourceChunk: concept.context[0] || content.substring(0, 100),
        conceptTested: [concept.term],
        educationalValue: 7,
        cognitiveLoad: 'low'
      });
    });
    
    return questions;
  }
  
  private generateConceptBasedQuestions(
    analysis: ContentAnalysis,
    content: string,
    params: any
  ): Question[] {
    const questions: Question[] = [];
    const mainConcepts = analysis.keyConcepts.filter(c => c.isMainConcept).slice(0, 3);
    
    // Generate one question per main concept
    mainConcepts.forEach((concept, index) => {
      questions.push({
        id: `concept_${Date.now()}_${index}`,
        question: `Fill in the blank: _____ is a key concept that helps explain the main ideas in this content.`,
        type: 'fill_in_blank',
        correctAnswer: concept.term,
        difficulty: 'medium',
        explanation: `${concept.term} is identified as a key concept in the content analysis.`,
        topic: concept.term,
        bloomLevel: 'remember',
        sourceChunk: concept.context[0] || content.substring(0, 100),
        conceptTested: [concept.term],
        educationalValue: 6,
        cognitiveLoad: 'low'
      });
    });
    
    return questions;
  }
  
  private async validateAndRankQuestions(
    questions: Question[],
    analysis: ContentAnalysis,
    content: string
  ): Promise<Question[]> {
    const validatedQuestions: Question[] = [];
    
    for (const question of questions) {
      const validation = this.validateQuestionQuality(question, analysis, content);
      
      // RELAXED validation threshold (was 6, now 5)
      if (validation.isValid && validation.educationalValue >= 5) {
        question.educationalValue = validation.educationalValue;
        validatedQuestions.push(question);
      } else {
        console.log(`❌ Question filtered out: ${validation.issues.join(', ')}`);
      }
    }
    
    // Sort by educational value
    return validatedQuestions.sort((a, b) => {
      const scoreA = (a.educationalValue || 0);
      const scoreB = (b.educationalValue || 0);
      return scoreB - scoreA;
    });
  }
  
  private validateQuestionQuality(
    question: Question,
    analysis: ContentAnalysis,
    content: string
  ): QuestionValidation {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let educationalValue = 8; // Start with good score
    
    // Check question text quality
    if (!question.question || question.question.length < 10) {
      issues.push('Question text too short');
      educationalValue -= 3;
    }
    
    // Check for trivial answers (CRITICAL)
    const trivialWords = ['the', 'and', 'or', 'a', 'an', 'is', 'are', 'was', 'were', 'to', 'in', 'on', 'at', 'for', 'with', 'by'];
    if (trivialWords.includes(question.correctAnswer?.toLowerCase())) {
      issues.push('Answer is a trivial word');
      educationalValue -= 6; // Major penalty
    }
    
    // Check answer length
    if (question.correctAnswer && question.correctAnswer.length < 2) {
      issues.push('Answer too short');
      educationalValue -= 2;
    }
    
    // RELAXED content relevance check
    const mainConcepts = analysis.keyConcepts.filter(c => c.isMainConcept).map(c => c.term.toLowerCase());
    const allConcepts = analysis.keyConcepts.map(c => c.term.toLowerCase());
    
    // Check if question relates to ANY concept (not just main ones)
    const questionRelatesToConcepts = allConcepts.some(concept => 
      question.question.toLowerCase().includes(concept) ||
      question.correctAnswer?.toLowerCase().includes(concept) ||
      concept.includes(question.correctAnswer?.toLowerCase() || '') ||
      this.fuzzyMatch(question.correctAnswer?.toLowerCase() || '', concept)
    );
    
    if (!questionRelatesToConcepts) {
      issues.push('Question does not relate to identified concepts');
      educationalValue -= 2; // Reduced penalty
    }
    
    // MUCH MORE RELAXED content matching
    const answerText = question.correctAnswer?.toLowerCase() || '';
    const contentLower = content.toLowerCase();
    
    // Multiple ways to check if answer is content-related
    const contentRelated = answerText.length <= 3 || // Short answers get a pass
                          contentLower.includes(answerText) ||
                          this.partialMatch(answerText, contentLower) ||
                          this.conceptualMatch(answerText, allConcepts) ||
                          question.type === 'true_false' || // T/F questions get a pass
                          question.correctAnswer === 'True' ||
                          question.correctAnswer === 'False';
    
    if (!contentRelated) {
      issues.push('Answer not clearly related to content');
      educationalValue -= 1; // Much reduced penalty
    }
    
    // Multiple choice quality check
    if (question.type === 'multiple_choice' && question.options) {
      if (question.options.length < 3) {
        issues.push('Too few options');
        educationalValue -= 1;
      }
    }
    
    // Bonus points for good features
    if (question.explanation && question.explanation.length > 20) {
      educationalValue += 1;
    }
    
    if (question.bloomLevel && ['apply', 'analyze', 'evaluate'].includes(question.bloomLevel)) {
      educationalValue += 1;
    }
    
    // Ensure score is within bounds
    educationalValue = Math.max(0, Math.min(10, educationalValue));
    
    return {
      isValid: educationalValue >= 5 && issues.length <= 2, // More lenient
      educationalValue,
      issues,
      suggestions,
      qualityScore: educationalValue
    };
  }
  
  // Helper method for fuzzy matching
  private fuzzyMatch(str1: string, str2: string): boolean {
    if (!str1 || !str2) return false;
    
    // Check if one string contains most characters of another
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (shorter.length < 3) return false;
    
    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter[i])) {
        matches++;
      }
    }
    
    return matches / shorter.length > 0.6;
  }
  
  // Helper method for partial matching
  private partialMatch(answer: string, content: string): boolean {
    if (!answer || answer.length < 3) return false;
    
    // Check if answer words appear in content
    const answerWords = answer.split(/\s+/).filter(w => w.length > 2);
    const foundWords = answerWords.filter(word => content.includes(word));
    
    return foundWords.length / answerWords.length > 0.5;
  }
  
  // Helper method for conceptual matching
  private conceptualMatch(answer: string, concepts: string[]): boolean {
    return concepts.some(concept => 
      concept.includes(answer) || 
      answer.includes(concept) ||
      this.fuzzyMatch(answer, concept)
    );
  }
  
  private selectDiverseQuestions(
    validatedQuestions: Question[],
    maxQuestions: number,
    analysis: ContentAnalysis
  ): Question[] {
    // If we don't have enough questions, return all valid ones
    if (validatedQuestions.length <= maxQuestions) {
      return validatedQuestions;
    }
    
    const selectedQuestions: Question[] = [];
    const usedConcepts = new Set<string>();
    const typeDistribution = new Map<string, number>();
    
    // First pass: Select diverse questions
    for (const question of validatedQuestions) {
      if (selectedQuestions.length >= maxQuestions) break;
      
      const questionConcepts = question.conceptTested || [question.topic || ''];
      const hasNewConcept = questionConcepts.some(concept => !usedConcepts.has(concept));
      
      if (hasNewConcept || usedConcepts.size < 2) {
        selectedQuestions.push(question);
        questionConcepts.forEach(concept => usedConcepts.add(concept));
        typeDistribution.set(question.type, (typeDistribution.get(question.type) || 0) + 1);
      }
    }
    
    // Second pass: Fill remaining slots with best available
    for (const question of validatedQuestions) {
      if (selectedQuestions.length >= maxQuestions) break;
      
      if (!selectedQuestions.includes(question)) {
        selectedQuestions.push(question);
      }
    }
    
    return selectedQuestions.slice(0, maxQuestions);
  }
  
  private generateMetadata(
    selectedQuestions: Question[],
    allQuestions: Question[],
    analysis: ContentAnalysis
  ) {
    const totalGenerated = allQuestions.length;
    const qualityFiltered = selectedQuestions.length;
    const averageQuality = selectedQuestions.length > 0 
      ? selectedQuestions.reduce((sum, q) => sum + (q.educationalValue || 0), 0) / selectedQuestions.length
      : 0;
    
    const conceptsCovered = Array.from(new Set(
      selectedQuestions.flatMap(q => q.conceptTested || [q.topic || ''])
    )).filter(Boolean);
    
    const difficultyDistribution = selectedQuestions.reduce((dist, q) => {
      dist[q.difficulty] = (dist[q.difficulty] || 0) + 1;
      return dist;
    }, {} as Record<string, number>);
    
    return {
      totalGenerated,
      qualityFiltered,
      averageQuality: Math.round(averageQuality * 10) / 10,
      conceptsCovered,
      difficultyDistribution
    };
  }
  
  private extractRelevantContext(content: string, question: string, answer: string): string {
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
    
    // Find sentences containing the answer or question keywords
    const relevantSentences = sentences.filter(sentence => {
      const lowerSentence = sentence.toLowerCase();
      const lowerAnswer = answer.toLowerCase();
      const questionWords = question.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      
      return lowerSentence.includes(lowerAnswer) ||
             questionWords.some(word => lowerSentence.includes(word));
    });
    
    if (relevantSentences.length > 0) {
      return relevantSentences[0].trim().substring(0, 150) + '...';
    }
    
    return content.substring(0, 150) + '...';
  }
  
  // Generate learning objectives
  async generateLearningObjectives(content: string, keyConcepts: string[]): Promise<string[]> {
    const analysis = analyzeContentForLearning(content);
    return analysis.learningObjectives;
  }
}

// Export singleton instance
export const questionGenerator = new EnhancedQuestionGenerator();