'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  FileText, 
  GraduationCap, 
  BarChart3,
  RefreshCw,
  Wifi,
  WifiOff,
  ChevronRight,
  Award,
  Flame,
  Lightbulb
} from 'lucide-react';

import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardFooter,
  CardDescription
} from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from "@/hooks/use-toast";
import WelcomeCard from '@/components/WelcomeCard';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import RecentDocuments from '@/components/RecentDocuments'; 
import QuizDashboard from '@/components/quiz/QuizDashboard';  // Import QuizDashboard component
import { DarkModeProvider } from '@/components/common/DarkModeProvider';

// Type for dashboard data from API with proper null handling
interface DashboardData {
  documentCount: number | null;
  quizzesTaken: number | null;
  averageScore: number | null;
  // New quiz-related stats
  preparationQuizzes: number | null;
  examQuizzes: number | null;
  totalStudyTime: string | null;
  quizzesThisWeek: number | null;
  weakAreas: { topic: string; score: number }[] | null;
}

// Type for document data
interface Document {
  id: string;
  title: string;
  createdAt: string;
  thumbnailUrl?: string;
  type: 'pdf' | 'doc' | 'txt' | 'other';
}

// Type for quiz data
interface QuizData {
  id: number;
  title: string;
  documentTitle: string;
  mode: 'preparation' | 'exam';
  date: string;
  score: number;
  questionCount?: number;
  timeSpent?: string;
  progress?: number;
  chunksCompleted?: number;
  totalChunks?: number;
}

// Online/offline status indicator component
const ConnectionStatus = ({ isOnline }: { isOnline: boolean }) => (
  <div className={`flex items-center gap-1 text-sm ${isOnline ? 'text-green-500' : 'text-red-500'} transition-colors duration-300`}>
    {isOnline ? (
      <>
        <Wifi className="h-4 w-4" />
        <span className="sr-only">Online</span>
      </>
    ) : (
      <>
        <WifiOff className="h-4 w-4" />
        <span>Offline Mode</span>
      </>
    )}
  </div>
);

// Achievement badge component
const AchievementBadge = ({ icon: Icon, label }: { icon: React.ElementType; label: string }) => (
  <div className="flex flex-col items-center bg-blue-50 dark:bg-blue-900 p-2 rounded-lg">
    <div className="bg-white dark:bg-blue-800 p-2 rounded-full shadow-sm mb-1">
      <Icon className="h-4 w-4 text-blue-500" />
    </div>
    <span className="text-xs font-medium text-gray-800 dark:text-gray-200">{label}</span>
  </div>
);

// Dashboard tips component
const DashboardTip = () => {
  const tips = [
    {
      icon: Lightbulb,
      title: "Create Summaries",
      content: "Upload your documents and let AI generate concise summaries to help you study effectively."
    },
    {
      icon: BarChart3,
      title: "Track Progress",
      content: "Visit the Progress page to see detailed analytics of your learning journey."
    },
    {
      icon: Calendar,
      title: "Set Reminders",
      content: "Don't forget to set study reminders in your Study Plan to maintain consistency."
    },
    {
      icon: GraduationCap,
      title: "Take Quizzes",
      content: "Use Preparation Mode to learn section by section, or Exam Simulation to test your knowledge."
    }
  ];
  
  const [currentTip, setCurrentTip] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % tips.length);
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);
  
  const tip = tips[currentTip];
  
  return (
    <div className="bg-blue-50 dark:bg-blue-900 p-3 rounded-lg flex items-start">
      <div className="bg-white dark:bg-blue-800 p-2 rounded-full mr-3">
        <tip.icon className="h-4 w-4 text-blue-500" />
      </div>
      <div>
        <h4 className="font-medium text-sm text-gray-800 dark:text-gray-200">{tip.title}</h4>
        <p className="text-xs text-muted-foreground dark:text-gray-400 mt-1">{tip.content}</p>
      </div>
    </div>
  );
};

