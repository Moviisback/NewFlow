import { Question, UserAnswer, LearningProgress } from '@/types/quizTypes';

// Get time interval for next review based on review count
export const getNextReviewInterval = (reviewCount: number, wasCorrect: boolean): number => {
  if (!wasCorrect) return 1; // If incorrect, review in the next chunk
  
  // Base intervals in number of chunks until review (simplified Leitner system)
  const intervals = [1, 2, 4, 7, 14, 30];
  
  // Get the appropriate interval based on review count, cap at the max interval
  const intervalIndex = Math.min(reviewCount, intervals.length - 1);
  return intervals[intervalIndex];
};

// Schedule a question for review
export const scheduleForReview = (
  questionId: string,
  isCorrect: boolean,
  progress: LearningProgress
): LearningProgress => {
  const now = new Date();
  
  // Find if the question is already in the review list
  const existingReviewIndex = progress.reviewQuestions.findIndex(q => q.questionId === questionId);
  
  if (existingReviewIndex >= 0) {
    // Question exists in review list, update it
    const reviewItem = progress.reviewQuestions[existingReviewIndex];
    const newReviewCount = isCorrect ? reviewItem.reviewCount + 1 : Math.max(0, reviewItem.reviewCount - 1);
    
    // If the question has been answered correctly 3 times in a row, mark as mastered
    if (isCorrect && newReviewCount >= 3) {
      // Remove from review list and add to mastered questions
      progress.reviewQuestions.splice(existingReviewIndex, 1);
      if (!progress.masteredQuestions.includes(questionId)) {
        progress.masteredQuestions.push(questionId);
      }
    } else {
      // Update the review information
      const interval = getNextReviewInterval(newReviewCount, isCorrect);
      const nextReview = new Date();
      nextReview.setMinutes(nextReview.getMinutes() + interval); // Using minutes for demo, but could be days
      
      progress.reviewQuestions[existingReviewIndex] = {
        questionId,
        nextReviewDate: nextReview,
        reviewCount: newReviewCount,
        lastCorrect: isCorrect
      };
    }
  } else if (!isCorrect && !progress.masteredQuestions.includes(questionId)) {
    // New incorrect question, add to review list
    const nextReview = new Date();
    nextReview.setMinutes(nextReview.getMinutes() + 1); // Review in the next chunk
    
    progress.reviewQuestions.push({
      questionId,
      nextReviewDate: nextReview,
      reviewCount: 0,
      lastCorrect: false
    });
  } else if (isCorrect && !progress.masteredQuestions.includes(questionId)) {
    // New correct question, add to review with longer interval
    const nextReview = new Date();
    nextReview.setMinutes(nextReview.getMinutes() + 3); // Review after a few chunks
    
    progress.reviewQuestions.push({
      questionId,
      nextReviewDate: nextReview,
      reviewCount: 1,
      lastCorrect: true
    });
  }
  
  return progress;
};

// Get questions due for review
export const getQuestionsForReview = (
  progress: LearningProgress,
  currentChunkIndex: number,
  availableQuestions: Question[],
  maxReviewQuestions: number = 2
): string[] => {
  const now = new Date();
  
  // Find questions due for review
  const dueQuestions = progress.reviewQuestions
    .filter(q => q.nextReviewDate <= now)
    .sort((a, b) => a.nextReviewDate.getTime() - b.nextReviewDate.getTime());
  
  // Get the IDs of questions that are available in the current set
  const availableQuestionIds = availableQuestions.map(q => q.id);
  
  // Filter due questions to only include those in the available questions set
  const reviewQuestionIds = dueQuestions
    .filter(q => availableQuestionIds.includes(q.questionId))
    .map(q => q.questionId)
    .slice(0, maxReviewQuestions);
  
  // Also add some interleaving with mastered questions (1 in 10 chunks)
  if (currentChunkIndex % 10 === 0 && progress.masteredQuestions.length > 0) {
    // Pick a random mastered question
    const randomIndex = Math.floor(Math.random() * progress.masteredQuestions.length);
    const masteredQuestionId = progress.masteredQuestions[randomIndex];
    
    // Add it if it's in the available questions and not already in the review list
    if (availableQuestionIds.includes(masteredQuestionId) && !reviewQuestionIds.includes(masteredQuestionId)) {
      reviewQuestionIds.push(masteredQuestionId);
    }
  }
  
  return reviewQuestionIds;
};

