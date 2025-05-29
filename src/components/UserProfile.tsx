'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { X, Save, AlertCircle, Check, Info, Mail } from 'lucide-react';

interface UserProfileProps {
  onClose?: () => void;
}

const UserProfile = ({ onClose }: UserProfileProps) => {
  const { authState, user, logout, updateProfile, loginWithGoogle, deleteAccount, sendPasswordResetEmail } = useAuth();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPasswordResetDialogOpen, setIsPasswordResetDialogOpen] = useState(false);
  const [isSuccessMessageVisible, setIsSuccessMessageVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState('Changes saved successfully');
  
  // User preferences
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [studyRemindersEnabled, setStudyRemindersEnabled] = useState(true);
  const [summaryLength, setSummaryLength] = useState('short');
  const [quizDifficulty, setQuizDifficulty] = useState('easy');
  
  // Profile update states
  const [displayName, setDisplayName] = useState(authState.profile?.name || '');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Effect to apply dark mode using Tailwind's class mechanism
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (darkModeEnabled) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    }
  }, [darkModeEnabled]);

  // Effect to load preferences from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check if dark mode is currently active
      const isDarkMode = document.documentElement.classList.contains('dark');
      setDarkModeEnabled(isDarkMode);
      
      // Load notification preferences
      const savedNotifications = localStorage.getItem('notifications');
      if (savedNotifications === 'off') {
        setNotificationsEnabled(false);
      }
      
      // Load study reminders preference
      const savedReminders = localStorage.getItem('studyReminders');
      if (savedReminders === 'off') {
        setStudyRemindersEnabled(false);
      }
      
      // Load summary length preference
      const savedSummaryLength = localStorage.getItem('summaryLength');
      if (savedSummaryLength) {
        setSummaryLength(savedSummaryLength);
      }
      
      // Load quiz difficulty preference
      const savedQuizDifficulty = localStorage.getItem('quizDifficulty');
      if (savedQuizDifficulty) {
        setQuizDifficulty(savedQuizDifficulty);
      }
    }
  }, []);
  
  const handleNameUpdate = async () => {
    if (!displayName.trim()) return;
    
    try {
      setIsUpdating(true);
      await updateProfile({ name: displayName });
      setIsEditingName(false);
      
      // Show success message
      setSuccessMessage('Name updated successfully');
      setIsSuccessMessageVisible(true);
      setTimeout(() => setIsSuccessMessageVisible(false), 3000);
    } catch (error) {
      console.error('Failed to update name:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePasswordReset = async () => {
    try {
      if (authState.profile?.email) {
        await sendPasswordResetEmail(authState.profile.email);
        setIsPasswordResetDialogOpen(false);
        
        // Show success message
        setSuccessMessage('Password reset email sent');
        setIsSuccessMessageVisible(true);
        setTimeout(() => setIsSuccessMessageVisible(false), 3000);
      }
    } catch (error) {
      console.error('Failed to send password reset email:', error);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
      setIsDeleteDialogOpen(false);
      if (onClose) onClose();
    } catch (error) {
      console.error('Failed to delete account:', error);
    }
  };

  const handleConnectWithGoogle = async () => {
    try {
      await loginWithGoogle();
      setSuccessMessage('Connected with Google successfully');
      setIsSuccessMessageVisible(true);
      setTimeout(() => setIsSuccessMessageVisible(false), 3000);
    } catch (error) {
      console.error('Failed to connect with Google:', error);
    }
  };

  // Handle dark mode toggle
  const toggleDarkMode = (enabled: boolean) => {
    setDarkModeEnabled(enabled);
    localStorage.setItem('theme', enabled ? 'dark' : 'light');
    
    // Show success message
    setSuccessMessage('Display theme updated');
    setIsSuccessMessageVisible(true);
    setTimeout(() => setIsSuccessMessageVisible(false), 3000);
  };

  // Handle study reminders toggle
  const toggleStudyReminders = (enabled: boolean) => {
    setStudyRemindersEnabled(enabled);
    localStorage.setItem('studyReminders', enabled ? 'on' : 'off');
    
    // Show success message
    setSuccessMessage(enabled ? 'Study reminders enabled' : 'Study reminders disabled');
    setIsSuccessMessageVisible(true);
    setTimeout(() => setIsSuccessMessageVisible(false), 3000);
    
    // Request notification permission if enabling
    if (enabled && typeof window !== 'undefined' && 'Notification' in window) {
      Notification.requestPermission();
    }
  };

  // Handle notifications toggle
  const toggleNotifications = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    localStorage.setItem('notifications', enabled ? 'on' : 'off');
    
    // Show success message
    setSuccessMessage(enabled ? 'Email notifications enabled' : 'Email notifications disabled');
    setIsSuccessMessageVisible(true);
    setTimeout(() => setIsSuccessMessageVisible(false), 3000);
  };

  // Handle summary length change
  const handleSummaryLengthChange = (value: string) => {
    setSummaryLength(value);
    localStorage.setItem('summaryLength', value);
    
    // Show success message
    setSuccessMessage('Summary length preference saved');
    setIsSuccessMessageVisible(true);
    setTimeout(() => setIsSuccessMessageVisible(false), 3000);
  };

  // Handle quiz difficulty change
  const handleQuizDifficultyChange = (value: string) => {
    setQuizDifficulty(value);
    localStorage.setItem('quizDifficulty', value);
    
    // Show success message
    setSuccessMessage('Quiz difficulty preference saved');
    setIsSuccessMessageVisible(true);
    setTimeout(() => setIsSuccessMessageVisible(false), 3000);
  };

  return (
    <div className="w-full bg-white dark:bg-gray-900 relative">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Account Settings</h2>
        {/* Single close button */}
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      {/* Success message */}
      {isSuccessMessageVisible && (
        <div className="m-4 p-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded flex items-center text-green-700 dark:text-green-400">
          <Check className="w-5 h-5 mr-2" />
          <span>{successMessage}</span>
        </div>
      )}
      
      <Tabs defaultValue="account" className="w-full">
        <TabsList className="w-full rounded-none border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <TabsTrigger 
            value="account" 
            className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 text-gray-600 dark:text-gray-300 flex-1"
          >
            Account
          </TabsTrigger>
          <TabsTrigger 
            value="preferences" 
            className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 text-gray-600 dark:text-gray-300 flex-1"
          >
            Preferences
          </TabsTrigger>
          <TabsTrigger 
            value="about" 
            className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 text-gray-600 dark:text-gray-300 flex-1"
          >
            About
          </TabsTrigger>
        </TabsList>
          
        {/* Account Tab */}
        <TabsContent value="account" className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-700 dark:text-gray-300">Name</span>
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <Input 
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="max-w-[180px] dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  placeholder="Your name"
                />
                <Button 
                  size="sm" 
                  onClick={handleNameUpdate}
                  disabled={isUpdating}
                  className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-800"
                >
                  <Save className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button 
                variant="ghost" 
                onClick={() => setIsEditingName(true)}
                className="text-gray-800 hover:bg-blue-50 dark:text-gray-200 dark:hover:bg-blue-900/30"
              >
                {authState.profile?.name || 'Add your name'}
              </Button>
            )}
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-700 dark:text-gray-300">Email address</span>
            <span className="text-gray-800 dark:text-gray-200 font-medium truncate max-w-[200px]">
              {authState.profile?.email || 'Not set'}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-700 dark:text-gray-300">Account type</span>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 rounded text-sm">
              {authState.profile?.provider === 'google.com' ? 'Google' : 'Email'}
            </span>
          </div>
          
          {/* Only show password reset for email users */}
          {(!authState.profile?.provider || authState.profile?.provider === 'password') && (
            <div className="flex justify-between items-center pt-2">
              <span className="text-gray-700 dark:text-gray-300">Reset password</span>
              <Button 
                variant="outline" 
                onClick={() => setIsPasswordResetDialogOpen(true)}
                className="border-gray-300 text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Reset
              </Button>
            </div>
          )}
          
          {/* Google connect button (for email users) */}
          {(!authState.profile?.provider || authState.profile?.provider === 'password') && (
            <div className="flex justify-between items-center pt-2">
              <div>
                <p className="text-gray-700 dark:text-gray-300">Connect with Google</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Easier login and sync materials</p>
              </div>
              <Button 
                onClick={handleConnectWithGoogle}
                className="flex items-center bg-white border border-gray-300 text-gray-800 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                  <path fill="#4285F4" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"/>
                </svg>
                Connect
              </Button>
            </div>
          )}
          
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex justify-between items-center mt-4">
            <span className="text-red-600 dark:text-red-400 font-medium">Delete account</span>
            <Button 
              variant="destructive"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="bg-red-50 hover:bg-red-100 text-red-600 border-0 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-400"
            >
              Delete
            </Button>
          </div>
        </TabsContent>
        
        {/* Preferences Tab */}
        <TabsContent value="preferences" className="p-4 space-y-5">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-700 dark:text-gray-300 font-medium">Dark Mode</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Switch to dark theme for night studying</p>
            </div>
            <Switch 
              checked={darkModeEnabled} 
              onCheckedChange={toggleDarkMode} 
              className="data-[state=checked]:bg-blue-600 dark:data-[state=checked]:bg-blue-500" 
            />
          </div>
          
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-700 dark:text-gray-300 font-medium">Study Reminders</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Get notifications for scheduled study sessions</p>
            </div>
            <Switch 
              checked={studyRemindersEnabled} 
              onCheckedChange={toggleStudyReminders} 
              className="data-[state=checked]:bg-blue-600 dark:data-[state=checked]:bg-blue-500" 
            />
          </div>
          
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-700 dark:text-gray-300 font-medium">Email Notifications</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Receive updates about your progress</p>
            </div>
            <Switch 
              checked={notificationsEnabled} 
              onCheckedChange={toggleNotifications} 
              className="data-[state=checked]:bg-blue-600 dark:data-[state=checked]:bg-blue-500" 
            />
          </div>
          
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
            <h3 className="font-medium text-gray-800 dark:text-white mb-3">Study Preferences</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-gray-700 dark:text-gray-300">Default summary length</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Choose how detailed your summaries should be</p>
                </div>
                <select 
                  className="px-2 py-1 border border-gray-300 rounded bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  value={summaryLength}
                  onChange={(e) => handleSummaryLengthChange(e.target.value)}
                >
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="long">Detailed</option>
                </select>
              </div>
              
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-gray-700 dark:text-gray-300">Default quiz difficulty</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Set the challenge level for auto-generated quizzes</p>
                </div>
                <select 
                  className="px-2 py-1 border border-gray-300 rounded bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  value={quizDifficulty}
                  onChange={(e) => handleQuizDifficultyChange(e.target.value)}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Challenging</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
            <h3 className="font-medium text-gray-800 dark:text-white mb-3">Storage & Backup</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-gray-700 dark:text-gray-300">Auto-sync documents</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Keep your study materials in sync across devices</p>
                </div>
                <Switch defaultChecked className="data-[state=checked]:bg-blue-600 dark:data-[state=checked]:bg-blue-500" />
              </div>
              
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-gray-700 dark:text-gray-300">Storage used</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">0.8 GB of 2 GB</p>
                </div>
                <div className="w-[100px] h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 dark:bg-blue-500 w-[40%]"></div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
        
        {/* About Tab */}
        <TabsContent value="about" className="p-4 space-y-4">
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center">
              <div className="w-16 h-16 bg-blue-600 dark:bg-blue-700 rounded flex items-center justify-center">
                <svg className="h-10 w-10 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold mt-2 text-gray-800 dark:text-white">StudieMaterials</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Version 1.2.0</p>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 flex items-start">
            <Info className="text-blue-600 dark:text-blue-400 w-5 h-5 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-blue-800 dark:text-blue-300">Free Student Account</h4>
              <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                You're using the free plan with basic features. Upgrade to Pro for AI-powered summaries, unlimited documents, and advanced study tools.
              </p>
              <Button className="mt-3 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-800">
                Upgrade to Pro
              </Button>
            </div>
          </div>
          
          <div className="space-y-3 mt-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-700 dark:text-gray-300">Terms of Use</span>
              <Button 
                variant="outline" 
                className="border-gray-300 text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                View
              </Button>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-700 dark:text-gray-300">Privacy Policy</span>
              <Button 
                variant="outline" 
                className="border-gray-300 text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                View
              </Button>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-700 dark:text-gray-300">Contact Support</span>
              <Button 
                variant="outline" 
                className="border-gray-300 text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800 flex items-center"
              >
                <Mail className="w-4 h-4 mr-2" />
                Email
              </Button>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              © 2025 StudieMaterials. All rights reserved.
            </p>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Password Reset Dialog */}
      <Dialog open={isPasswordResetDialogOpen} onOpenChange={setIsPasswordResetDialogOpen}>
        <DialogContent className="bg-white dark:bg-gray-900 p-6 border border-gray-200 dark:border-gray-700 rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Reset Password</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600 dark:text-gray-300 py-4">
            We'll send a password reset link to your email address: <span className="font-medium">{authState.profile?.email}</span>
          </p>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsPasswordResetDialogOpen(false)}
              className="border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button 
              onClick={handlePasswordReset}
              className="bg-blue-600 hover:bg-blue-700 text-white ml-2 dark:bg-blue-700 dark:hover:bg-blue-800"
            >
              Send Reset Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Account Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-white dark:bg-gray-900 p-6 border border-gray-200 dark:border-gray-700 rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-red-600 dark:text-red-400">Delete Account</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-800 dark:text-gray-200 font-medium mb-2">Are you sure you want to delete your account?</p>
            <p className="text-gray-600 dark:text-gray-300">This action will permanently remove:</p>
            <ul className="list-disc pl-5 mt-2 text-gray-600 dark:text-gray-300 space-y-1">
              <li>All your documents and summaries</li>
              <li>Quiz history and progress data</li>
              <li>Study plans and schedules</li>
              <li>Account settings and preferences</li>
            </ul>
            <p className="mt-4 text-gray-600 dark:text-gray-300">This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              className="border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteAccount}
              className="bg-red-600 hover:bg-red-700 text-white ml-2"
            >
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserProfile;