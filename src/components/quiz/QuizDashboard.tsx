'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  GraduationCap, 
  Clock, 
  BookOpen, 
  ChevronRight, 
  BarChart3, 
  CheckCircle,
  AlertTriangle,
  Target,
  Brain,
  CalendarClock,
  RotateCcw
} from 'lucide-react';
import Link from 'next/link';

interface QuizDashboardProps {
  recentQuizzes: any[];
  stats: {
    totalQuizzes: number;
    averageScore: number;
    totalStudyTime: string;
    quizzesThisWeek: number;
    weakAreas: { topic: string; score: number }[];
  };
  isLoading?: boolean;
}

const QuizDashboard: React.FC<QuizDashboardProps> = ({ 
  recentQuizzes = [], 
  stats,
  isLoading = false 
}) => {
  // If loading, show skeleton UI
  if (isLoading) {
    return (
      <div className="grid gap-4">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-24 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
          <div className="h-24 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
          <div className="h-24 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
        </div>
        <div className="h-64 bg-gray-200 dark:bg-gray-700 animate-pulse rounded mt-4"></div>
      </div>
    );
  }
  
  return (
    <div className="grid gap-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Quiz Performance</h2>
        <Button variant="outline" asChild>
          <Link href="/quizzes">
            <GraduationCap className="h-4 w-4 mr-2" />
            View All Quizzes
          </Link>
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Quizzes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.totalQuizzes}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              <span className="text-green-600 dark:text-green-400 font-medium">+{stats.quizzesThisWeek}</span> this week
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">Average Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.averageScore}%</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              <span className={`${
                stats.averageScore >= 70 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"
              } font-medium`}>
                {stats.averageScore >= 70 ? "Good" : "Needs improvement"}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">Study Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.totalStudyTime}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Total time spent on quizzes
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-sm border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="text-base font-medium text-gray-900 dark:text-gray-100">Recent Quizzes</CardTitle>
            <CardDescription className="text-gray-500 dark:text-gray-400">Your most recent quiz activity</CardDescription>
          </CardHeader>
          <CardContent>
            {recentQuizzes.length === 0 ? (
              <div className="text-center py-6">
                <GraduationCap className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-gray-500 dark:text-gray-400">No quizzes completed yet</p>
                <Button className="mt-4" asChild>
                  <Link href="/quizzes">Start a Quiz</Link>
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-[260px]">
                <div className="space-y-4">
                  {recentQuizzes.map((quiz, index) => (
                    <Card key={index} className="overflow-hidden bg-white dark:bg-gray-800 shadow-sm hover:shadow transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-gray-100">{quiz.title}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{quiz.documentTitle}</p>
                          </div>
                          <Badge 
                            variant="outline"
                            className={`${
                              quiz.mode === 'exam' 
                                ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' 
                                : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                            }`}
                          >
                            {quiz.mode === 'exam' ? (
                              <Target className="h-3 w-3 mr-1" />
                            ) : (
                              <Brain className="h-3 w-3 mr-1" />
                            )}
                            <span>{quiz.mode === 'exam' ? 'Exam' : 'Prep'}</span>
                          </Badge>
                        </div>
                        
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-3">
                          <CalendarClock className="h-3 w-3 mr-1" />
                          <span>{quiz.date}</span>
                        </div>
                        
                        {quiz.mode === 'exam' ? (
                          <div className="grid grid-cols-3 gap-2 mb-4">
                            <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded text-center">
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Score</div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">{quiz.score}%</div>
                            </div>
                            <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded text-center">
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Questions</div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">{quiz.questionCount}</div>
                            </div>
                            <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded text-center">
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Time</div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">{quiz.timeSpent}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="mb-4">
                            <div className="flex justify-between items-center mb-1">
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                Progress (Sections {quiz.chunksCompleted}/{quiz.totalChunks})
                              </div>
                              <div className="text-xs font-medium text-gray-900 dark:text-gray-100">{quiz.progress}%</div>
                            </div>
                            <Progress value={quiz.progress} className="h-2 mb-2" />
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Score on attempted: <span className="font-medium text-gray-900 dark:text-gray-100">{quiz.score}%</span>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1">
                            <BarChart3 className="h-3 w-3 mr-1" />
                            View Results
                          </Button>
                          
                          {quiz.mode === 'preparation' && quiz.progress < 100 && (
                            <Button variant="default" size="sm" className="flex-1">
                              <ChevronRight className="h-3 w-3 mr-1" />
                              Continue
                            </Button>
                          )}
                          
                          {(quiz.mode !== 'preparation' || quiz.progress >= 100) && (
                            <Button variant="outline" size="sm" className="flex-1">
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Retry
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="text-base font-medium text-gray-900 dark:text-gray-100">Improvement Areas</CardTitle>
            <CardDescription className="text-gray-500 dark:text-gray-400">Topics that need more focus</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.weakAreas.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle className="h-10 w-10 mx-auto text-green-500 dark:text-green-400 mb-2" />
                <p className="text-green-600 dark:text-green-400 font-medium">All topics on track!</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Keep up the good work</p>
              </div>
            ) : (
              <ScrollArea className="h-[260px]">
                <div className="space-y-3">
                  {stats.weakAreas.map((area, index) => (
                    <div key={index} className="p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-md">
                      <div className="flex items-start">
                        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mr-2 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-amber-800 dark:text-amber-300">{area.topic}</p>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-xs text-amber-700 dark:text-amber-400">Current score: {area.score}%</span>
                            <Badge variant="outline" className="bg-amber-100 dark:bg-amber-800 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700">
                              Needs Work
                            </Badge>
                          </div>
                          <div className="mt-2">
                            <div className="w-full bg-amber-200 dark:bg-amber-800 rounded-full h-1.5">
                              <div 
                                className="bg-amber-500 dark:bg-amber-400 h-1.5 rounded-full" 
                                style={{ width: `${area.score}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QuizDashboard;