// Update weak areas based on quiz performance
export const updateWeakAreas = (
  progress: LearningProgress,
  chunkIndex: number,
  topic: string,
  correctCount: number,
  totalQuestions: number
): LearningProgress => {
  const correctRate = totalQuestions > 0 ? correctCount / totalQuestions : 0;
  
  // If correct rate is below 70%, consider it a weak area
  if (correctRate < 0.7 && totalQuestions >= 2) {
    // Check if this chunk/topic is already in weak areas
    const existingWeakAreaIndex = progress.weakAreas.findIndex(
      area => area.chunkIndex === chunkIndex && area.topic === topic
    );
    
    if (existingWeakAreaIndex >= 0) {
      // Update the correct rate
      progress.weakAreas[existingWeakAreaIndex].correctRate = correctRate;
    } else {
      // Add as a new weak area
      progress.weakAreas.push({
        chunkIndex,
        topic,
        correctRate
      });
    }
  } else {
    // If performance is good, remove from weak areas if it exists
    progress.weakAreas = progress.weakAreas.filter(
      area => !(area.chunkIndex === chunkIndex && area.topic === topic)
    );
    
    // Add to mastered chunks if not already there
    if (!progress.masteredChunks.includes(chunkIndex)) {
      progress.masteredChunks.push(chunkIndex);
    }
  }
  
  return progress;
};

// New function to analyze question performance for adaptive learning
export const analyzePerformance = (
  answers: UserAnswer[],
  questions: Question[]
): { 
  weakConcepts: string[], 
  masteredConcepts: string[],
  correctRate: number,
  averageConfidence: number,
  averageTime: number
} => {
  // Map questions by ID for easy lookup
  const questionsMap = new Map(questions.map(q => [q.id, q]));
  
  // Count correct/incorrect by concept/topic
  const conceptStats: Record<string, { correct: number, total: number }> = {};
  
  // Track confidence levels and time spent
  let totalConfidenceValue = 0;
  let totalConfidenceCount = 0;
  let totalTimeSpent = 0;
  
  // Process all answers
  answers.forEach(answer => {
    const question = questionsMap.get(answer.questionId);
    if (!question || !question.topic) return;
    
    // Initialize if needed
    if (!conceptStats[question.topic]) {
      conceptStats[question.topic] = { correct: 0, total: 0 };
    }
    
    // Update stats
    conceptStats[question.topic].total += 1;
    if (answer.isCorrect) {
      conceptStats[question.topic].correct += 1;
    }
    
    // Track confidence levels (low=1, medium=2, high=3)
    if (answer.confidence) {
      let confidenceValue = 2; // Default medium
      if (answer.confidence === 'low') confidenceValue = 1;
      if (answer.confidence === 'high') confidenceValue = 3;
      
      totalConfidenceValue += confidenceValue;
      totalConfidenceCount++;
    }
    
    // Track time spent
    if (answer.timeSpent) {
      totalTimeSpent += answer.timeSpent;
    }
  });
  
  // Calculate stats
  const weakConcepts: string[] = [];
  const masteredConcepts: string[] = [];
  
  Object.entries(conceptStats).forEach(([concept, stats]) => {
    const correctRate = stats.total > 0 ? stats.correct / stats.total : 0;
    
    if (correctRate < 0.7 && stats.total >= 2) {
      // Less than 70% correct and at least 2 questions attempted
      weakConcepts.push(concept);
    } else if (correctRate >= 0.85 && stats.total >= 3) {
      // At least 85% correct and at least 3 questions attempted
      masteredConcepts.push(concept);
    }
  });
  
  // Calculate overall correct rate
  const totalCorrect = Object.values(conceptStats).reduce((sum, stat) => sum + stat.correct, 0);
  const totalQuestions = Object.values(conceptStats).reduce((sum, stat) => sum + stat.total, 0);
  const correctRate = totalQuestions > 0 ? totalCorrect / totalQuestions : 0;
  
  // Calculate average confidence
  const averageConfidence = totalConfidenceCount > 0 ? totalConfidenceValue / totalConfidenceCount : 2;
  
  // Calculate average time
  const averageTime = answers.length > 0 ? totalTimeSpent / answers.length : 0;
  
  return {
    weakConcepts,
    masteredConcepts,
    correctRate,
    averageConfidence,
    averageTime
  };
};