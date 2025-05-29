// src/components/ApiError.tsx
import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface ApiErrorProps {
  title?: string;
  message: string;
  suggestion?: string;
  onRetry?: () => void;
  showRetry?: boolean;
}

/**
 * A reusable error display component for API errors
 */
export function ApiError({
  title = 'Error',
  message,
  suggestion,
  onRetry,
  showRetry = true
}: ApiErrorProps) {
  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-col">
        <span>{message}</span>
        
        {suggestion && (
          <span className="mt-1 text-sm opacity-90">{suggestion}</span>
        )}
        
        {showRetry && onRetry && (
          <div className="mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRetry} 
              className="bg-destructive/10 hover:bg-destructive/20 border-destructive/20"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-2" />
              Retry
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}

export default ApiError;