// Updated SummaryValidator.tsx with originalText property added to the interface

import React, { useState } from 'react';
import { CheckCircle2, XCircle, Loader2, HelpCircle, AlertTriangle, BarChart4, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";

// Define types for validation results and questions
interface ValidationQuestion {
  question: string;
  originalInfo: string;
  status: 'correct' | 'partial' | 'missing';
  type?: string;
  confidence?: number;
  note?: string;
}

interface ValidationResult {
  overallScore: number;
  questionCount: number;
  answeredCorrectly: number;
  partiallyAnswered: number;
  unanswered: number;
  questions: ValidationQuestion[];
  missingConcepts: string[];
}

// Define props for the component
interface SummaryValidatorProps {
  file: File | null;
  summary: string;
  originalText: string; // Added this property to fix the error
  onComplete?: (results: ValidationResult) => void;
  onSummaryEnhanced?: (enhancedSummary: string) => void;
}

// The component implementation
const SummaryValidator: React.FC<SummaryValidatorProps> = ({ 
  file, 
  summary, 
  originalText,
  onComplete,
  onSummaryEnhanced
}) => {
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validationResults, setValidationResults] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string>('');
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [enhancementResult, setEnhancementResult] = useState<{
    improvedQuestions: number;
    message?: string;
  } | null>(null);

  // Function to validate summary against original content
  const validateSummary = async () => {
    if (!file || !summary) {
      setError('Both file and summary are required for validation.');
      return;
    }

    setIsValidating(true);
    setError('');
    setValidationResults(null);
    setEnhancementResult(null);

    try {
      // Create a FormData object to send the file and summary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('summary', summary);
      
      // Call the validation API
      const response = await fetch('/api/validate-summary', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Validation failed');
      }

      const data = await response.json() as ValidationResult;
      setValidationResults(data);
      if (onComplete) onComplete(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'An error occurred during validation.');
      } else {
        setError('An unknown error occurred during validation.');
      }
    } finally {
      setIsValidating(false);
    }
  };

  // Function to enhance the summary with missing information
  const enhanceSummary = async () => {
    if (!validationResults || !summary || !originalText) {
      setError('Missing data required for enhancement.');
      return;
    }

    setIsEnhancing(true);
    setError('');

    try {
      const response = await fetch('/api/enhance-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary,
          validationResult: validationResults,
          originalText
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Enhancement failed');
      }

      const data = await response.json();
      
      if (data.enhancedSummary) {
        if (onSummaryEnhanced) {
          onSummaryEnhanced(data.enhancedSummary);
        }
        setEnhancementResult({
          improvedQuestions: data.improvedQuestions || 0,
          message: data.message
        });
      } else {
        throw new Error('No enhanced summary was returned');
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'An error occurred during enhancement.');
      } else {
        setError('An unknown error occurred during enhancement.');
      }
    } finally {
      setIsEnhancing(false);
    }
  };

  // Calculate result stats
  const getResultStats = () => {
    if (!validationResults) return null;
    
    return {
      correctPercent: Math.round((validationResults.answeredCorrectly / validationResults.questionCount) * 100),
      partialPercent: Math.round((validationResults.partiallyAnswered / validationResults.questionCount) * 100),
      missingPercent: Math.round((validationResults.unanswered / validationResults.questionCount) * 100)
    };
  };

  // Group questions by type
  const getQuestionsByType = () => {
    if (!validationResults?.questions) return {};
    
    const groupedQuestions: {[key: string]: ValidationQuestion[]} = {};
    
    validationResults.questions.forEach(q => {
      const type = q.type || 'unknown';
      if (!groupedQuestions[type]) {
        groupedQuestions[type] = [];
      }
      groupedQuestions[type].push(q);
    });
    
    return groupedQuestions;
  };

  // Count missing questions
  const getMissingQuestionsCount = () => {
    if (!validationResults) return 0;
    return validationResults.questions.filter(q => 
      q.status === 'missing' || q.status === 'partial'
    ).length;
  };

  const stats = getResultStats();
  const questionsByType = getQuestionsByType();
  const missingCount = getMissingQuestionsCount();

  // Get badge color based on status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'correct':
        return "bg-green-50 text-green-700 border-green-200";
      case 'partial':
        return "bg-amber-50 text-amber-700 border-amber-200";
      case 'missing':
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  // Get icon based on status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'correct':
        return <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />;
      case 'partial':
        return <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />;
      case 'missing':
        return <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />;
      default:
        return <HelpCircle className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />;
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-blue-500" />
          Summary Validation Tool
        </CardTitle>
        <CardDescription>
          Test your summary's completeness by generating questions from the original text
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!validationResults ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-6">
              This tool will generate questions from your original document and check 
              if the summary contains enough information to answer them.
            </p>

            <Button 
              onClick={validateSummary} 
              disabled={isValidating || !file || !summary}
              className="w-full"
            >
              {isValidating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Analyzing Document Content...
                </>
              ) : (
                'Validate Summary Completeness'
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Score Overview */}
            <div className="flex flex-col items-center text-center p-4 border rounded-lg bg-muted/30">
              <div className="text-4xl font-bold mb-2">
                {validationResults.overallScore}%
              </div>
              <p className="text-sm text-muted-foreground">
                Overall Completeness Score
              </p>
              
              {stats && (
                <div className="w-full mt-4">
                  <div className="flex justify-between mb-1 text-xs">
                    <span className="text-green-700">Complete ({stats.correctPercent}%)</span>
                    <span className="text-amber-700">Partial ({stats.partialPercent}%)</span>
                    <span className="text-red-700">Missing ({stats.missingPercent}%)</span>
                  </div>
                  <div className="w-full h-2 flex rounded-full overflow-hidden">
                    <div 
                      className="bg-green-500 h-full" 
                      style={{width: `${stats.correctPercent}%`}}
                    />
                    <div 
                      className="bg-amber-500 h-full" 
                      style={{width: `${stats.partialPercent}%`}}
                    />
                    <div 
                      className="bg-red-500 h-full" 
                      style={{width: `${stats.missingPercent}%`}}
                    />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="flex flex-col items-center">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 mb-1">
                        {validationResults.answeredCorrectly}
                      </Badge>
                      <span className="text-xs text-muted-foreground">Complete</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 mb-1">
                        {validationResults.partiallyAnswered}
                      </Badge>
                      <span className="text-xs text-muted-foreground">Partial</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 mb-1">
                        {validationResults.unanswered}
                      </Badge>
                      <span className="text-xs text-muted-foreground">Missing</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Questions By Category */}
            <div className="space-y-4">
              <h3 className="text-base font-medium flex items-center gap-2">
                <BarChart4 className="h-4 w-4 text-blue-500" />
                Questions By Category
              </h3>
              <div className="space-y-2">
                {Object.entries(questionsByType).map(([type, questions]) => {
                  const typeQuestions = questions as ValidationQuestion[];
                  const correct = typeQuestions.filter(q => q.status === 'correct').length;
                  const total = typeQuestions.length;
                  const percentage = Math.round((correct / total) * 100);
                  
                  return (
                    <div key={type} className="p-2 border rounded">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium capitalize">{type} Questions</span>
                        <Badge variant="outline" className={getStatusColor(percentage > 80 ? 'correct' : percentage > 50 ? 'partial' : 'missing')}>
                          {percentage}% Complete
                        </Badge>
                      </div>
                      <Progress value={percentage} className="h-1.5 bg-gray-100" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {correct} of {total} questions answered correctly
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Questions Results */}
            <Accordion type="single" collapsible defaultValue="validation-questions">
              <AccordionItem value="validation-questions">
                <AccordionTrigger className="text-base font-medium">
                  Test Questions ({validationResults.questionCount})
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 py-2">
                    {Object.entries(questionsByType).map(([type, questions]) => (
                      <div key={type} className="space-y-3">
                        <h4 className="text-sm font-medium capitalize">{type} Questions</h4>
                        {(questions as ValidationQuestion[]).map((item, index) => (
                          <div key={index} className="border rounded-md p-3">
                            <div className="flex items-start gap-2">
                              {getStatusIcon(item.status)}
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-medium text-sm">{item.question}</p>
                                  {item.confidence !== undefined && (
                                    <Badge variant="outline" className="text-xs">
                                      {Math.round(item.confidence * 100)}% Confidence
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  From original: "{item.originalInfo}"
                                </p>
                                {item.status === 'partial' && item.note && (
                                  <p className="text-xs text-amber-600 mt-1">
                                    Note: {item.note}
                                  </p>
                                )}
                                {item.status === 'missing' && item.note && (
                                  <p className="text-xs text-red-600 mt-1">
                                    Note: {item.note}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Missing Concepts */}
            {validationResults.missingConcepts && validationResults.missingConcepts.length > 0 && (
              <Alert className="bg-amber-50 text-amber-800 border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-800" />
                <AlertTitle>Key Information Missing</AlertTitle>
                <AlertDescription>
                  <p className="mb-2">The following concepts from the original document may be missing or incomplete in your summary:</p>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {validationResults.missingConcepts.map((concept, index) => (
                      <li key={index}>{concept}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Summary Enhancement Section */}
            {missingCount > 0 && !enhancementResult && (
              <div className="mt-6 pt-4 border-t">
                <h3 className="text-base font-medium mb-3">Enhance Your Summary</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className="bg-amber-50 text-amber-700 border-amber-200"
                    >
                      {missingCount} question{missingCount !== 1 ? 's' : ''} can be improved
                    </Badge>
                  </div>
                  
                  <Button
                    onClick={enhanceSummary}
                    disabled={isEnhancing || missingCount === 0}
                    className="w-full"
                    variant="secondary"
                  >
                    {isEnhancing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enhancing Summary...
                      </>
                    ) : (
                      <>
                        <ArrowRightLeft className="mr-2 h-4 w-4" />
                        Add Missing Information ({missingCount} question{missingCount !== 1 ? 's' : ''})
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Enhancement Result */}
            {enhancementResult && (
              <div className="mt-4 pt-4 border-t">
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle>Summary Enhanced</AlertTitle>
                  <AlertDescription>
                    {enhancementResult.message || `Successfully added missing information for ${enhancementResult.improvedQuestions} question${enhancementResult.improvedQuestions !== 1 ? 's' : ''}.`}
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {validationResults && (
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => {
            setValidationResults(null);
            setEnhancementResult(null);
          }}>
            Reset Validation
          </Button>
          <Button 
            variant={validationResults.overallScore > 80 ? "default" : "secondary"}
            className={validationResults.overallScore > 80 ? "bg-green-600 hover:bg-green-700" : ""}
          >
            {validationResults.overallScore > 80 ? "Summary Passes Validation" : "Improve Summary"}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default SummaryValidator;