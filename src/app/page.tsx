'use client';

import {useState, useEffect} from 'react';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Icons} from '@/components/icons';
import {cn} from '@/lib/utils';
import {BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer} from 'recharts';
import {Badge} from '@/components/ui/badge';
import {useToast} from "@/hooks/use-toast";
import {RedoIcon, Search, Clock, FileText, Pencil, AlertTriangle, TrendingUp, TrendingDown, Wifi, WifiOff} from 'lucide-react';
import {Input} from '@/components/ui/input';
import {ScrollArea} from '@/components/ui/scroll-area';
import {Progress} from '@/components/ui/progress';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {Sheet, SheetContent, SheetTrigger} from "@/components/ui/sheet";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

// Types for our data
interface UserStats {
  documentCount: number;
  quizCount: number;
  averageScore: number;
  timeOnApp: number; // hours
  streak: number;
  previousPeriod?: {
    documentCount: number;
    quizCount: number;
    averageScore: number;
    timeOnApp: number;
    streak: number;
  };
}

interface Document {
  id: string;
  name: string;
  uploadDate: string;
  pages: number;
  status: string;
}

interface QuizData {
  name: string;
  score: number;
  previousScore?: number;
}

// Function to calculate percentage change
const calculateChange = (current: number, previous: number): number => {
  if (previous === 0) return 100; // If previous was 0, consider it 100% increase
  return Math.round(((current - previous) / previous) * 100);
};

