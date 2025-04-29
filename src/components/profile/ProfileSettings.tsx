'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from "@/hooks/use-toast";
import firebaseAuthService from '@/lib/auth-service';
import { Icon } from '@/components/ui/icons';

import { GeneralSettingsTab } from './tabs/GeneralSettingsTab';
import { ProfileTab } from './tabs/ProfileTab';
import { SecurityTab } from './tabs/SecurityTab';
import { ProfileSkeleton } from './ProfileSkeleton';

type ThemeType = 'light' | 'dark' | 'system';

export const ProfileSettings = () => {
  const [theme, setTheme] = useState<ThemeType>('system');
  const { toast } = useToast();
  const user = firebaseAuthService.useAuth();

  const handleThemeChange = (value: ThemeType) => {
    setTheme(value);
    // Implement theme change logic here
  };

  const handleProfileUpdate = () => {
    // Profile update logic is handled in the ProfileTab component
  };

  const handleLogout = async () => {
    try {
      await firebaseAuthService.signOut();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out."
      });
    } catch (error: any) {
      toast({
        title: "Logout failed",
        description: error.message || "Failed to log out",
        variant: "destructive"
      });
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await firebaseAuthService.deleteAccount();
      toast({
        title: "Account deleted",
        description: "Your account has been successfully deleted."
      });
    } catch (error: any) {
      toast({
        title: "Deletion failed",
        description: error.message || "Failed to delete account",
        variant: "destructive"
      });
    }
  };

  const handleDeleteChats = () => {
    // Implement chat deletion logic here
    toast({
      title: "Chats deleted",
      description: "Your chat history has been cleared."
    });
  };

  if (!user) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="container mx-auto py-6">
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">
            <Icon name="user" className="mr-2 h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="general">
            <Icon name="settings" className="mr-2 h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="security">
            <Icon name="shield" className="mr-2 h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab
            user={user}
            onUpdateProfile={handleProfileUpdate}
            onLogout={handleLogout}
            onDeleteChats={handleDeleteChats}
            onDeleteAccount={handleDeleteAccount}
          />
        </TabsContent>

        <TabsContent value="general">
          <GeneralSettingsTab
            theme={theme}
            setTheme={handleThemeChange}
          />
        </TabsContent>

        <TabsContent value="security">
          <SecurityTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}; 