// Loading skeleton for card content
const CardSkeleton = () => (
  <div className="space-y-3">
    <Skeleton className="h-8 w-1/2" />
    <Skeleton className="h-20 w-full" />
    <Skeleton className="h-8 w-full" />
  </div>
);

const Dashboard = () => {
  const { toast } = useToast();
  const router = useRouter();
  
  // Initialize with null to properly handle the type
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [recentDocuments, setRecentDocuments] = useState<Document[] | null>(null);
  const [recentQuizzes, setRecentQuizzes] = useState<QuizData[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [quizLoading, setQuizLoading] = useState<boolean>(true);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [streakDays, setStreakDays] = useState(0);
  
  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "You're back online",
        description: "Syncing your latest data...",
        variant: "default"
      });
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "You're offline",
        description: "Some features may be limited",
        variant: "destructive"
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  // Helper to save data to localStorage (for offline support)
  const saveToLocalStorage = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify({
        data,
        timestamp: new Date().getTime()
      }));
    } catch (err) {
      console.error(`Failed to save ${key} to localStorage:`, err);
    }
  };

  // Helper to get data from localStorage with timestamp check
  const getFromLocalStorage = (key: string, maxAgeMs = 24 * 60 * 60 * 1000) => {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;
      
      const { data, timestamp } = JSON.parse(stored);
      const now = new Date().getTime();
      
      // Check if data is still valid (not older than maxAgeMs)
      if (now - timestamp > maxAgeMs) {
        localStorage.removeItem(key);
        return null;
      }
      
      return data;
    } catch (err) {
      console.error(`Failed to read ${key} from localStorage:`, err);
      return null;
    }
  };

  // Handle retry functionality with toast
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    toast({
      title: "Retrying",
      description: "Attempting to fetch data again...",
    });
  };

  // Fetch dashboard data and recent documents from API
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      
      if (!isOnline) {
        // Try to load from cache if offline
        const cachedData = getFromLocalStorage('dashboard_data');
        const cachedDocuments = getFromLocalStorage('recent_documents');
        const cachedQuizzes = getFromLocalStorage('recent_quizzes');
        
        if (cachedData) {
          setDashboardData(cachedData);
        }
        
        if (cachedDocuments) {
          setRecentDocuments(cachedDocuments);
        }
        
        if (cachedQuizzes) {
          setRecentQuizzes(cachedQuizzes);
        }
        
        if (!cachedData && !cachedDocuments && !cachedQuizzes) {
          toast({
            title: "No cached data available",
            description: "Please connect to the internet to load your data",
            variant: "destructive",
          });
        }
        
        setLoading(false);
        setQuizLoading(false);
        return;
      }
      
      try {
        // Using the API route from your app structure
        const response = await fetch('/api/dashboard');
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          // Use proper type checking to ensure values match the DashboardData interface
          const data: DashboardData = {
            documentCount: result.data.documentCount !== undefined ? result.data.documentCount : null,
            quizzesTaken: result.data.quizzesTaken !== undefined ? result.data.quizzesTaken : null,
            averageScore: result.data.averageScore !== undefined ? result.data.averageScore : null,
            // New fields with defaults
            preparationQuizzes: result.data.preparationQuizzes !== undefined ? result.data.preparationQuizzes : null,
            examQuizzes: result.data.examQuizzes !== undefined ? result.data.examQuizzes : null,
            totalStudyTime: result.data.totalStudyTime !== undefined ? result.data.totalStudyTime : null,
            quizzesThisWeek: result.data.quizzesThisWeek !== undefined ? result.data.quizzesThisWeek : null,
            weakAreas: result.data.weakAreas !== undefined ? result.data.weakAreas : null
          };
          
          setDashboardData(data);
          saveToLocalStorage('dashboard_data', data);
          
          // For demonstration purposes, we'll create some mock documents
          // In a real application, you would fetch these from an API endpoint
          if (data.documentCount && data.documentCount > 0) {
            // Mock recent documents data - replace with actual API call in production
            const mockDocuments: Document[] = [
              {
                id: 'doc-1',
                title: 'Physics Study Notes',
                createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
                type: 'pdf'
              },
              {
                id: 'doc-2',
                title: 'Biology Exam Prep',
                createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
                type: 'doc'
              },
              {
                id: 'doc-3',
                title: 'Math Formulas',
                createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
                type: 'txt'
              }
            ];
            
            setRecentDocuments(mockDocuments);
            saveToLocalStorage('recent_documents', mockDocuments);
          } else {
            setRecentDocuments([]);
          }
        } else {
          throw new Error(result.message || 'Failed to fetch dashboard data');
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        
        // Show error as toast instead of alert banner
        toast({
          title: "Failed to load data",
          description: "Please try again later",
          variant: "destructive",
          action: (
            <Button variant="outline" size="sm" onClick={handleRetry}>
              Retry
            </Button>
          ),
        });
        
        // Try to load from cache as fallback
        const cachedData = getFromLocalStorage('dashboard_data');
        const cachedDocuments = getFromLocalStorage('recent_documents');
        
        if (cachedData) {
          setDashboardData(cachedData);
        }
        
        if (cachedDocuments) {
          setRecentDocuments(cachedDocuments);
        }
        
        if (cachedData || cachedDocuments) {
          toast({
            title: "Using cached data",
            description: "Showing your last saved information",
            variant: "default"
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [toast, retryCount, isOnline]);
  
  // Fetch quiz data
  useEffect(() => {
    const fetchQuizData = async () => {
      setQuizLoading(true);
      
      if (!isOnline) {
        // Try to load from cache if offline
        const cachedQuizzes = getFromLocalStorage('recent_quizzes');
        
        if (cachedQuizzes) {
          setRecentQuizzes(cachedQuizzes);
        }
        
        setQuizLoading(false);
        return;
      }
      
      try {
        // Using the API route from your app structure
        const response = await fetch('/api/quizzes');
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const quizzesData = await response.json();
        
        // Convert the API data to our QuizData type
        const formattedQuizzes: QuizData[] = quizzesData.map((quiz: any) => ({
          id: quiz.id,
          title: quiz.title || 'Untitled Quiz',
          documentTitle: quiz.documentTitle || 'Unknown Document',
          mode: quiz.mode || 'exam',
          date: quiz.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          score: quiz.score || 0,
          ...(quiz.mode === 'exam' ? {
            questionCount: quiz.questionCount || 0,
            timeSpent: quiz.timeTaken || '00:00'
          } : {
            progress: (quiz.completedSections / quiz.totalSections) * 100 || 0,
            chunksCompleted: quiz.completedSections || 0,
            totalChunks: quiz.totalSections || 0
          })
        }));
        
        setRecentQuizzes(formattedQuizzes);
        saveToLocalStorage('recent_quizzes', formattedQuizzes);
        
      } catch (error) {
        console.error("Error fetching quiz data:", error);
        
        // Try to load from cache as fallback
        const cachedQuizzes = getFromLocalStorage('recent_quizzes');
        
        if (cachedQuizzes) {
          setRecentQuizzes(cachedQuizzes);
          toast({
            title: "Using cached quiz data",
            description: "Showing your last saved quizzes",
            variant: "default"
          });
        } else {
          // If no cached data and API failed, use mock data as fallback
          const mockQuizzes: QuizData[] = [
            {
              id: 1,
              title: 'Cell Biology Exam',
              documentTitle: 'Cell Structure & Function.pdf',
              mode: 'exam',
              date: 'May 14, 2025',
              score: 85,
              questionCount: 20,
              timeSpent: '18:45'
            },
            {
              id: 2,
              title: 'Psychology Concepts',
              documentTitle: 'Cognitive Psychology Exam Notes',
              mode: 'preparation',
              date: 'May 12, 2025',
              progress: 100,
              chunksCompleted: 8,
              totalChunks: 8,
              score: 72
            },
            {
              id: 3,
              title: 'Data Science Preparation',
              documentTitle: 'Statistics for Data Science Report.docx',
              mode: 'preparation',
              date: 'May 10, 2025',
              progress: 60,
              chunksCompleted: 3,
              totalChunks: 5,
              score: 88
            }
          ];
          
          setRecentQuizzes(mockQuizzes);
          saveToLocalStorage('recent_quizzes', mockQuizzes);
        }
      } finally {
        setQuizLoading(false);
      }
    };
    
    fetchQuizData();
  }, [toast, retryCount, isOnline]);

  const refreshData = () => {
    if (!isOnline) {
      toast({
        title: "You're offline",
        description: "Please check your connection and try again",
        variant: "destructive"
      });
      return;
    }
    
    setRetryCount(prev => prev + 1);
    toast({
      title: "Refreshing data",
      description: "Getting the latest information...",
    });
  };

  const navigateTo = (path: string) => {
    router.push(path);
  };
  
  const handleUploadClick = () => {
    router.push('/documents?upload=true');
  };
  
  const handleQuizClick = () => {
    router.push('/quizzes');
  };

  // Calculate days since last Sunday to show weekly progress
  const getDaysSinceSunday = () => {
    const today = new Date();
    const day = today.getDay(); // 0 is Sunday
    return day;
  };

  // Helper functions for safe access to potentially null values
  const getDocumentCount = (): number => {
    return dashboardData?.documentCount ?? 0;
  };
  
  const getQuizCount = (): number => {
    return dashboardData?.quizzesTaken ?? 0;
  };
  
  const getAverageScore = (): number => {
    return dashboardData?.averageScore ?? 0;
  };
  
  // Helper to check if there are any documents
  const hasDocuments = (): boolean => {
    return !!dashboardData?.documentCount && dashboardData.documentCount > 0;
  };
  
  // Helper to check if there are any quizzes
  const hasQuizzes = (): boolean => {
    return !!dashboardData?.quizzesTaken && dashboardData.quizzesTaken > 0;
  };
  
  // Get quiz stats object for QuizDashboard component
  const getQuizStats = () => {
    return {
      totalQuizzes: dashboardData?.quizzesTaken ?? 0,
      averageScore: dashboardData?.averageScore ?? 0,
      totalStudyTime: dashboardData?.totalStudyTime ?? '0h',
      quizzesThisWeek: dashboardData?.quizzesThisWeek ?? 0,
      weakAreas: dashboardData?.weakAreas ?? []
    };
  };

  return (
    <DarkModeProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <div className="container mx-auto px-4 pb-20 pt-4 md:pb-10">
          {/* Top navigation bar with connection status and quick actions */}
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold sr-only">Dashboard</h1>
            <div className="flex space-x-2">
              <ConnectionStatus isOnline={isOnline} />
            </div>
          </div>
          
          {/* Welcome Card */}
          <WelcomeCard />
          
          {/* Dashboard Tip */}
          <div className="mb-4">
            <DashboardTip />
          </div>

          {/* Learning Progress */}
          <div className="mb-4">
            <Card className="border-blue-100 dark:border-blue-800 shadow-sm bg-white dark:bg-gray-800">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base font-semibold flex items-center text-gray-900 dark:text-gray-100">
                    <BarChart3 className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                    <span>Weekly Progress</span>
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={refreshData}
                    disabled={loading || !isOnline}
                    aria-label="Refresh data"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                {loading ? (
                  <CardSkeleton />
                ) : (
                  <>
                    {/* Simple weekly activity timeline */}
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">This week's activity</span>
                        <span className="text-xs text-muted-foreground dark:text-gray-400">Day {getDaysSinceSunday() + 1}/7</span>
                      </div>
                      <div className="flex gap-1">
                        {Array.from({ length: 7 }).map((_, i) => {
                          const isToday = i === getDaysSinceSunday();
                          const isPast = i < getDaysSinceSunday();
                          return (
                            <div 
                              key={i} 
                              className={`flex-1 h-2 rounded-full ${
                                isToday 
                                  ? 'bg-blue-500' 
                                  : isPast 
                                    ? 'bg-blue-200 dark:bg-blue-700' 
                                    : 'bg-gray-100 dark:bg-gray-700'
                              }`}
                            />
                          );
                        })}
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-muted-foreground dark:text-gray-400">Sun</span>
                        <span className="text-xs text-muted-foreground dark:text-gray-400">Sat</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                          {getDocumentCount()}
                        </div>
                        <div className="text-xs text-muted-foreground dark:text-gray-400 mt-1">Documents</div>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                          {getQuizCount()}
                        </div>
                        <div className="text-xs text-muted-foreground dark:text-gray-400 mt-1">Quizzes</div>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="text-xl font-bold text-green-600 dark:text-green-400">
                          {getAverageScore()}%
                        </div>
                        <div className="text-xs text-muted-foreground dark:text-gray-400 mt-1">Avg. Score</div>
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-4 text-sm flex items-center justify-center border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => navigateTo('/progress')}
                    >
                      <span>View Detailed Progress</span>
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Main Dashboard Content */}
          <div className="grid grid-cols-1 gap-6">
            {/* Recent Documents Card */}
            <RecentDocuments 
              documents={recentDocuments} 
              loading={loading} 
              onUploadClick={handleUploadClick} 
            />
            
            {/* Quiz Dashboard */}
            {!quizLoading && recentQuizzes && (
              <QuizDashboard 
                recentQuizzes={recentQuizzes} 
                stats={getQuizStats()}
                isLoading={quizLoading}
              />
            )}
            
            {/* Study Plan Card */}
            <Card className="shadow-sm border-green-100 dark:border-green-800 overflow-hidden bg-white dark:bg-gray-800">
              <CardHeader className="bg-green-50 dark:bg-green-900 pb-2 border-b border-green-100 dark:border-green-800">
                <CardTitle className="text-base font-semibold flex items-center text-gray-900 dark:text-gray-100">
                  <Calendar className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
                  Study Plan
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground dark:text-gray-400">
                  Plan your study sessions and track your progress
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex flex-col items-center justify-center text-center">
                  <Button 
                    size="lg"
                    className="bg-green-500 hover:bg-green-600 text-white dark:bg-green-600 dark:hover:bg-green-700" 
                    onClick={() => navigateTo('/studyplan')}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    View Study Plan
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Achievements section - only shown when there's at least one achievement */}
          {hasDocuments() || hasQuizzes() ? (
            <Card className="mt-4 shadow-sm border-amber-100 dark:border-amber-800 overflow-hidden bg-white dark:bg-gray-800">
              <CardHeader className="bg-amber-50 dark:bg-amber-900 pb-2 border-b border-amber-100 dark:border-amber-800">
                <CardTitle className="text-base font-semibold flex items-center text-gray-900 dark:text-gray-100">
                  <Award className="h-4 w-4 mr-2 text-amber-600 dark:text-amber-400" />
                  Achievements
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-4 gap-2">
                  {hasDocuments() && (
                    <AchievementBadge icon={FileText} label="First Document" />
                  )}
                  {hasQuizzes() && (
                    <AchievementBadge icon={GraduationCap} label="First Quiz" />
                  )}
                  {(getAverageScore()) >= 80 && (
                    <AchievementBadge icon={Award} label="High Scorer" />
                  )}
                  {streakDays > 0 && (
                    <AchievementBadge icon={Flame} label={`${streakDays} Day Streak`} />
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </DarkModeProvider>
  );
};

export default Dashboard;