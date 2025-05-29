'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Lightbulb, BookOpen, Clock, Loader2, AlertCircle, CheckCircle2, Info, Star, ThumbsUp, ThumbsDown, RotateCcw, Bookmark } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

// Import the original Question type and rename it to allow local extension
import { Question as OriginalQuestion } from '@/types/quizTypes';

// Locally extend the Question type
type Question = OriginalQuestion & {
  bloomLevel?: string;
  educationalValue?: number;
};

interface AIValidationResult {
  isCorrect: boolean;
  score: number; // 0-100
  feedback: string;
  keyPointsCovered: string[];
  missedPoints: string[];
  suggestions: string[];
}

interface QuestionDisplayProps {
  question: Question;
  selectedAnswer: string | null;
  showFeedback: boolean;
  isBlindMode?: boolean;
  onSelectAnswer: (answer: string) => void;
  onRequestHint?: () => void;
  onCheckAnswer?: () => void;
  onNextQuestion?: () => void;
  onReviewSource?: (sourceText: string) => void;
  confidenceLevels?: {
    value: string;
    label: string;
    color: string;
  }[];
  selectedConfidence?: string | null;
  onSelectConfidence?: (level: string) => void;
  hintRequested?: boolean;
  isLastQuestion?: boolean;
  timeRemaining?: number;
  totalTime?: number;
  // New props for placeholder features
  onTryAgain?: () => void;
  onMarkForReview?: () => void;
  onFeedbackHelpful?: (isHelpful: boolean) => void;
}

