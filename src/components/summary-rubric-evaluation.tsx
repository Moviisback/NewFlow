import React, { useState } from 'react';
import { Loader2, HelpCircle, AlertTriangle, Award, BarChart3, XCircle, CheckCircle, Info } from 'lucide-react';
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
import { Separator } from "@/components/ui/separator";
import { RubricScore, RubricCriterion, CriterionScore } from '../types/rubric';

// Define props for the component
interface SummaryRubricEvaluationProps {
  file: File | null;
  summary: string;
  onComplete?: (results: RubricScore) => void;
}

// Component that evaluates a summary against educational rubric
const SummaryRubricEvaluation: React.FC<SummaryRubricEvaluationProps> = ({
  file,
  summary,
  onComplete
}) => {
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evaluationResults, setEvaluationResults] = useState<RubricScore | null>(null);
  const [error, setError] = useState<string>('');

  // Function to evaluate summary against rubric
  const evaluateSummary = async () => {
    if (!file || !summary) {
      setError('Both file and summary are required for evaluation.');
      return;
    }

    setIsEvaluating(true);
    setError('');
    setEvaluationResults(null);

    try {
      // Create a FormData object to send the file and summary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('summary', summary);
      
      // Call the evaluation API
      const response = await fetch('/api/evaluate-summary-rubric', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Evaluation failed');
      }

      const data = await response.json() as RubricScore;
      setEvaluationResults(data);
      
      if (onComplete) onComplete(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'An error occurred during evaluation.');
      } else {
        setError('An unknown error occurred during evaluation.');
      }
    } finally {
      setIsEvaluating(false);
    }
  };

  // Get badge color based on score
  const getScoreColor = (score: number) => {
    if (score >= 4.5) return "bg-green-50 text-green-700 border-green-200";
    if (score >= 3.5) return "bg-blue-50 text-blue-700 border-blue-200";
    if (score >= 2.5) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-red-50 text-red-700 border-red-200";
  };

  // Get icon based on score
  const getScoreIcon = (score: number) => {
    if (score >= 4.5) return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (score >= 3.5) return <Info className="h-5 w-5 text-blue-500" />;
    if (score >= 2.5) return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  // Get description for score
  const getScoreDescription = (score: number) => {
    if (score >= 4.5) return "Excellent";
    if (score >= 3.5) return "Good";
    if (score >= 2.5) return "Satisfactory";
    if (score >= 1.5) return "Needs Improvement";
    return "Poor";
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Award className="h-5 w-5 text-blue-500" />
          Educational Rubric Evaluation
        </CardTitle>
        <CardDescription>
          Evaluate your summary against a comprehensive educational rubric covering 7 key criteria
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

        {!evaluationResults ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-6">
              This tool will evaluate your summary against a comprehensive educational rubric,
              providing scores and feedback across 7 key criteria for effective study materials.
            </p>

            <Button 
              onClick={evaluateSummary} 
              disabled={isEvaluating || !file || !summary}
              className="w-full"
            >
              {isEvaluating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Analyzing Summary Quality...
                </>
              ) : (
                'Evaluate Summary Against Rubric'
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overall Score */}
            <div className="flex flex-col items-center text-center p-4 border rounded-lg bg-muted/30">
              <div className="text-4xl font-bold mb-2">
                {evaluationResults.overallScore.toFixed(1)}/5
              </div>
              <p className="text-muted-foreground text-sm mb-1">
                Overall Rubric Score
              </p>
              <Badge 
                variant="outline" 
                className={`mt-2 ${getScoreColor(evaluationResults.overallScore)}`}
              >
                {getScoreDescription(evaluationResults.overallScore)}
              </Badge>
            </div>
            
            {/* Criteria Scores */}
            <div className="space-y-4">
              <h3 className="text-base font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                Detailed Criteria Scores
              </h3>
              
              {Object.entries(evaluationResults.criteria).map(([key, criterion]) => (
                <div key={key} className="border rounded-md p-3">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      {getScoreIcon(criterion.score)}
                      <h4 className="font-medium">{criterion.name}</h4>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={getScoreColor(criterion.score)}
                    >
                      {criterion.score}/5
                    </Badge>
                  </div>
                  
                  <div className="mb-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span>Poor</span>
                      <span>Excellent</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full ${
                          criterion.score >= 4.5 
                            ? "bg-green-500" 
                            : criterion.score >= 3.5
                              ? "bg-blue-500"
                              : criterion.score >= 2.5
                                ? "bg-amber-500"
                                : "bg-red-500"
                        }`} 
                        style={{width: `${(criterion.score / 5) * 100}%`}}
                      />
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-2">{criterion.justification}</p>
                  
                  {criterion.suggestedImprovements && (
                    <div className="bg-amber-50 text-amber-800 p-2 rounded-md text-sm mt-2">
                      <span className="font-semibold">Suggested Improvement: </span>
                      {criterion.suggestedImprovements}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Strengths and Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-md p-3 bg-green-50/50">
                <h4 className="font-medium text-green-700 mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Strengths
                </h4>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {evaluationResults.strengths.map((strength, index) => (
                    <li key={index}>{strength}</li>
                  ))}
                </ul>
              </div>
              
              <div className="border rounded-md p-3 bg-amber-50/50">
                <h4 className="font-medium text-amber-700 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Areas for Improvement
                </h4>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {evaluationResults.weaknesses.map((weakness, index) => (
                    <li key={index}>{weakness}</li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* Overall Feedback */}
            <div className="border rounded-md p-3 bg-gray-50">
              <h4 className="font-medium mb-2">Overall Assessment</h4>
              <p className="text-sm">{evaluationResults.overallFeedback}</p>
            </div>
          </div>
        )}
      </CardContent>

      {evaluationResults && (
        <CardFooter className="flex justify-between flex-wrap gap-2">
          <Button variant="outline" onClick={() => setEvaluationResults(null)}>
            Reset Evaluation
          </Button>
          <Button 
            variant={evaluationResults.overallScore >= 4 ? "default" : "secondary"}
            className={evaluationResults.overallScore >= 4 ? "bg-green-600 hover:bg-green-700" : ""}
            onClick={() => window.print()}
          >
            {evaluationResults.overallScore >= 4 ? "Print Evaluation Report" : "Improve Summary & Re-evaluate"}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default SummaryRubricEvaluation;