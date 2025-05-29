// components/documents/ActiveQuizComponent.tsx
import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  HelpCircle, 
  RefreshCw, 
  ArrowRight, 
  Lightbulb, 
  Brain, 
  Trophy,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type QuizQuestion = {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer' | 'fill-in-blank';
  question: string;
  options?: string[];
  correctAnswer: string | string[];
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  relatedSection?: string;
  hint?: string;
};

interface ActiveQuizComponentProps {
  isOpen: boolean;
  onClose: () => void;
  summary: string;
  title: string;
  onNavigateToSection?: (sectionId: string) => void;
}

const ActiveQuizComponent: React.FC<ActiveQuizComponentProps> = ({
  isOpen,
  onClose,
  summary,
  title,
  onNavigateToSection
}) => {
  // State
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [shortAnswerInput, setShortAnswerInput] = useState<string>('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);
  const [isGenerating, setIsGenerating] = useState(true);
  const [quizMode, setQuizMode] = useState<'all' | 'adaptive' | 'challenge'>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');

  // Generate quiz questions from the summary
  useEffect(() => {
    if (summary && isOpen) {
      generateQuestions();
    }
  }, [summary, isOpen]);

  // Generate quiz questions from summary content
  const generateQuestions = () => {
    setIsGenerating(true);
    setCurrentQuestionIndex(0);
    setSelectedAnswer('');
    setShortAnswerInput('');
    setIsAnswered(false);
    setIsCorrect(false);
    setScore(0);
    setTotalAnswered(0);
    setShowExplanation(false);
    setShowHint(false);
    setQuizComplete(false);
    
    // This would typically be an API call to generate questions
    // For now, we'll simulate it with a timeout and example questions
    setTimeout(() => {
      // Extract headings and key concepts to create questions about
      const headings: string[] = [];
      const keyTerms: {term: string, definition: string}[] = [];
      
      // Extract headings (# and ## markdown headings)
      const headingRegex = /^(#{1,2})\s+(.+)$/gm;
      let match;
      while ((match = headingRegex.exec(summary)) !== null) {
        headings.push(match[2].trim());
      }
      
      // Extract key terms (bold text with definition patterns)
      const keyTermRegex = /\*\*(.*?)\*\*:\s*((?:[^.!?]|(?:\.\s+[a-z]))+[.!?])/g;
      while ((match = keyTermRegex.exec(summary)) !== null) {
        keyTerms.push({
          term: match[1].trim(),
          definition: match[2].trim()
        });
      }
      
      // Also look for terms in bold anywhere
      const boldTermRegex = /\*\*(.*?)\*\*/g;
      const boldTerms = new Set<string>();
      while ((match = boldTermRegex.exec(summary)) !== null) {
        boldTerms.add(match[1].trim());
      }
      
      // Create questions based on extracted content
      const generatedQuestions: QuizQuestion[] = [];
      
      // Add multiple choice questions based on headings
      headings.slice(0, 3).forEach((heading, index) => {
        const relatedText = findTextRelatedToHeading(summary, heading);
        
        if (relatedText) {
          // Create a multiple choice question
          generatedQuestions.push({
            id: `q-heading-${index}`,
            type: 'multiple-choice',
            question: `Which of the following best describes the key concept of "${heading}"?`,
            options: [
              summarizeText(relatedText, 20),
              createWrongAnswer(heading, 1),
              createWrongAnswer(heading, 2),
              createWrongAnswer(heading, 3),
            ].sort(() => Math.random() - 0.5),
            correctAnswer: summarizeText(relatedText, 20),
            explanation: `The section "${heading}" covers ${summarizeText(relatedText, 40)}`,
            difficulty: 'medium',
            relatedSection: `section-${heading.toLowerCase().replace(/[^\w]+/g, '-')}`
          });
        }
      });
      
      // Add true/false questions
      if (headings.length > 0) {
        generatedQuestions.push({
          id: `q-tf-1`,
          type: 'true-false',
          question: `True or False: ${createTrueFalseStatement(summary, true)}`,
          options: ['True', 'False'],
          correctAnswer: 'True',
          explanation: `This statement is correct based on the content of the document.`,
          difficulty: 'easy'
        });
        
        generatedQuestions.push({
          id: `q-tf-2`,
          type: 'true-false',
          question: `True or False: ${createTrueFalseStatement(summary, false)}`,
          options: ['True', 'False'],
          correctAnswer: 'False',
          explanation: `This statement is incorrect. The document actually states the opposite or a different fact.`,
          difficulty: 'easy'
        });
      }
      
      // Add short answer questions based on key terms
      keyTerms.slice(0, 3).forEach((termDef, index) => {
        generatedQuestions.push({
          id: `q-term-${index}`,
          type: 'short-answer',
          question: `Define the term: ${termDef.term}`,
          correctAnswer: termDef.definition,
          explanation: `The definition of ${termDef.term} is: ${termDef.definition}`,
          difficulty: 'medium',
          hint: `This term relates to a key concept in the ${headings.length > 0 ? headings[0] : 'document'} section.`
        });
      });
      
      // Add fill-in-the-blank questions
      const sentences = extractKeySentences(summary);
      if (sentences.length > 0) {
        sentences.slice(0, 2).forEach((sentence, index) => {
          const { question, answer } = createFillInBlankQuestion(sentence);
          
          if (question && answer) {
            generatedQuestions.push({
              id: `q-blank-${index}`,
              type: 'fill-in-blank',
              question,
              correctAnswer: answer,
              explanation: `The complete sentence is: "${sentence}"`,
              difficulty: index === 0 ? 'easy' : 'medium'
            });
          }
        });
      }
      
      // Add challenging questions for higher-level thinking
      if (headings.length >= 2) {
        generatedQuestions.push({
          id: 'q-challenge-1',
          type: 'multiple-choice',
          question: `Which of the following represents the relationship between ${headings[0]} and ${headings[1]}?`,
          options: [
            'They are complementary concepts that work together',
            'They represent opposing approaches or viewpoints',
            'One is a subcategory or component of the other',
            'They are completely unrelated topics'
          ],
          correctAnswer: 'They are complementary concepts that work together', // Sample answer
          explanation: `Based on the document, ${headings[0]} and ${headings[1]} are related concepts that work together to achieve the overall goal.`,
          difficulty: 'hard'
        });
      }
      
      // If we couldn't generate enough questions, add some generic ones
      if (generatedQuestions.length < 5) {
        const genericQuestions: QuizQuestion[] = [
          {
            id: 'q-generic-1',
            type: 'multiple-choice',
            question: 'What is the main topic of this document?',
            options: [
              title,
              'Computer Programming',
              'Artificial Intelligence',
              'Internet Technologies'
            ],
            correctAnswer: title,
            explanation: `The document is primarily about ${title}.`,
            difficulty: 'easy'
          },
          {
            id: 'q-generic-2',
            type: 'true-false',
            question: 'This document covers all aspects of the topic in extensive detail.',
            options: ['True', 'False'],
            correctAnswer: 'False',
            explanation: 'While comprehensive, this document provides a focused overview rather than covering every detail of the subject.',
            difficulty: 'easy'
          },
          {
            id: 'q-generic-3',
            type: 'short-answer',
            question: 'What is one key concept you learned from this document?',
            correctAnswer: ['concept', 'learned', 'understand', 'key', 'important', 'main'],
            explanation: 'This is a reflection question to help reinforce what you learned.',
            difficulty: 'medium'
          }
        ];
        
        // Add generic questions as needed
        for (let i = 0; i < 5 - generatedQuestions.length; i++) {
          if (i < genericQuestions.length) {
            generatedQuestions.push(genericQuestions[i]);
          }
        }
      }
      
      // Shuffle and set the questions
      setQuestions(generatedQuestions.sort(() => Math.random() - 0.5));
      setIsGenerating(false);
    }, 1500);
  };

  // Helper function to find text related to a heading
  const findTextRelatedToHeading = (text: string, heading: string): string => {
    // This is a simplified implementation
    // In a real implementation, you would parse the document structure more carefully
    const headingRegex = new RegExp(`#\\s+${heading}[\\s\\S]*?(?=\\n#\\s+|$)`, 'i');
    const match = text.match(headingRegex);
    
    if (match) {
      // Remove the heading itself and return the content
      return match[0].replace(/#\s+[^\n]+\n/, '').trim();
    }
    
    return '';
  };

  // Helper function to summarize text to a maximum length
  const summarizeText = (text: string, maxWords: number): string => {
    const words = text.split(/\s+/);
    if (words.length <= maxWords) {
      return text;
    }
    return words.slice(0, maxWords).join(' ') + '...';
  };

  // Helper function to create wrong answers for multiple choice
  const createWrongAnswer = (heading: string, variant: number): string => {
    const wrongAnswers = [
      `A minor subtopic that isn't central to the document`,
      `An outdated concept that has been replaced by newer approaches`,
      `A controversial perspective that many experts disagree with`,
      `A theoretical framework with limited practical applications`,
      `A specialized technique only used in rare circumstances`,
      `A concept from a different field that's only mentioned in passing`
    ];
    
    return wrongAnswers[variant % wrongAnswers.length];
  };

  // Helper function to create true/false statements
  const createTrueFalseStatement = (text: string, isTrue: boolean): string => {
    // Extract sentences containing key terms
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    const keyTermSentences = sentences.filter(sentence => 
      sentence.includes('**') || /important|significant|key|essential|critical/i.test(sentence)
    );
    
    if (keyTermSentences.length > 0) {
      const randomSentence = keyTermSentences[Math.floor(Math.random() * keyTermSentences.length)];
      
      if (isTrue) {
        // Clean up the sentence (remove markdown)
        return randomSentence.replace(/\*\*/g, '').trim();
      } else {
        // Modify the sentence to make it false
        const negations = [
          (s: string) => s.replace(/is|are|was|were/, match => match === 'is' ? 'is not' : match === 'are' ? 'are not' : match === 'was' ? 'was not' : 'were not'),
          (s: string) => s.replace(/always|never|all|none/, match => match === 'always' ? 'never' : match === 'never' ? 'always' : match === 'all' ? 'none' : 'all'),
          (s: string) => {
            const words = s.split(/\s+/);
            if (words.length > 5) {
              // Swap two important words to change meaning
              const idx1 = Math.floor(words.length / 3);
              const idx2 = Math.floor(words.length * 2 / 3);
              [words[idx1], words[idx2]] = [words[idx2], words[idx1]];
            }
            return words.join(' ');
          }
        ];
        
        const negation = negations[Math.floor(Math.random() * negations.length)];
        return negation(randomSentence.replace(/\*\*/g, '')).trim();
      }
    }
    
    // Fallback if no good sentences found
    return isTrue 
      ? `${title} covers important concepts related to the subject matter`
      : `${title} is not relevant to modern applications of the subject matter`;
  };

  // Helper function to extract key sentences from text
  const extractKeySentences = (text: string): string[] => {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    // Find sentences with key terms or important-sounding phrases
    return sentences.filter(sentence => 
      sentence.includes('**') || 
      /important|significant|key|essential|critical|primary|main|fundamental/i.test(sentence)
    );
  };

  // Helper function to create fill-in-the-blank questions
  const createFillInBlankQuestion = (sentence: string): { question: string, answer: string } => {
    // Clean up sentence (remove markdown)
    const cleanSentence = sentence.replace(/\*\*/g, '').trim();
    
    // Split into words
    const words = cleanSentence.split(/\s+/);
    
    if (words.length < 5) {
      return { question: '', answer: '' };
    }
    
    // Find a suitable word to blank out (prefer nouns, longer words)
    const candidates = words
      .map((word, index) => ({ word, index }))
      .filter(({ word }) => word.length > 4 && /^[A-Z]?[a-z]+$/.test(word))
      .sort((a, b) => b.word.length - a.word.length);
    
    if (candidates.length === 0) {
      // Fallback to any word in the middle of the sentence
      const middleIndex = Math.floor(words.length / 2);
      const word = words[middleIndex];
      words[middleIndex] = '_______';
      return {
        question: words.join(' '),
        answer: word
      };
    }
    
    // Choose a suitable candidate
    const chosen = candidates[0];
    const wordToRemove = chosen.word;
    words[chosen.index] = '_______';
    
    return {
      question: words.join(' '),
      answer: wordToRemove
    };
  };

  // Handle answer selection
  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswer(answer);
  };

  // Handle short answer input
  const handleShortAnswerInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setShortAnswerInput(e.target.value);
  };

  // Check the answer
  const checkAnswer = () => {
    const currentQuestion = questions[currentQuestionIndex];
    
    if (!currentQuestion) return;
    
    let correct = false;
    
    switch (currentQuestion.type) {
      case 'multiple-choice':
      case 'true-false':
        correct = selectedAnswer === currentQuestion.correctAnswer;
        break;
      
      case 'short-answer':
        // For short answer, check if answer contains key words from the correct answer
        if (typeof currentQuestion.correctAnswer === 'string') {
          const correctKeywords = currentQuestion.correctAnswer.toLowerCase().split(/\s+/);
          const inputKeywords = shortAnswerInput.toLowerCase().split(/\s+/);
          
          // Count matching keywords
          const matchingKeywords = correctKeywords.filter(word => 
            word.length > 3 && inputKeywords.some(inputWord => inputWord.includes(word))
          );
          
          // Consider it correct if at least half of the key words match
          correct = matchingKeywords.length >= Math.ceil(correctKeywords.length * 0.3);
        } else if (Array.isArray(currentQuestion.correctAnswer)) {
          // If correctAnswer is an array of acceptable keywords
          const inputLower = shortAnswerInput.toLowerCase();
          correct = currentQuestion.correctAnswer.some(keyword => 
            inputLower.includes(keyword.toLowerCase())
          );
        }
        break;
      
      case 'fill-in-blank':
        // For fill-in-blank, check if answer matches or is close to correct answer
        if (typeof currentQuestion.correctAnswer === 'string') {
          const correctLower = currentQuestion.correctAnswer.toLowerCase();
          const inputLower = shortAnswerInput.toLowerCase();
          
          // Check for exact match or close match
          correct = correctLower === inputLower || 
                   (inputLower.length > 3 && 
                    (correctLower.includes(inputLower) || inputLower.includes(correctLower)));
        }
        break;
    }
    
    setIsCorrect(correct);
    setIsAnswered(true);
    setShowExplanation(true);
    setScore(prev => correct ? prev + 1 : prev);
    setTotalAnswered(prev => prev + 1);
  };

  // Go to next question
  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer('');
      setShortAnswerInput('');
      setIsAnswered(false);
      setIsCorrect(false);
      setShowExplanation(false);
      setShowHint(false);
    } else {
      // Quiz complete
      setQuizComplete(true);
    }
  };

  // Reset the quiz
  const resetQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer('');
    setShortAnswerInput('');
    setIsAnswered(false);
    setIsCorrect(false);
    setScore(0);
    setTotalAnswered(0);
    setShowExplanation(false);
    setShowHint(false);
    setQuizComplete(false);
    
    // Shuffle questions
    setQuestions(prev => [...prev].sort(() => Math.random() - 0.5));
  };

  // Filter questions by difficulty
  const getFilteredQuestions = () => {
    if (difficultyFilter === 'all') {
      return questions;
    }
    return questions.filter(q => q.difficulty === difficultyFilter);
  };

  // Navigate to related section
  const navigateToSection = () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (currentQuestion?.relatedSection && onNavigateToSection) {
      onNavigateToSection(currentQuestion.relatedSection);
      onClose();
    }
  };

  if (!isOpen) return null;

  const filteredQuestions = getFilteredQuestions();
  const currentQuestion = currentQuestionIndex < filteredQuestions.length ? filteredQuestions[currentQuestionIndex] : null;
  const progress = (currentQuestionIndex / filteredQuestions.length) * 100;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 overflow-auto">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <Brain className="h-5 w-5 text-indigo-500 mr-2" />
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              Quiz: {title}
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">
                Generating quiz questions based on your study material...
              </p>
            </div>
          ) : quizComplete ? (
            // Quiz Complete Screen
            <div className="text-center py-6">
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Trophy className="h-10 w-10 text-green-600 dark:text-green-400" />
                </div>
              </div>
              
              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                Quiz Complete!
              </h3>
              
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                You scored {score} out of {totalAnswered} questions correctly.
              </p>
              
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your Performance
                </p>
                <div className="w-full max-w-md mx-auto">
                  <Progress 
                    value={(score / Math.max(1, totalAnswered)) * 100} 
                    className="h-3"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0%</span>
                    <span>{Math.round((score / Math.max(1, totalAnswered)) * 100)}%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={resetQuiz}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Try Again
                </Button>
                <Button onClick={onClose}>
                  Done
                </Button>
              </div>
            </div>
          ) : currentQuestion ? (
            // Question Display
            <div>
              {/* Quiz Controls */}
              <div className="flex flex-wrap justify-between items-center mb-6">
                <div className="flex gap-2 mb-2 sm:mb-0">
                  <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300">
                    Question {currentQuestionIndex + 1} of {filteredQuestions.length}
                  </Badge>
                  <Badge variant="outline" className={`${
                    currentQuestion.difficulty === 'easy' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' :
                    currentQuestion.difficulty === 'medium' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300' :
                    'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                  }`}>
                    {currentQuestion.difficulty.charAt(0).toUpperCase() + currentQuestion.difficulty.slice(1)}
                  </Badge>
                  <Badge variant="outline" className="bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                    {currentQuestion.type === 'multiple-choice' ? 'Multiple Choice' : 
                     currentQuestion.type === 'true-false' ? 'True/False' : 
                     currentQuestion.type === 'short-answer' ? 'Short Answer' : 
                     'Fill in the Blank'}
                  </Badge>
                </div>
                
                <div className="flex gap-2">
                  <select
                    value={difficultyFilter}
                    onChange={(e) => setDifficultyFilter(e.target.value as any)}
                    className="text-xs border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-800"
                  >
                    <option value="all">All Levels</option>
                    <option value="easy">Easy Only</option>
                    <option value="medium">Medium Only</option>
                    <option value="hard">Hard Only</option>
                  </select>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full mb-6">
                <Progress value={progress} className="h-2" />
              </div>
              
              {/* Question */}
              <div className="mb-6">
                <h3 className="text-xl font-medium text-gray-800 dark:text-gray-100 mb-4">
                  {currentQuestion.question}
                </h3>
                
                {/* Answer Options */}
                {(currentQuestion.type === 'multiple-choice' || currentQuestion.type === 'true-false') && currentQuestion.options && (
                  <RadioGroup 
                    value={selectedAnswer} 
                    onValueChange={handleAnswerSelect}
                    className="space-y-3"
                  >
                    {currentQuestion.options.map((option, index) => (
                      <div key={index} className={`flex items-center space-x-2 p-3 rounded-lg border ${
                        isAnswered 
                          ? (option === currentQuestion.correctAnswer)
                            ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                            : (option === selectedAnswer)
                              ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
                              : 'border-gray-200 dark:border-gray-700'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}>
                        <RadioGroupItem 
                          value={option} 
                          id={`option-${index}`} 
                          disabled={isAnswered}
                          className={isAnswered && option === currentQuestion.correctAnswer ? 'text-green-600' : ''}
                        />
                        <Label 
                          htmlFor={`option-${index}`}
                          className={`flex-1 cursor-pointer ${
                            isAnswered && option === currentQuestion.correctAnswer 
                              ? 'text-green-700 dark:text-green-400 font-medium' 
                              : isAnswered && option === selectedAnswer
                                ? 'text-red-700 dark:text-red-400'
                                : 'text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {option}
                          {isAnswered && (
                            option === currentQuestion.correctAnswer 
                              ? <CheckCircle className="inline-block ml-2 h-4 w-4 text-green-600" />
                              : option === selectedAnswer
                                ? <XCircle className="inline-block ml-2 h-4 w-4 text-red-600" />
                                : null
                          )}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
                
                {/* Short Answer Input */}
                {currentQuestion.type === 'short-answer' && (
                  <div className="mb-4">
                    <Textarea
                      value={shortAnswerInput}
                      onChange={handleShortAnswerInput}
                      placeholder="Type your answer here..."
                      className="w-full p-3 h-24 resize-none"
                      disabled={isAnswered}
                    />
                  </div>
                )}
                
                {/* Fill in the Blank Input */}
                {currentQuestion.type === 'fill-in-blank' && (
                  <div className="mb-4">
                    <Input
                      value={shortAnswerInput}
                      onChange={(e) => setShortAnswerInput(e.target.value)}
                      placeholder="Type the missing word..."
                      className="w-full max-w-xs p-2"
                      disabled={isAnswered}
                    />
                  </div>
                )}
              </div>
              
              {/* Hint */}
              {currentQuestion.hint && !isAnswered && (
                <div className="mb-6">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowHint(!showHint)}
                    className="text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                  >
                    <Lightbulb className="h-4 w-4 mr-1" />
                    {showHint ? 'Hide Hint' : 'Show Hint'}
                  </Button>
                  
                  {showHint && (
                    <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md text-sm text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      {currentQuestion.hint}
                    </div>
                  )}
                </div>
              )}
              
              {/* Explanation (shown after answering) */}
              {isAnswered && showExplanation && (
                <div className={`mb-6 p-4 rounded-md border ${
                  isCorrect 
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {isCorrect 
                      ? <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                      : <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    }
                    <h4 className={`font-medium ${
                      isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                    }`}>
                      {isCorrect ? 'Correct!' : 'Incorrect'}
                    </h4>
                  </div>
                  
                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    {currentQuestion.explanation}
                  </p>
                  
                  {currentQuestion.relatedSection && (
                    <div className="mt-3">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={navigateToSection}
                        className="text-indigo-600 dark:text-indigo-400 text-xs"
                      >
                        Review related section
                      </Button>
                    </div>
                  )}
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex justify-between">
                {!isAnswered ? (
                  <Button 
                    disabled={
                      (currentQuestion.type === 'multiple-choice' || currentQuestion.type === 'true-false') 
                        ? !selectedAnswer 
                        : !shortAnswerInput.trim()
                    }
                    onClick={checkAnswer}
                  >
                    Check Answer
                  </Button>
                ) : (
                  <Button 
                    onClick={goToNextQuestion}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {currentQuestionIndex < filteredQuestions.length - 1 ? (
                      <>
                        Next Question
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </>
                    ) : (
                      'See Results'
                    )}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-600 dark:text-gray-400">
                No questions available for the selected difficulty level.
              </p>
              <Button 
                variant="outline" 
                onClick={() => setDifficultyFilter('all')}
                className="mt-4"
              >
                Show All Questions
              </Button>
            </div>
          )}
        </div>
        
        {/* Footer */}
        {!quizComplete && !isGenerating && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Score: {score} / {totalAnswered}
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={resetQuiz}
                className="flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Restart Quiz
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveQuizComponent;