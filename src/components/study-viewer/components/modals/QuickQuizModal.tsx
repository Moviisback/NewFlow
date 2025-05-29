// src/components/study-viewer/components/modals/QuickQuizModal.tsx
import React, { useState } from 'react';
import { X, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuickQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Sample quiz questions (in a real implementation, these would be generated based on the content)
const SAMPLE_QUESTIONS = [
  {
    id: 'q1',
    question: 'What was the primary purpose of the initial ARPANET development?',
    options: [
      'Commercial networking',
      'Military communication',
      'Research networking',
      'Public internet access'
    ],
    correctAnswer: 2 // Zero-based index
  },
  {
    id: 'q2',
    question: 'Which technology enables data to be split into packets and reassembled at the destination?',
    options: [
      'Circuit switching',
      'Packet switching',
      'Domain name system',
      'Hypertext transfer protocol'
    ],
    correctAnswer: 1
  },
  {
    id: 'q3',
    question: 'Who is credited with inventing the World Wide Web?',
    type: 'text',
    correctAnswer: 'Tim Berners-Lee'
  }
];

const QuickQuizModal: React.FC<QuickQuizModalProps> = ({
  isOpen,
  onClose
}) => {
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [showResults, setShowResults] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleMultipleChoiceAnswer = (questionId: string, answerIndex: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }));
  };

  const handleTextAnswer = (questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleCheckAnswers = () => {
    setShowResults(true);
  };

  const isCorrect = (questionId: string) => {
    if (!showResults) return false;
    
    const question = SAMPLE_QUESTIONS.find(q => q.id === questionId);
    if (!question) return false;
    
    const userAnswer = answers[questionId];
    
    if (question.type === 'text') {
      const correctAnswer = question.correctAnswer as string;
      return typeof userAnswer === 'string' && 
             userAnswer.toLowerCase() === correctAnswer.toLowerCase();
    }
    
    return userAnswer === question.correctAnswer;
  };

  const getScore = () => {
    if (!showResults) return 0;
    
    const correct = SAMPLE_QUESTIONS.filter(q => isCorrect(q.id)).length;
    return Math.round((correct / SAMPLE_QUESTIONS.length) * 100);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
            <span className="flex items-center">
              <HelpCircle className="h-5 w-5 text-indigo-500 mr-2" />
              Quick Quiz
            </span>
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="space-y-6">
          {/* Quiz introduction */}
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Test your understanding of the material with these automatically generated questions.
          </p>
          
          {/* Score display (if results are shown) */}
          {showResults && (
            <div className="p-4 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 mb-4">
              <h3 className="text-center font-medium text-lg mb-1">Your Score: {getScore()}%</h3>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div 
                  className="bg-indigo-600 h-2.5 rounded-full" 
                  style={{ width: `${getScore()}%` }}
                ></div>
              </div>
            </div>
          )}
          
          {/* Sample quiz questions */}
          <div className="space-y-4">
            {SAMPLE_QUESTIONS.map((question, index) => (
              <div 
                key={question.id} 
                className={`p-4 bg-white dark:bg-gray-800 border rounded-lg shadow-sm ${
                  showResults 
                    ? isCorrect(question.id)
                      ? 'border-green-300 dark:border-green-700'
                      : 'border-red-300 dark:border-red-700'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <h3 className="text-base font-medium text-gray-800 dark:text-gray-200 mb-3">
                  Question {index + 1}:
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  {question.question}
                </p>
                
                {/* Multiple choice question */}
                {question.options && (
                  <div className="space-y-2">
                    {question.options.map((option, optionIndex) => (
                      <div key={optionIndex} className="flex items-center">
                        <input
                          type="radio"
                          id={`${question.id}-${optionIndex}`}
                          name={question.id}
                          checked={answers[question.id] === optionIndex}
                          onChange={() => handleMultipleChoiceAnswer(question.id, optionIndex)}
                          className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                          disabled={showResults}
                        />
                        <label 
                          htmlFor={`${question.id}-${optionIndex}`} 
                          className={`ml-2 text-sm ${
                            showResults && question.correctAnswer === optionIndex
                              ? 'text-green-600 dark:text-green-400 font-medium'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {option}
                          {showResults && question.correctAnswer === optionIndex && ' ✓'}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Text input question */}
                {question.type === 'text' && (
                  <input 
                    type="text" 
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    placeholder="Type your answer..."
                    value={answers[question.id] as string || ''}
                    onChange={(e) => handleTextAnswer(question.id, e.target.value)}
                    disabled={showResults}
                  />
                )}
                
                {/* Show correct answer for text questions */}
                {showResults && question.type === 'text' && (
                  <div className="mt-2 text-sm">
                    <span className="font-medium">Correct answer:</span> {question.correctAnswer}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="text-sm"
            >
              {showResults ? 'Close' : 'Cancel'}
            </Button>
            
            {!showResults ? (
              <Button 
                className="text-sm bg-indigo-600 hover:bg-indigo-700"
                onClick={handleCheckAnswers}
              >
                Check Answers
              </Button>
            ) : (
              <Button 
                variant="outline"
                className="text-sm"
                onClick={() => {
                  setShowResults(false);
                  setAnswers({});
                }}
              >
                Try Again
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickQuizModal;