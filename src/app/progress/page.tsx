'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'; // Fixed: correct import for App Router
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RedoIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

// Placeholder Data (Replace with actual data fetching)
const hasData = false; // Set to true to simulate data
const focusArea = hasData ? "Neural Networks" : "";
const missedQuestions = hasData ? 3 : 0;
const totalQuestions = hasData ? 5 : 0;
const mastery = hasData ? 60 : 0;
const notes = hasData ? "AI Notes.pdf" : "";
const pages = hasData ? "8-12" : "";
const topMistakeQuestion = hasData ? "What is overfitting?" : "";
const userAnswer = hasData ? "noise" : "";
const correctAnswer = hasData ? "Regularization reduces overfitting." : "";

export default function ProgressPage() {
  const router = useRouter();
  const { toast } = useToast();

  const progressBarStyle = {
    width: `${mastery}%`,
    background: `linear-gradient(90deg, #3b82f6 ${mastery}%, #e5e7eb ${mastery}%)`,
    borderRadius: "0.5rem",
  };

  useEffect(() => {
    if (hasData) {
      toast({
        title: "Progress Updated!",
        description: "Your learning journey continues...",
      });
    }
  }, [hasData, toast]);

  return (
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6">📊 Progress</h1>
        <hr className="mb-6" />

        {!hasData ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-lg mb-4">🚀 <b>Start Learning!</b></p>
              <p className="text-muted-foreground mb-4">Progress will appear here after:</p>
              <ul className="list-disc list-inside mt-2 text-muted-foreground mb-4">
                <li>Taking quizzes 🧠</li>
                <li>Uploading notes 📄</li>
              </ul>

              <div className="space-x-2">
                <Button onClick={() => router.push('/quizzes')}>Take a Quiz</Button>
                <Button variant="outline" onClick={() => router.push('/documents')}>Upload Notes</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea>
            <div className="space-y-6">
              {/* Focus Area */}
              {focusArea && (
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold mb-2">🎯 Focus Area: {focusArea}</h2>
                    <p className="text-muted-foreground">
                      Missed {missedQuestions}/{totalQuestions} questions
                      <span className="mx-2">·</span>
                      <span className="text-blue-500">{mastery}% Mastery</span>
                    </p>
                    {/* Progress Bar */}
                    <div className="mt-2 h-3 rounded-md bg-gray-200">
                      <div style={progressBarStyle} className="h-full rounded-md"></div>
                    </div>
                    <p className="mt-4">
                      ➔ Review pages {pages} in "{notes}"
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Top Mistake */}
              {topMistakeQuestion && (
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold mb-2">❌ Top Mistake</h2>
                    <p>
                      Q: {topMistakeQuestion} → You answered "{userAnswer}."
                    </p>
                    <p className="mt-2">
                      ✅ Fix: {correctAnswer}
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-4"
                      onClick={() => {
                        toast({
                          title: "Retrying Quiz",
                          description: "Good luck!",
                        });
                        // In a real app, navigate to a quiz retry page
                      }}
                    >
                      <RedoIcon className="mr-2 h-4 w-4" /> Retry Quiz
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        )}
      </div>
    );
}