// Indicator component for showing trends
const TrendIndicator = ({ current, previous, reverse = false }: { current: number, previous: number, reverse?: boolean }) => {
  if (previous === undefined || current === undefined) return null;
  
  const change = calculateChange(current, previous);
  const isPositive = reverse ? change < 0 : change > 0;
  const isNeutral = change === 0;

  return (
    <div className={`flex items-center ml-2 text-sm ${isPositive ? 'text-green-500' : isNeutral ? 'text-gray-400' : 'text-red-500'}`}>
      {isNeutral ? (
        <span>0%</span>
      ) : (
        <>
          {isPositive ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
          <span>{Math.abs(change)}%</span>
        </>
      )}
    </div>
  );
};

// Offline indicator component
const ConnectionStatus = ({ isOnline }: { isOnline: boolean }) => (
  <div className={`flex items-center gap-1 text-sm ${isOnline ? 'text-green-500' : 'text-red-500'}`}>
    {isOnline ? (
      <>
        <Wifi className="h-4 w-4" />
        <span className="sr-only">Online</span>
      </>
    ) : (
      <>
        <WifiOff className="h-4 w-4" />
        <span>Offline</span>
      </>
    )}
  </div>
);

export default function Dashboard() {
  const {toast} = useToast();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [quizData, setQuizData] = useState<QuizData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  
  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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

  // Retry mechanism for API calls
  const fetchWithRetry = async (url: string, options: RequestInit = {}, retries = 3, delay = 1000) => {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      if (retries <= 1) throw err;
      
      // Wait for the specified delay
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Retry with one less retry and increased delay (exponential backoff)
      return fetchWithRetry(url, options, retries - 1, delay * 2);
    }
  };
  
  // Fetch user statistics
  useEffect(() => {
    const fetchUserStats = async () => {
      setLoading(true);
      setError(null);
      
      if (!isOnline) {
        // Try to load from cache if offline
        const cachedStats = getFromLocalStorage('user_stats');
        if (cachedStats) {
          setStats(cachedStats);
          setLoading(false);
          return;
        }
      }
      
      try {
        const data = await fetchWithRetry('/api/user/stats');
        setStats(data);
        saveToLocalStorage('user_stats', data);
      } catch (error) {
        console.error("Error fetching user stats:", error);
        setError("Failed to load user statistics. Please try again later.");
        
        // Try to load from cache as fallback
        const cachedStats = getFromLocalStorage('user_stats');
        if (cachedStats) {
          setStats(cachedStats);
          toast({
            title: "Using cached data",
            description: "Showing your last saved statistics",
            variant: "default"
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserStats();
  }, [toast, retryCount, isOnline]);

  // Fetch documents
  useEffect(() => {
    const fetchDocuments = async () => {
      if (!isOnline) {
        // Try to load from cache if offline
        const cachedDocs = getFromLocalStorage('documents');
        if (cachedDocs) {
          setDocuments(cachedDocs);
          setFilteredDocuments(cachedDocs);
          return;
        }
      }
      
      try {
        const data = await fetchWithRetry('/api/documents');
        setDocuments(data);
        setFilteredDocuments(data);
        saveToLocalStorage('documents', data);
      } catch (error) {
        console.error("Error fetching documents:", error);
        
        // Try to load from cache as fallback
        const cachedDocs = getFromLocalStorage('documents');
        if (cachedDocs) {
          setDocuments(cachedDocs);
          setFilteredDocuments(cachedDocs);
        }
      }
    };

    if (!loading) {
      fetchDocuments();
    }
  }, [loading, isOnline]);

  // Fetch quiz data
  useEffect(() => {
    const fetchQuizData = async () => {
      if (!isOnline) {
        // Try to load from cache if offline
        const cachedQuizzes = getFromLocalStorage('quizzes');
        if (cachedQuizzes) {
          setQuizData(cachedQuizzes);
          return;
        }
      }
      
      try {
        const data = await fetchWithRetry('/api/quizzes');
        setQuizData(data);
        saveToLocalStorage('quizzes', data);
      } catch (error) {
        console.error("Error fetching quiz data:", error);
        
        // Try to load from cache as fallback
        const cachedQuizzes = getFromLocalStorage('quizzes');
        if (cachedQuizzes) {
          setQuizData(cachedQuizzes);
        }
      }
    };

    if (!loading) {
      fetchQuizData();
    }
  }, [loading, isOnline]);

  // Filter documents based on search
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredDocuments(documents);
    } else {
      const filtered = documents.filter(doc => 
        doc.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredDocuments(filtered);
    }
  }, [searchQuery, documents]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  const refreshData = async () => {
    setLoading(true);
    setError(null);
    
    if (!isOnline) {
      toast({
        title: "You're offline",
        description: "Please check your connection and try again",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }
    
    try {
      // Refresh all data
      const statsResponse = await fetchWithRetry('/api/user/stats');
      const documentsResponse = await fetchWithRetry('/api/documents');
      const quizzesResponse = await fetchWithRetry('/api/quizzes');
      
      setStats(statsResponse);
      setDocuments(documentsResponse);
      setFilteredDocuments(documentsResponse);
      setQuizData(quizzesResponse);
      
      // Update local cache
      saveToLocalStorage('user_stats', statsResponse);
      saveToLocalStorage('documents', documentsResponse);
      saveToLocalStorage('quizzes', quizzesResponse);
      
      toast({
        title: "Success",
        description: "Data refreshed successfully",
      });
    } catch (error) {
      console.error("Error refreshing data:", error);
      setError("Failed to refresh data. Please try again later.");
      toast({
        title: "Error",
        description: "Failed to refresh data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStatsCard = (title: string, value: number | string, icon: JSX.Element, previousValue?: number, reverseIndicator = false) => (
    <Card>
      <CardContent className="pt-6">
        <div className="text-2xl font-bold flex items-center gap-1">
          {loading ? <Skeleton className="h-8 w-12" /> : value}
          {!loading && previousValue !== undefined && (
            <TrendIndicator current={typeof value === 'string' ? parseFloat(value) : value} previous={previousValue} reverse={reverseIndicator} />
          )}
        </div>
        <p className="flex items-center gap-1">
          {title} {icon}
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-4">
      {/* Connection status and error banner */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <ConnectionStatus isOnline={isOnline} />
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="flex justify-between items-center">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={handleRetry}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>Your Progress</CardTitle>
            <CardDescription>
              🔥 {loading ? <Skeleton className="h-4 w-20 inline-block" /> : `${stats?.streak || 0}-day streak`}
              {!loading && stats?.previousPeriod && (
                <TrendIndicator 
                  current={stats?.streak || 0} 
                  previous={stats?.previousPeriod?.streak || 0} 
                />
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {renderStatsCard(
              "Documents Uploaded",
              stats?.documentCount || 0,
              <FileText className="h-4 w-4" />,
              stats?.previousPeriod?.documentCount
            )}

            {renderStatsCard(
              "Quizzes Taken",
              stats?.quizCount || 0,
              <Pencil className="h-4 w-4" />,
              stats?.previousPeriod?.quizCount
            )}

            {renderStatsCard(
              "Average Score",
              `${stats?.averageScore || 0}%`,
              <></>,
              stats?.previousPeriod?.averageScore
            )}

            {renderStatsCard(
              "Hours on App",
              stats?.timeOnApp || 0,
              <Clock className="h-5 w-5 text-muted-foreground" />,
              stats?.previousPeriod?.timeOnApp
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Documents Section */}
      <div className="mb-6">
         <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Documents</CardTitle>
              <div className="flex space-x-2">
                <div className="relative w-full">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search documents..."
                    className="w-full pl-8"
                    value={searchQuery}
                    onChange={handleSearch}
                  />
                </div>
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" onClick={refreshData} disabled={loading || !isOnline}>
                        <RedoIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        <span className="sr-only">Refresh</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {!isOnline ? "Not available offline" : "Refresh data"}
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
              </div>
            </CardHeader>
          </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {loading ? (
          // Skeleton loading state that matches exact card layout
          Array(3).fill(0).map((_, index) => (
            <Card key={index} className="shadow-md">
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/4 mb-4" />
                <Skeleton className="h-6 w-20 mb-4" />
                <div className="flex gap-2 mt-4">
                  <Skeleton className="h-9 w-16" />
                  <Skeleton className="h-9 w-16" />
                  <Skeleton className="h-9 w-16" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredDocuments.length > 0 ? (
          filteredDocuments.slice(0, 6).map((document) => (
            <Card key={document.id} className="shadow-md">
              <CardHeader>
                <CardTitle>{document.name}</CardTitle>
                <CardDescription>Uploaded: {new Date(document.uploadDate).toLocaleDateString()}</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Pages: {document.pages}</p>
                <Badge variant="secondary">{document.status}</Badge>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                  <Button variant="outline" size="sm">
                    Delete
                  </Button>
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="sm" disabled={!isOnline}>
                          Share
                        </Button>
                      </TooltipTrigger>
                      {!isOnline && (
                        <TooltipContent>
                          Not available offline
                        </TooltipContent>
                      )}
                    </UITooltip>
                  </TooltipProvider>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="shadow-md col-span-full">
            <CardContent className="py-6">
              {searchQuery ? "No documents match your search." : "No documents found. Upload one to get started!"}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Learning Progress Section */}
      <div className="grid grid-cols-1 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>
              Quiz Performance
            </CardTitle>
            <CardDescription>
              Your recent quiz scores with previous period comparison
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : quizData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={quizData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const currentScore = payload[0].value;
                      const previousScore = payload[0].payload.previousScore;
                      const change = previousScore !== undefined 
                        ? calculateChange(currentScore as number, previousScore) 
                        : null;
                      
                      return (
                        <div className="bg-white p-2 border rounded shadow-md">
                          <p className="font-bold">{payload[0].payload.name}</p>
                          <p>Current: {currentScore}%</p>
                          {previousScore !== undefined && (
                            <p>Previous: {previousScore}%</p>
                          )}
                          {change !== null && (
                            <p className={change > 0 ? 'text-green-500' : change < 0 ? 'text-red-500' : 'text-gray-500'}>
                              Change: {change > 0 ? '+' : ''}{change}%
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }} />
                  <Bar dataKey="score" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-muted-foreground">No quiz data available yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="text-center text-sm text-gray-500 mt-12 pb-6">
        © 2025 StudyFlow. All rights reserved. -
        <Button variant="link" size="sm" className="text-gray-500 font-normal">
          Terms
        </Button>
        <Button variant="link" size="sm" className="text-gray-500 font-normal">
          Privacy
        </Button>
        <Button variant="link" size="sm" className="text-gray-500 font-normal">
          Help
        </Button>
      </footer>
    </div>
  );
}