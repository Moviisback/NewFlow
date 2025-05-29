// Debug utility to help identify question generation issues

export function debugQuestionData(question: any, context: string = '') {
    console.group(`🔍 Question Debug ${context}`);
    
    console.log('Raw question data:', question);
    
    // Check basic structure
    const checks = {
      hasId: !!question?.id,
      hasQuestion: !!question?.question,
      hasType: !!question?.type,
      hasCorrectAnswer: !!question?.correctAnswer,
      typeIsValid: ['multiple_choice', 'true_false', 'fill_in_blank', 'short_answer'].includes(question?.type),
      answerNotEmpty: question?.correctAnswer && question.correctAnswer.length > 0
    };
    
    console.log('Validation checks:', checks);
    
    // Type-specific validation
    if (question?.type === 'multiple_choice') {
      const mcChecks = {
        hasOptions: !!question?.options,
        optionsIsArray: Array.isArray(question?.options),
        optionsLength: question?.options?.length || 0,
        answerInOptions: question?.options?.includes(question?.correctAnswer)
      };
      console.log('Multiple choice specific checks:', mcChecks);
      
      if (mcChecks.optionsLength === 0) {
        console.error('❌ CRITICAL: Multiple choice question has no options!');
      }
      
      if (!mcChecks.answerInOptions) {
        console.error('❌ CRITICAL: Correct answer not found in options!');
      }
    }
    
    // Check for common issues
    const issues = [];
    
    if (!checks.hasQuestion) issues.push('Missing question text');
    if (!checks.hasType) issues.push('Missing question type');
    if (!checks.typeIsValid) issues.push(`Invalid question type: ${question?.type}`);
    if (!checks.hasCorrectAnswer) issues.push('Missing correct answer');
    if (question?.correctAnswer === 'the' || question?.correctAnswer === 'a' || question?.correctAnswer === 'an') {
      issues.push('Trivial answer detected (article word)');
    }
    
    if (issues.length > 0) {
      console.error('❌ Issues found:', issues);
    } else {
      console.log('✅ Question appears valid');
    }
    
    console.groupEnd();
    
    return {
      isValid: issues.length === 0,
      issues,
      checks
    };
  }
  
  // Generate fallback questions when API fails
  export function generateFallbackQuestions(content: string, count: number = 3): any[] {
    console.log('🔧 Generating fallback questions for content:', content.substring(0, 100) + '...');
    
    const fallbackQuestions = [];
    
    // Extract some meaningful terms from content
    const words = content.match(/\b[A-Za-z]{4,}\b/g) || [];
    const meaningfulWords = words.filter(word => 
      !['that', 'this', 'with', 'from', 'they', 'were', 'been', 'have', 'will', 'would', 'could', 'should'].includes(word.toLowerCase())
    );
    
    const uniqueWords = [...new Set(meaningfulWords)].slice(0, 5);
    
    if (uniqueWords.length > 0) {
      // True/False question
      fallbackQuestions.push({
        id: `fallback_tf_${Date.now()}`,
        question: `True or False: The content discusses concepts related to ${uniqueWords[0]}.`,
        type: 'true_false',
        correctAnswer: 'True',
        difficulty: 'easy',
        topic: uniqueWords[0],
        explanation: `The term "${uniqueWords[0]}" appears in the content and is relevant to the topic.`,
        sourceChunk: content.substring(0, 150) + '...'
      });
      
      // Multiple choice question
      if (uniqueWords.length >= 2) {
        fallbackQuestions.push({
          id: `fallback_mc_${Date.now()}`,
          question: `Which of the following concepts is discussed in the content?`,
          type: 'multiple_choice',
          options: [
            uniqueWords[0],
            uniqueWords[1] || 'Alternative concept',
            'Unrelated concept A',
            'Unrelated concept B'
          ],
          correctAnswer: uniqueWords[0],
          difficulty: 'easy',
          topic: 'Content Recognition',
          explanation: `${uniqueWords[0]} is specifically mentioned and discussed in the content.`,
          sourceChunk: content.substring(0, 150) + '...'
        });
      }
      
      // Fill in the blank
      if (count > 2) {
        fallbackQuestions.push({
          id: `fallback_fib_${Date.now()}`,
          question: `Fill in the blank: The content provides information about _____.`,
          type: 'fill_in_blank',
          correctAnswer: uniqueWords[0],
          difficulty: 'medium',
          topic: uniqueWords[0],
          explanation: `The content focuses on providing information about ${uniqueWords[0]}.`,
          sourceChunk: content.substring(0, 150) + '...'
        });
      }
    } else {
      // Very basic fallback when no good words found
      fallbackQuestions.push({
        id: `fallback_basic_${Date.now()}`,
        question: `True or False: This content contains educational information.`,
        type: 'true_false',
        correctAnswer: 'True',
        difficulty: 'easy',
        topic: 'General',
        explanation: 'The content provides educational information on the topic.',
        sourceChunk: content.substring(0, 150) + '...'
      });
    }
    
    // Validate each fallback question
    fallbackQuestions.forEach((q, index) => {
      const result = debugQuestionData(q, `Fallback ${index + 1}`);
      if (!result.isValid) {
        console.error(`❌ Fallback question ${index + 1} is invalid:`, result.issues);
      }
    });
    
    return fallbackQuestions.slice(0, count);
  }
  
  // Hook to validate questions in components
  export function useQuestionValidation() {
    const validateQuestion = (question: any) => {
      return debugQuestionData(question, 'Component Validation');
    };
    
    const validateQuestionArray = (questions: any[]) => {
      console.group('🔍 Validating Question Array');
      console.log('Total questions:', questions.length);
      
      const results = questions.map((q, index) => 
        debugQuestionData(q, `Question ${index + 1}`)
      );
      
      const validQuestions = results.filter(r => r.isValid).length;
      const invalidQuestions = results.length - validQuestions;
      
      console.log(`✅ Valid questions: ${validQuestions}`);
      if (invalidQuestions > 0) {
        console.error(`❌ Invalid questions: ${invalidQuestions}`);
      }
      
      console.groupEnd();
      
      return {
        totalQuestions: questions.length,
        validQuestions,
        invalidQuestions,
        results
      };
    };
    
    return {
      validateQuestion,
      validateQuestionArray,
      generateFallback: generateFallbackQuestions
    };
  }