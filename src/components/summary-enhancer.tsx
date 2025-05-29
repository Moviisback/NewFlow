// File: src/components/summary-enhancer.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, ArrowRightLeft, Check } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface SummaryEnhancerProps {
  summary: string;
  validationResult: any;
  originalText: string;
  onEnhanced: (enhancedSummary: string) => void;
}

// Component to enhance summaries by adding missing information
const SummaryEnhancer: React.FC<SummaryEnhancerProps> = ({
  summary,
  validationResult,
  originalText,
  onEnhanced
}) => {
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [enhancementResult, setEnhancementResult] = useState<{
    improvedQuestions: number;
    message?: string;
  } | null>(null);

  // Count missing questions
  const missingQuestions = validationResult?.questions?.filter(
    (q: any) => q.status === 'missing' || q.status === 'partial'
  ) || [];
  
  const missingCount = missingQuestions.length;
  const hasImprovements = missingCount > 0;

  // Function to enhance the summary
  const enhanceSummary = async () => {
    if (!validationResult || !summary || !originalText) {
      setError('Missing data required for enhancement.');
      return;
    }

    setIsEnhancing(true);
    setError('');
    setEnhancementResult(null);

    try {
      const response = await fetch('/api/enhance-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary,
          validationResult,
          originalText
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Enhancement failed');
      }

      const data = await response.json();
      
      if (data.enhancedSummary) {
        onEnhanced(data.enhancedSummary);
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

  return (
    <div className="space-y-4">
      {/* Status Display */}
      {validationResult && (
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={hasImprovements 
              ? "bg-amber-50 text-amber-700 border-amber-200" 
              : "bg-green-50 text-green-700 border-green-200"
            }
          >
            {hasImprovements 
              ? `${missingCount} question${missingCount !== 1 ? 's' : ''} can be improved` 
              : "All questions covered"
            }
          </Badge>
          
          {enhancementResult && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
              <Check className="h-3 w-3" />
              Summary enhanced
            </Badge>
          )}
        </div>
      )}
      
      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Improvement message */}
      {enhancementResult?.message && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Note</AlertTitle>
          <AlertDescription>{enhancementResult.message}</AlertDescription>
        </Alert>
      )}
      
      {/* Enhancement Button */}
      {hasImprovements && !enhancementResult && (
        <Button
          onClick={enhanceSummary}
          disabled={isEnhancing || !hasImprovements}
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
      )}
    </div>
  );
};

export default SummaryEnhancer;