const QuestionDisplay: React.FC<QuestionDisplayProps> = ({
  question,
  selectedAnswer,
  showFeedback,
  isBlindMode = false,
  onSelectAnswer,
  onRequestHint,
  onCheckAnswer,
  onNextQuestion,
  onReviewSource,
  confidenceLevels,
  selectedConfidence,
  onSelectConfidence,
  hintRequested = false,
  isLastQuestion = false,
  timeRemaining,
  totalTime,
  onTryAgain,
  onMarkForReview,
  onFeedbackHelpful,
}) => {
  const [isAnswerChanging, setIsAnswerChanging] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isValidatingAnswer, setIsValidatingAnswer] = useState(false);
  const [aiValidationResult, setAiValidationResult] = useState<AIValidationResult | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);
  const [feedbackHelpfulness, setFeedbackHelpfulness] = useState<boolean | null>(null);

  const isCorrectAnswer = question.type === 'short_answer'
    ? aiValidationResult?.isCorrect || false
    : selectedAnswer === question.correctAnswer;

  const validateShortAnswer = useCallback(async (userAnswer: string): Promise<AIValidationResult> => {
    if (!userAnswer || userAnswer.trim().length < 10) {
      return {
        isCorrect: false,
        score: 0,
        feedback: "Answer is too short. Please provide a more detailed response.",
        keyPointsCovered: [],
        missedPoints: ["Insufficient detail in response"],
        suggestions: ["Expand your answer with more specific details.", "Include examples if relevant."]
      };
    }
    setIsValidatingAnswer(true);
    // Simulate API call
    // In a real app, this would be:
    // const response = await fetch('/api/validate-answer', { /* ... */ });
    // const result = await response.json();
    // setIsValidatingAnswer(false);
    // return result;
    return new Promise(resolve => {
        setTimeout(() => {
            setIsValidatingAnswer(false);
            const mockScore = Math.floor(Math.random() * 70) + 30; // Score between 30 and 100
            const mockIsCorrect = mockScore > 70;
            resolve({
                isCorrect: mockIsCorrect,
                score: mockScore,
                feedback: mockIsCorrect ? "Excellent understanding demonstrated!" : "There are a few areas to review for a more complete answer.",
                keyPointsCovered: mockIsCorrect ? ["Core concept A", "Application of B"] : ["Basic idea of A"],
                missedPoints: mockIsCorrect ? [] : ["Nuance of C", "Implication of D"],
                suggestions: mockIsCorrect ? ["Consider edge cases."] : ["Review the definition of C.", "Think about how D affects the outcome."]
            });
        }, 1500);
    });
  }, [question]);

  const fallbackValidation = (userAnswer: string, correctAnswer: string): AIValidationResult => {
    const userWords = userAnswer.toLowerCase().split(/\s+/);
    const correctWords = correctAnswer.toLowerCase().split(/\s+/);
    const keyWords = correctWords.filter(word => word.length > 3);
    const matchedWords = keyWords.filter(word => userWords.some(userWord => userWord.includes(word) || word.includes(userWord)));
    const score = keyWords.length > 0 ? Math.round((matchedWords.length / keyWords.length) * 100) : 0;
    const isCorrect = score >= 70;
    return {
      isCorrect,
      score,
      feedback: isCorrect ? "Good answer! You've covered the main points." : "Your answer covers some points but is missing key information.",
      keyPointsCovered: matchedWords,
      missedPoints: keyWords.filter(word => !matchedWords.includes(word)),
      suggestions: !isCorrect ? ["Include more specific details.", "Review the key concepts.", "Consider the context provided."] : []
    };
  };

  const handleAnswerSelection = useCallback((answer: string) => {
    if (showFeedback) return;
    setIsAnswerChanging(true);
    setHasInteracted(true);
    if (question.type === 'short_answer') {
      const words = answer.trim().split(/\s+/).filter(Boolean);
      setWordCount(words.length);
      setCharacterCount(answer.length);
    }
    setTimeout(() => {
      onSelectAnswer(answer);
      setIsAnswerChanging(false);
    }, 50);
  }, [showFeedback, onSelectAnswer, question.type]);

  const handleConfidenceSelection = useCallback((level: string) => {
    if (showFeedback) return;
    onSelectConfidence?.(level);
  }, [showFeedback, onSelectConfidence]);

  const handleTextInputChange = useCallback((value: string) => {
    if (showFeedback) return;
    setHasInteracted(true);
    const words = value.trim().split(/\s+/).filter(Boolean);
    setWordCount(words.length);
    setCharacterCount(value.length);
    onSelectAnswer(value);
  }, [showFeedback, onSelectAnswer]);

  const handleCheckAnswer = useCallback(async () => {
    if (!selectedAnswer || showFeedback) return;
    if (question.type === 'short_answer') {
      setIsValidatingAnswer(true);
      try {
        const validationResult = await validateShortAnswer(selectedAnswer);
        setAiValidationResult(validationResult);
      } catch (error) {
        console.error('Validation error:', error);
        const fallbackResult = fallbackValidation(selectedAnswer, question.correctAnswer);
        setAiValidationResult(fallbackResult);
      } finally {
        setIsValidatingAnswer(false);
      }
    }
    onCheckAnswer?.();
  }, [selectedAnswer, showFeedback, question.type, question.correctAnswer, validateShortAnswer, onCheckAnswer, fallbackValidation]);
  
  const handleFeedbackHelpfulClick = (helpful: boolean) => {
    setFeedbackHelpfulness(helpful);
    onFeedbackHelpful?.(helpful);
    // Here you would typically send this feedback to your backend
  };

  useEffect(() => {
    setHasInteracted(false);
    setIsAnswerChanging(false);
    setAiValidationResult(null);
    setWordCount(0);
    setCharacterCount(0);
    setFeedbackHelpfulness(null);
  }, [question.id]);

  const getDifficultyBadgeStyle = () => {
    switch (question.difficulty?.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
      case 'hard': return 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
      default: return 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
    }
  };

  const renderQuestionHeader = () => (
    <CardHeader className="px-4 sm:px-6 py-4">
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-wrap gap-2 items-center">
          {question.topic && (
            <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
              <BookOpen className="h-3.5 w-3.5 mr-1.5" /> {question.topic}
            </Badge>
          )}
          {question.difficulty && (
            <Badge variant="outline" className={`capitalize ${getDifficultyBadgeStyle()}`}>
              {question.difficulty}
            </Badge>
          )}
          {question.bloomLevel && (
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800 text-xs">
              {question.bloomLevel}
            </Badge>
          )}
          {question.educationalValue != null && question.educationalValue >= 8 && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800">
              <Star className="h-3.5 w-3.5 mr-1" /> High Quality
            </Badge>
          )}
        </div>
        {timeRemaining !== undefined && totalTime != null && totalTime > 0 && (
          <div className="flex items-center gap-2">
            <Progress value={(timeRemaining / totalTime) * 100} className="w-16 h-2" />
            <Badge variant="outline" className={`tabular-nums ${timeRemaining < 10 ? 'bg-red-50 text-red-700 animate-pulse' : timeRemaining < 30 ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
              <Clock className="h-3 w-3 mr-1" />
              {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
            </Badge>
          </div>
        )}
      </div>
      <CardTitle id={`question-${question.id}`} className="text-base md:text-lg font-medium leading-relaxed text-foreground">
        {question.question}
      </CardTitle>
    </CardHeader>
  );

  const renderAnswerOptions = () => {
    const questionId = `question-${question.id}`;
    return (
      <>
        {question.type === 'multiple_choice' && question.options && (
          <div className="grid gap-3" role="radiogroup" aria-labelledby={questionId}>
            {question.options.map((option, index) => {
              const isSelected = selectedAnswer === option;
              const isCorrect = showFeedback && !isBlindMode && option === question.correctAnswer;
              const isIncorrect = showFeedback && !isBlindMode && option === selectedAnswer && option !== question.correctAnswer;
              return (
                <Button
                  key={`${question.id}-option-${index}`}
                  variant={isSelected ? 'secondary' : 'outline'}
                  className={`w-full text-left justify-start px-4 py-3 h-auto text-sm transition-all duration-200 ease-in-out transform relative ${isSelected && !showFeedback ? 'ring-2 ring-primary/50 ring-offset-1 scale-[1.01] bg-primary/10 dark:bg-primary/20' : 'hover:border-primary/50 hover:bg-muted hover:-translate-y-px'} ${isCorrect ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300' : isIncorrect ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300' : ''} ${showFeedback ? 'cursor-default' : 'cursor-pointer'} focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-50`}
                  onClick={() => !showFeedback && handleAnswerSelection(option)}
                  disabled={showFeedback || isAnswerChanging}
                  role="radio"
                  aria-checked={isSelected}
                  aria-disabled={showFeedback}
                >
                  <div className="flex items-center w-full">
                    <div className="flex-shrink-0 w-6 h-6 mr-3 flex items-center justify-center">
                      {isCorrect && <Check className="h-4 w-4 text-green-500 dark:text-green-400 animate-in fade-in zoom-in-50 duration-200" />}
                      {isIncorrect && <X className="h-4 w-4 text-red-500 dark:text-red-400 animate-in fade-in zoom-in-50 duration-200" />}
                      {!showFeedback && isSelected && <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />}
                      {!showFeedback && !isSelected && <div className="w-3 h-3 rounded-full border-2 border-muted-foreground/30" />}
                    </div>
                    <span className="flex-1">{option}</span>
                  </div>
                </Button>
              );
            })}
          </div>
        )}
        {question.type === 'true_false' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-labelledby={questionId}>
            {['True', 'False'].map((option) => {
              const isSelected = selectedAnswer === option;
              const isCorrect = showFeedback && !isBlindMode && option === question.correctAnswer;
              const isIncorrect = showFeedback && !isBlindMode && option === selectedAnswer && option !== question.correctAnswer;
              return (
                <Button
                  key={`${question.id}-${option}`}
                  variant={isSelected ? 'secondary' : 'outline'}
                  className={`text-center justify-center px-4 py-3 h-auto text-sm font-medium transition-all duration-200 ease-in-out transform ${isSelected && !showFeedback ? 'ring-2 ring-primary/50 ring-offset-1 scale-[1.02] bg-primary/10 dark:bg-primary/20' : 'hover:border-primary/50 hover:bg-muted hover:-translate-y-px'} ${isCorrect ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300' : isIncorrect ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300' : ''} ${showFeedback ? 'cursor-default' : 'cursor-pointer'} focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950`}
                  onClick={() => !showFeedback && handleAnswerSelection(option)}
                  disabled={showFeedback}
                  role="radio"
                  aria-checked={isSelected}
                  aria-disabled={showFeedback}
                >
                  <div className="flex items-center justify-center">
                    {isCorrect && <Check className="h-4 w-4 mr-2 text-green-500 dark:text-green-400 animate-in fade-in zoom-in-50 duration-200" />}
                    {isIncorrect && <X className="h-4 w-4 mr-2 text-red-500 dark:text-red-400 animate-in fade-in zoom-in-50 duration-200" />}
                    <span>{option}</span>
                  </div>
                </Button>
              );
            })}
          </div>
        )}
        {question.type === 'fill_in_blank' && (
          <div className="space-y-3">
            <div className="p-4 bg-muted/50 dark:bg-slate-800/30 rounded-md border text-sm">
              {question.question.includes('_____') ? question.question.replace('_____', '________') : question.question}
            </div>
            <div className="relative">
              <input
                type="text"
                className={`w-full border rounded-md p-3 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 ${showFeedback ? 'bg-muted cursor-not-allowed' : 'bg-background'}`}
                placeholder="Type your answer here..."
                value={selectedAnswer || ''}
                onChange={(e) => handleTextInputChange(e.target.value)}
                disabled={showFeedback}
                aria-labelledby={questionId}
              />
              {showFeedback && !isBlindMode && (
                <div className={`mt-3 p-3 rounded-md animate-in fade-in slide-in-from-top-1 duration-200 ${isCorrectAnswer ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'}`} role="alert">
                  <div className="flex items-center mb-1">
                    {isCorrectAnswer ? <Check className="h-4 w-4 mr-1 text-green-500 dark:text-green-400" /> : <X className="h-4 w-4 mr-1 text-red-500 dark:text-red-400" />}
                    <span className="font-medium">{isCorrectAnswer ? 'Correct!' : 'Incorrect!'}</span>
                  </div>
                  <div className="text-sm">The correct answer is: <span className="font-medium">{question.correctAnswer}</span></div>
                </div>
              )}
            </div>
          </div>
        )}
      </>
    );
  };
  
  const renderShortAnswerInput = () => (
    <div className="space-y-3">
       <Card className="bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">Your Answer</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <Textarea
            className={`w-full min-h-32 p-3 text-sm leading-relaxed transition-all duration-200 ease-in-out border-2 rounded-lg resize-none focus:outline-none focus:ring-0 focus:border-primary placeholder:text-muted-foreground/60 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 ${showFeedback ? 'bg-muted/30 cursor-not-allowed border-muted' : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'}`}
            placeholder="Type your detailed answer here... Explain your reasoning and provide examples if relevant."
            value={selectedAnswer || ''}
            onChange={(e) => handleTextInputChange(e.target.value)}
            disabled={showFeedback || isValidatingAnswer}
            aria-labelledby={`question-${question.id}`}
            rows={5}
          />
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground px-4 pb-3 pt-0 flex justify-between items-center">
            {!showFeedback && selectedAnswer && (
                <span>{wordCount} words • {characterCount} chars</span>
            )}
            {!selectedAnswer && !showFeedback && (
                <span>💡 Tip: Aim for 50-200 words.</span>
            )}
            {showFeedback && selectedAnswer && ( // Show word count even after feedback
                 <span>Your answer: {wordCount} words</span>
            )}
        </CardFooter>
      </Card>

      {isValidatingAnswer && (
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md flex items-center space-x-2">
          <Loader2 className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin" />
          <span className="text-sm text-blue-800 dark:text-blue-300 font-medium">AI is analyzing your answer...</span>
        </div>
      )}
    </div>
  );

  const renderFeedbackBlock = () => {
    if (!showFeedback || isBlindMode) return null;

    // Determine overall feedback sentiment
    let sentiment: 'correct' | 'partial' | 'incorrect';
    let score = 0;
    let feedbackMessage = "";
    let missedPoints: string[] = [];
    let suggestions: string[] = [];
    let keyPointsCovered: string[] = [];

    if (question.type === 'short_answer' && aiValidationResult) {
      score = aiValidationResult.score;
      feedbackMessage = aiValidationResult.feedback;
      missedPoints = aiValidationResult.missedPoints;
      suggestions = aiValidationResult.suggestions;
      keyPointsCovered = aiValidationResult.keyPointsCovered;
      if (aiValidationResult.isCorrect) sentiment = 'correct';
      else if (score >= 50) sentiment = 'partial';
      else sentiment = 'incorrect';
    } else { // For MC, True/False, Fill-in-blank
      if (isCorrectAnswer) {
        sentiment = 'correct';
        score = 100;
        feedbackMessage = "That's correct!";
      } else {
        sentiment = 'incorrect';
        score = 0;
        feedbackMessage = "That's not quite right.";
        if (question.type !== 'fill_in_blank') { // Don't show missed points for fill in blank
             missedPoints = ["The selected answer was incorrect."];
        }
        suggestions = ["Review the relevant material for this question."];
      }
    }
    
    const baseBgColor = sentiment === 'correct' ? 'bg-green-50 dark:bg-green-900/20' : sentiment === 'partial' ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-red-50 dark:bg-red-900/20';
    const borderColor = sentiment === 'correct' ? 'border-green-500 dark:border-green-600' : sentiment === 'partial' ? 'border-amber-500 dark:border-amber-600' : 'border-red-500 dark:border-red-600';
    const textColor = sentiment === 'correct' ? 'text-green-800 dark:text-green-300' : sentiment === 'partial' ? 'text-amber-800 dark:text-amber-300' : 'text-red-800 dark:text-red-300';
    const icon = sentiment === 'correct' ? <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" /> : sentiment === 'partial' ? <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" /> : <X className="h-6 w-6 text-red-600 dark:text-red-400" />;
    const title = sentiment === 'correct' ? 'Excellent!' : sentiment === 'partial' ? "Good Effort!" : "Let's Review Your Answer";

    return (
      <Card className={`mt-6 mb-6 animate-in fade-in slide-in-from-top-2 duration-300 ${baseBgColor} border-l-4 ${borderColor}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
          <div className="flex items-center">
            {icon}
            <CardTitle className={`ml-2 text-lg font-semibold ${textColor}`}>{title}</CardTitle>
          </div>
          <Badge variant="outline" className={`text-lg font-bold px-3 py-1 ${baseBgColor} ${borderColor} ${textColor}`}>
            {score}%
          </Badge>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-2">
          <p className={`text-sm mb-4 ${textColor}`}>{feedbackMessage}</p>
          
          {keyPointsCovered.length > 0 && (
            <div className="mb-3">
              <h4 className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1">Key Points Covered:</h4>
              <div className="flex flex-wrap gap-1.5">
                {keyPointsCovered.map((point, index) => (
                  <Badge key={index} variant="outline" className="text-xs bg-green-100 text-green-800 border-green-300 dark:bg-green-800/30 dark:text-green-200 dark:border-green-700">
                    {point}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {missedPoints.length > 0 && (
            <div className="mb-3">
              <h4 className="text-xs font-semibold text-red-700 dark:text-red-300 mb-1">Areas for Improvement:</h4>
              <div className="flex flex-wrap gap-1.5">
                {missedPoints.map((point, index) => (
                  <Badge key={index} variant="outline" className="text-xs bg-red-100 text-red-800 border-red-300 dark:bg-red-800/30 dark:text-red-200 dark:border-red-700">
                    {point}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {suggestions.length > 0 && (
            <div className="mb-3">
              <h4 className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1 flex items-center">
                <Lightbulb className="h-3.5 w-3.5 mr-1" /> Suggestions:
              </h4>
              <ul className="list-disc list-inside text-sm text-blue-700 dark:text-blue-300 space-y-1 pl-1">
                {suggestions.map((suggestion, index) => <li key={index}>{suggestion}</li>)}
              </ul>
            </div>
          )}
          
          {/* Model Answer for incorrect/partially correct short answers, or any incorrect MC/TF/FIB */}
          {(question.type === 'short_answer' && !isCorrectAnswer && score < 80 || (question.type !== 'short_answer' && !isCorrectAnswer)) && question.correctAnswer && (
            <div className="mt-4 pt-3 border-t border-current/20">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Model Answer:</h4>
              <div className="text-sm p-3 bg-gray-100 dark:bg-gray-800 rounded-md italic text-gray-600 dark:text-gray-400">
                {question.correctAnswer}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderExplanationBlock = () => {
    if (!showFeedback || isBlindMode || (!question.explanation && !question.sourceChunk)) return null;
    return (
      <Card className="mt-6 mb-6 animate-in fade-in slide-in-from-top-3 duration-300">
        <CardHeader className="flex flex-row items-center space-x-2 pb-2 pt-4 px-4">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <CardTitle className="text-md font-semibold text-blue-800 dark:text-blue-300">Explanation</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-2 space-y-3">
          {question.explanation && (
            <p className="text-sm text-gray-700 dark:text-gray-300">{question.explanation}</p>
          )}
          {question.sourceChunk && (
            <div className="mt-2 pt-3 border-t border-gray-200 dark:border-gray-700">
              <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center">
                <BookOpen className="h-3.5 w-3.5 mr-1.5" /> From the study material:
              </h5>
              <blockquote className="text-sm italic p-3 bg-gray-50 dark:bg-gray-800/50 border-l-4 border-gray-300 dark:border-gray-600 rounded-r-md text-gray-600 dark:text-gray-400">
                "{question.sourceChunk}"
              </blockquote>
              {onReviewSource && (
                <Button variant="link" size="sm" className="mt-1 text-xs h-7 px-0 text-blue-600 hover:text-blue-700" onClick={() => onReviewSource(question.sourceChunk || '')}>
                  Review this section
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderActionButtons = () => (
    <CardFooter className="flex flex-col sm:flex-row justify-between items-center p-4 sm:px-6 pt-4 mt-4 border-t">
      <div className="flex gap-2 mb-3 sm:mb-0">
        {onRequestHint && !showFeedback && !hintRequested && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={onRequestHint} disabled={showFeedback} className="h-9 transition-all duration-150 hover:-translate-y-px">
                  <Lightbulb className="h-4 w-4 mr-1.5" /> Hint
                </Button>
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">Get a hint (timer penalty applies)</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
         {hintRequested && !showFeedback && <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800">Hint used</Badge>}
      </div>
      <div className="flex gap-2 flex-wrap justify-center sm:justify-end">
        {showFeedback ? (
          <>
            {onTryAgain && !isCorrectAnswer && (
              <Button variant="outline" size="sm" onClick={onTryAgain} className="h-9">
                <RotateCcw className="h-4 w-4 mr-1.5" /> Try Again
              </Button>
            )}
            {onMarkForReview && (
                <Button variant="outline" size="sm" onClick={onMarkForReview} className="h-9">
                    <Bookmark className="h-4 w-4 mr-1.5" /> Mark for Review
                </Button>
            )}
            <Button onClick={onNextQuestion} size="sm" className="h-9 font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 hover:-translate-y-px hover:shadow-md">
              {isLastQuestion ? 'Finish Session' : 'Next Question'}
            </Button>
          </>
        ) : (
          <Button onClick={handleCheckAnswer} disabled={!selectedAnswer || selectedAnswer.trim() === '' || isValidatingAnswer} size="sm" className={`h-9 font-medium transition-all duration-200 ${selectedAnswer && !isValidatingAnswer ? 'hover:-translate-y-px hover:shadow-md' : ''} disabled:hover:translate-y-0 disabled:hover:shadow-none`}>
            {isValidatingAnswer ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing...</> : 'Check Answer'}
          </Button>
        )}
      </div>
    </CardFooter>
  );
  
  const renderFeedbackOnFeedback = () => {
    if (!showFeedback || isBlindMode || feedbackHelpfulness !== null) return null;
    return (
        <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground mb-1.5">Was this feedback helpful?</p>
            <div className="flex justify-center gap-2">
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleFeedbackHelpfulClick(true)}>
                    <ThumbsUp className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleFeedbackHelpfulClick(false)}>
                    <ThumbsDown className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    );
  };


  return (
    <div className="w-full space-y-4">
      <Card className="shadow-lg border-transparent"> {/* Main question card */}
        {renderQuestionHeader()}
        <CardContent className="px-4 sm:px-6 py-4 space-y-4">
          {question.type === 'short_answer' ? renderShortAnswerInput() : renderAnswerOptions()}
          {!showFeedback && selectedAnswer && confidenceLevels && onSelectConfidence && (
            <div className="mt-5 pt-4 border-t border-dashed" role="radiogroup" aria-label="Confidence level">
              <div className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">How confident are you in your answer?</div>
              <div className="flex gap-2 flex-wrap">
                {confidenceLevels.map(level => (
                  <Button key={level.value} variant="outline" size="sm" className={`flex-1 transition-all duration-200 ease-in-out transform ${selectedConfidence === level.value ? `${level.color} scale-105 ring-1 ring-current` : 'hover:bg-muted hover:scale-102 dark:hover:bg-slate-700'}`} onClick={() => handleConfidenceSelection(level.value)} role="radio" aria-checked={selectedConfidence === level.value}>
                    {level.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
        {renderActionButtons()}
      </Card>

      {/* Feedback Section */}
      {renderFeedbackBlock()}
      
      {/* Explanation Section */}
      {renderExplanationBlock()}

      {/* Feedback on Feedback Section */}
      {renderFeedbackOnFeedback()}

      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
          Debug: Selected="{selectedAnswer}", ShowFeedback={showFeedback.toString()}, Correct="{question.correctAnswer}", HasInteracted={hasInteracted.toString()}, Type="{question.type}", WordCount={wordCount}
        </div>
      )}
    </div>
  );
};

export default QuestionDisplay;
