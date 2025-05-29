'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Calendar, BookOpen, Flame } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const WelcomeCard = () => {
  const router = useRouter();
  const [userData, setUserData] = useState({
    name: '',
    streak: 0,
    nextExam: { title: '', daysLeft: 0 },
    weeklyProgressPercentage: 0
  });
  const [greeting, setGreeting] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true);
      
      try {
        // Fetch user data from API
        const response = await fetch('/api/user/stats');
        
        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }
        
        const data = await response.json();
        
        // Time-based greeting
        const hour = new Date().getHours();
        const timeGreeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
        
        // Get next exam from study plan if available
        const nextExam = data.studyPlan?.exams?.length > 0 
          ? data.studyPlan.exams.sort((a, b) => a.daysLeft - b.daysLeft)[0] 
          : { title: '', daysLeft: 0 };
        
        setUserData({
          name: data.name || '',
          streak: data.streak || 0,
          nextExam: {
            title: nextExam.title || '',
            daysLeft: nextExam.daysLeft || 0
          },
          weeklyProgressPercentage: data.weeklyProgressPercentage || 0
        });
        
        setGreeting(timeGreeting);
        setError(false);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setError(true);
        
        // Set time-based greeting even if API fails
        const hour = new Date().getHours();
        const timeGreeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
        setGreeting(timeGreeting);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handlePlanToday = () => {
    router.push('/studyplan');
  };

  const handleStartLearning = () => {
    router.push('/documents');
  };

  if (isLoading) {
    return (
      <Card className="mb-4 bg-blue-50 border-none shadow-sm">
        <CardContent className="p-4 md:p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-blue-100 rounded w-1/3 md:h-7 md:w-3/4"></div>
            <div className="h-4 bg-blue-100 rounded w-2/3"></div>
            <div className="h-10 bg-blue-100 rounded"></div>
            <div className="h-12 bg-white rounded"></div>
            <div className="h-4 bg-blue-100 rounded w-full"></div>
            <div className="flex gap-2 mt-4">
              <div className="h-9 bg-gray-100 rounded w-1/2 md:h-10"></div>
              <div className="h-9 bg-blue-200 rounded w-1/2 md:h-10"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4 bg-blue-50 border-none shadow-sm">
      <CardContent className="p-4 md:p-6">
        <div className="space-y-3">
          {/* Header with greeting */}
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-blue-500">
              {greeting}{userData.name ? `, ${userData.name}` : ''}! ✨
            </h2>
            <p className="text-gray-600 text-sm md:text-base">
              The beautiful thing about learning is that no one can take it away from you.
            </p>
          </div>
          
          {/* Streak */}
          {userData.streak > 0 ? (
            <div className="bg-blue-100 rounded-md p-2 md:p-3 flex items-center text-blue-700">
              <Flame className="h-5 w-5 mr-2 text-blue-600" />
              <span className="text-sm md:text-base font-medium">{userData.streak}-day streak</span>
            </div>
          ) : error ? (
            <div className="bg-blue-100 rounded-md p-2 md:p-3 flex items-center text-blue-700">
              <Flame className="h-5 w-5 mr-2 text-blue-600" />
              <span className="text-sm md:text-base font-medium">No streak data available</span>
            </div>
          ) : null}
          
          {/* Upcoming exam - only show if available */}
          {userData.nextExam.title ? (
            <div className="bg-white rounded-md p-3 md:p-4 flex items-center gap-3 shadow-sm">
              <Calendar className="h-5 w-5 text-blue-500" />
              <div>
                <h3 className="font-medium text-sm md:text-base">{userData.nextExam.title}</h3>
                <p className="text-xs md:text-sm text-gray-500">{userData.nextExam.daysLeft} days left</p>
              </div>
            </div>
          ) : null}
          
          {/* Weekly progress */}
          {userData.weeklyProgressPercentage > 0 || !error ? (
            <div>
              <div className="flex flex-col md:flex-row justify-between gap-1 md:items-center mb-1 text-sm">
                <span className="text-gray-600">You've completed</span>
                <span className="font-medium">{userData.weeklyProgressPercentage}% of your weekly goals</span>
              </div>
              <Progress value={userData.weeklyProgressPercentage} className="h-2" />
            </div>
          ) : (
            <div>
              <div className="flex justify-between mb-1 text-sm">
                <span className="text-gray-600">Weekly goals</span>
              </div>
              <div className="text-sm text-gray-500">No progress data available</div>
            </div>
          )}
          
          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              className="flex-1 h-9 md:h-10 text-xs md:text-sm"
              onClick={handlePlanToday}
            >
              <Calendar className="mr-1 md:mr-2 h-4 w-4" />
              <span>Plan Today</span>
            </Button>
            <Button 
              className="flex-1 h-9 md:h-10 bg-blue-500 hover:bg-blue-600 text-xs md:text-sm"
              onClick={handleStartLearning}
            >
              <BookOpen className="mr-1 md:mr-2 h-4 w-4" />
              <span>Start Learning</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WelcomeCard;