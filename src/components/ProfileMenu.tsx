'use client';

import React, { useState } from 'react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import UserProfile from './UserProfile';
import { useAuth } from '@/hooks/use-auth';
import { Settings, HelpCircle, LogOut } from 'lucide-react';

const ProfileMenu = () => {
  const { authState, logout } = useAuth();
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  
  const handleLogout = async () => {
    try {
      await logout();
      setIsLogoutDialogOpen(false);
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  // Get first letter of user's name for avatar
  const getInitial = () => {
    if (authState.profile && authState.profile.name && authState.profile.name.length > 0) {
      return authState.profile.name.charAt(0).toUpperCase();
    }
    if (authState.profile && authState.profile.email && authState.profile.email.length > 0) {
      return authState.profile.email.charAt(0).toUpperCase();
    }
    return 'S'; // Default to S for Student if no name or email
  };
  
  // Get display name for menu
  const getDisplayName = () => {
    if (authState.profile && authState.profile.name) {
      return authState.profile.name;
    }
    if (authState.profile && authState.profile.email) {
      // Only show the part before @ in the email
      return authState.profile.email.split('@')[0];
    }
    return 'Student';
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="flex items-center cursor-pointer px-2 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30">
            <div className="h-8 w-8 flex items-center justify-center">
              <span className="h-8 w-8 bg-blue-600 dark:bg-blue-700 rounded-full flex items-center justify-center text-white font-medium">
                {getInitial()}
              </span>
            </div>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-md rounded-lg">
          <div className="px-4 py-3 text-sm font-medium border-b border-gray-100 dark:border-gray-800 text-gray-800 dark:text-gray-200">
            {getDisplayName()}
          </div>
          <DropdownMenuItem 
            className="cursor-pointer hover:bg-blue-50 focus:bg-blue-50 dark:hover:bg-blue-900/30 dark:focus:bg-blue-900/30 py-2 px-4 text-gray-700 dark:text-gray-300"
            onClick={() => setIsUserProfileOpen(true)}
          >
            <Settings className="w-4 h-4 mr-2 text-gray-600 dark:text-gray-400" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="cursor-pointer hover:bg-blue-50 focus:bg-blue-50 dark:hover:bg-blue-900/30 dark:focus:bg-blue-900/30 py-2 px-4 text-gray-700 dark:text-gray-300"
            onClick={() => setIsHelpDialogOpen(true)}
          >
            <HelpCircle className="w-4 h-4 mr-2 text-gray-600 dark:text-gray-400" />
            <span>Help</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-gray-100 dark:bg-gray-800" />
          <DropdownMenuItem 
            className="cursor-pointer hover:bg-blue-50 focus:bg-blue-50 dark:hover:bg-blue-900/30 dark:focus:bg-blue-900/30 py-2 px-4 text-gray-700 dark:text-gray-300"
            onClick={() => setIsLogoutDialogOpen(true)}
          >
            <LogOut className="w-4 h-4 mr-2 text-gray-600 dark:text-gray-400" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Settings/Profile Dialog */}
      <Dialog open={isUserProfileOpen} onOpenChange={setIsUserProfileOpen}>
        <DialogContent className="sm:max-w-md p-0 bg-white dark:bg-gray-900 max-h-[90vh] overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg">
          <UserProfile onClose={() => setIsUserProfileOpen(false)} />
        </DialogContent>
      </Dialog>
      
      {/* Logout Confirmation Dialog */}
      <Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        <DialogContent className="bg-white dark:bg-gray-900 p-6 border border-gray-200 dark:border-gray-700 rounded-lg">
          <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Log Out</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Are you sure you want to log out of StudieMaterials?
          </p>
          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => setIsLogoutDialogOpen(false)}
              className="border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleLogout}
              className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-800"
            >
              Log Out
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Help Dialog */}
      <Dialog open={isHelpDialogOpen} onOpenChange={setIsHelpDialogOpen}>
        <DialogContent className="bg-white dark:bg-gray-900 p-6 border border-gray-200 dark:border-gray-700 rounded-lg">
          <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">Help Center</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            How can we help with your studies?
          </p>
          <div className="space-y-3 mb-6">
            <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer text-gray-800 dark:text-gray-200">
              <h4 className="font-medium">Study Tips</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Get advice on studying more efficiently</p>
            </div>
            <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer text-gray-800 dark:text-gray-200">
              <h4 className="font-medium">App Tutorial</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Learn how to use our summarizing tools</p>
            </div>
            <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer text-gray-800 dark:text-gray-200">
              <h4 className="font-medium">Contact Support</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Email us at help@studiematerials.com</p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button 
              onClick={() => setIsHelpDialogOpen(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-800"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProfileMenu;