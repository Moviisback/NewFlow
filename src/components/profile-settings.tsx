"use client";

import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import firebaseAuthService from '@/lib/auth-service';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  SunIcon,
  MoonIcon,
  MonitorSmartphoneIcon as MonitorIcon, // Fixed import name
  User,
  Info,
  Settings,
  LogOut,
  Trash2,
  Shield,
  Mail,
  Phone,
  HelpCircle,
  FileText,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import LoginCard from '@/components/LoginCard';
import SignupCard from '@/components/SignupCard';

// Define constants since import is failing
const APP_VERSION = "1.0.0";
const LAST_UPDATE_DATE = new Date().toLocaleDateString();

// Create a custom useTheme hook since import is failing
const useTheme = () => {
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      return (savedTheme as 'light' | 'dark' | 'system') || 'system';
    }
    return 'system';
  });

  const setTheme = (newTheme: 'light' | 'dark' | 'system') => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme);

      // Apply theme to document
      if (newTheme === 'dark' || (newTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  // Apply theme on mount
  useEffect(() => {
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return { theme, setTheme };
};

// Define types
type ThemeType = 'light' | 'dark' | 'system';

// Extend the UserProfile type to include the properties we need
interface ExtendedUserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  photoUrl?: string;
  provider?: string;
  verified?: boolean;
  passwordLastChanged?: string; // Added this missing property
}

// Extend the AuthState type to include the properties we need
interface ExtendedAuthState {
  authenticated: boolean; // Use 'authenticated' instead of 'isAuthenticated'
  profile: ExtendedUserProfile;
}

// Props types for components
interface GeneralSettingsTabProps {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

interface ProfileTabProps {
  user: {
    profile: ExtendedUserProfile;
  };
  onUpdateProfile: (name: string, phone: string) => Promise<void>;
  onLogout: () => Promise<void>;
  onDeleteChats: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
}

interface SecurityTabProps {
  user: {
    profile: ExtendedUserProfile;
  };
  onSetup2FA: () => Promise<void>;
  onChangePassword: () => Promise<void>;
  tfaEnabled: boolean;
}

interface AboutTabProps {
  openExternalLink: (url: string) => void;
}

// Breaking down into smaller components
const ProfileSkeleton = () => (
  <div className="w-full space-y-6 p-4">
    <div className="space-y-2">
      <div className="h-8 w-64 bg-muted rounded animate-pulse"></div>
      <div className="h-4 w-48 bg-muted rounded animate-pulse"></div>
    </div>
    <div className="flex items-center space-x-4">
      <div className="h-12 w-12 rounded-full bg-muted animate-pulse"></div>
      <div className="space-y-2">
        <div className="h-4 w-32 bg-muted rounded animate-pulse"></div>
        <div className="h-4 w-64 bg-muted rounded animate-pulse"></div>
      </div>
    </div>
    <div className="h-10 w-full bg-muted rounded animate-pulse"></div>
    <div className="h-10 w-full bg-muted rounded animate-pulse"></div>
    <div className="h-10 w-full bg-muted rounded animate-pulse"></div>
  </div>
);

// General Settings Tab Component
const GeneralSettingsTab = ({ theme, setTheme }: GeneralSettingsTabProps) => {
  const [languageValue, setLanguageValue] = useState('en');
  const [notifications, setNotifications] = useState(true);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>General Settings</CardTitle>
        <CardDescription>Manage your app preferences.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="language">Language</Label>
          <Select
            value={languageValue}
            onValueChange={setLanguageValue}
          >
            <SelectTrigger id="language" className="w-full">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="de">German</SelectItem>
              <SelectItem value="fr">French</SelectItem>
              <SelectItem value="es">Spanish</SelectItem>
              <SelectItem value="ru">Russian</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="theme">Theme</Label>
          <div className="flex flex-col gap-4">
            <Select
              value={theme}
              onValueChange={(value: ThemeType) => setTheme(value)}
            >
              <SelectTrigger id="theme" className="w-full">
                <div className="flex items-center gap-2">
                  {theme === 'light' && <SunIcon className="h-4 w-4" />}
                  {theme === 'dark' && <MoonIcon className="h-4 w-4" />}
                  {theme === 'system' && <MonitorIcon className="h-4 w-4" />}
                  <span className="capitalize">{theme} Theme</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center gap-2">
                    <SunIcon className="h-4 w-4" />
                    <span>Light</span>
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-2">
                    <MoonIcon className="h-4 w-4" />
                    <span>Dark</span>
                  </div>
                </SelectItem>
                <SelectItem value="system">
                  <div className="flex items-center gap-2">
                    <MonitorIcon className="h-4 w-4" />
                    <span>System</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4" />
              <span>System theme will follow your device settings</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Notifications</Label>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base" htmlFor="enable-notifications">
                Enable notifications
              </Label>
              <p className="text-sm text-muted-foreground">Receive updates about your account</p>
            </div>
            <Switch
              id="enable-notifications"
              checked={notifications}
              onCheckedChange={setNotifications}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Profile Tab Component
const ProfileTab = ({ user, onUpdateProfile, onLogout, onDeleteChats, onDeleteAccount }: ProfileTabProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [improveModel, setImproveModel] = useState<boolean>(true);
  const [phoneNumber, setPhoneNumber] = useState<string>(user.profile.phone || '');
  const [name, setName] = useState<string>(user.profile.name || '');
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  useEffect(() => {
    setPhoneNumber(user.profile.phone || '');
    setName(user.profile.name || '');
  }, [user.profile]);

  const getInitials = (name: string): string => {
    if (!name) return '';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  // Determine if the user is using Google auth
  const isGoogleAuth = user.profile.provider === "google.com";

  const handleUpdateProfile = async () => {
    if (name === user.profile.name && phoneNumber === user.profile.phone) {
      toast({
        title: "Nothing to update",
        description: "You haven't made any changes to your profile."
      });
      return;
    }

    setIsUpdating(true);
    try {
      await onUpdateProfile(name, phoneNumber);
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile information",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-4 w-full pb-8">
      <Card className="w-full">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
            <div>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details.</CardDescription>
            </div>
            {isGoogleAuth && (
              <Badge variant="outline" className="flex items-center gap-1 w-fit">
                <svg width="14" height="14" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google Account
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Avatar className="h-12 w-12 border border-muted">
              {user.profile.photoUrl ? (
                <AvatarImage src={user.profile.photoUrl} alt={user.profile.name} />
              ) : null}
              <AvatarFallback className="text-base">
                {getInitials(user.profile.name)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h3 className="font-medium text-base">{user.profile.name}</h3>
              <div className="flex items-center space-x-2">
                <Badge variant={user.profile.verified ? "default" : "outline"} className="text-xs">
                  {user.profile.verified ? "Verified" : "Unverified"}
                </Badge>
                <span className="text-xs text-muted-foreground">ID: {user.profile.id.substring(0, 6)}...</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Full Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                className="w-full"
                readOnly={isGoogleAuth}
              />
              {isGoogleAuth && (
                <p className="text-xs text-muted-foreground">Name is managed by your Google account</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address
              </Label>
              <Input
                id="email"
                value={user.profile.email}
                className="w-full"
                readOnly
                disabled
              />
              <p className="text-xs text-muted-foreground">Your email cannot be changed</p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhoneNumber(e.target.value)}
                className="w-full"
                placeholder="Optional"
              />
              <p className="text-xs text-muted-foreground">Phone number is optional</p>
            </div>
          </div>

          <div className="pt-2">
            <Button
              onClick={handleUpdateProfile}
              disabled={isUpdating || (name === user.profile.name && phoneNumber === user.profile.phone)}
            >
              {isUpdating ? "Updating..." : "Update Profile"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Privacy & Data</CardTitle>
          <CardDescription>Manage your privacy settings and data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base" htmlFor="improve-model">
                Help improve our service
              </Label>
              <p className="text-sm text-muted-foreground">Allow anonymous usage data collection</p>
            </div>
            <Switch
              id="improve-model"
              checked={improveModel}
              onCheckedChange={setImproveModel}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <h3 className="font-medium">Account Actions</h3>
            <div className="flex flex-col space-y-2">
              <Button
                variant="outline"
                className="justify-start"
                onClick={onDeleteChats}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete All Conversations
              </Button>

              <Button
                variant="outline"
                className="justify-start"
                onClick={onLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>

              <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="justify-start"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Account
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Account</DialogTitle>
                    <DialogDescription>
                      This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        This is a permanent action and cannot be reversed.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-delete">Type "DELETE" to confirm</Label>
                      <Input
                        id="confirm-delete"
                        value={deleteConfirmation}
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                        placeholder="DELETE"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => {
                      setDeleteDialogOpen(false);
                      setDeleteConfirmation('');
                    }}>
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setDeleteDialogOpen(false);
                        onDeleteAccount();
                        setDeleteConfirmation('');
                      }}
                      disabled={deleteConfirmation !== 'DELETE'}
                    >
                      Delete My Account
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Security Tab Component
const SecurityTab = ({ user, onSetup2FA, onChangePassword, tfaEnabled }: SecurityTabProps) => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Security Settings</CardTitle>
        <CardDescription>Manage your account security.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <h3 className="font-medium">Password</h3>
          <p className="text-sm text-muted-foreground">
            Last changed: {user.profile.passwordLastChanged || 'Never'}
          </p>
          <Button variant="outline" onClick={onChangePassword}>
            <Shield className="mr-2 h-4 w-4" />
            Change Password
          </Button>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Two-Factor Authentication</h3>
              <p className="text-sm text-muted-foreground">
                Add an extra layer of security to your account
              </p>
            </div>
            <Badge variant={tfaEnabled ? "default" : "outline"}>
              {tfaEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          <Button
            variant={tfaEnabled ? "outline" : "default"}
            onClick={onSetup2FA}
          >
            {tfaEnabled ? "Manage 2FA" : "Setup 2FA"}
          </Button>
        </div>

        <Separator />

        <div className="space-y-2">
          <h3 className="font-medium">Sessions</h3>
          <p className="text-sm text-muted-foreground">
            Manage your active sessions
          </p>
          <div className="border rounded-md">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <MonitorIcon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Current Session</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date().toLocaleString()}
                    </p>
                  </div>
                </div>
                <Badge>Active</Badge>
              </div>
            </div>
          </div>
          <Button variant="outline" className="w-full">
            View All Sessions
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// About Tab Component
const AboutTab = ({ openExternalLink }: AboutTabProps) => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>About</CardTitle>
        <CardDescription>Information about the application.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-1">
          <p className="text-sm font-medium">Version</p>
          <p className="text-sm text-muted-foreground">{APP_VERSION}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">Last Updated</p>
          <p className="text-sm text-muted-foreground">{LAST_UPDATE_DATE}</p>
        </div>
        <Separator />
        <div className="space-y-2">
          <h3 className="font-medium">Resources</h3>
          <div className="grid gap-2">
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => openExternalLink('https://docs.example.com')}
            >
              <FileText className="mr-2 h-4 w-4" />
              Documentation
              <ExternalLink className="ml-auto h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => openExternalLink('https://help.example.com')}
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              Help Center
              <ExternalLink className="ml-auto h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => openExternalLink('https://status.example.com')}
            >
              <Info className="mr-2 h-4 w-4" />
              System Status
              <ExternalLink className="ml-auto h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t bg-muted/50 flex justify-between items-center">
        <p className="text-xs text-muted-foreground">© 2025 Example App</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openExternalLink('https://terms.example.com')}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Terms & Privacy
        </Button>
      </CardFooter>
    </Card>
  );
};

// Main ProfileSettings Component
const ProfileSettings = () => {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [tfaEnabled, setTfaEnabled] = useState(false);
  
  // Create a mock user object that matches our interface structure
  const [user, setUser] = useState<{
    authenticated: boolean;
    profile: ExtendedUserProfile;
  }>({
    authenticated: false,
    profile: {
      id: '',
      name: '',
      email: '',
      verified: false
    }
  });

  useEffect(() => {
    // Simulate loading user data
    const timer = setTimeout(() => {
      setLoading(false);
      // Simulate a logged-in user
      setUser({
        authenticated: true,
        profile: {
          id: 'user123456',
          name: 'John Doe',
          email: 'john.doe@example.com',
          phone: '555-123-4567',
          verified: true,
          passwordLastChanged: '2024-03-15'
        }
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleUpdateProfile = async (name: string, phone: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update local state
      setUser(prev => ({
        ...prev,
        profile: {
          ...prev.profile,
          name,
          phone
        }
      }));
      
      toast({
        title: "Profile updated",
        description: "Your profile information has been updated successfully.",
      });
    } catch (error) {
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setUser({
        authenticated: false,
        profile: {
          id: '',
          name: '',
          email: '',
          verified: false
        }
      });
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error: any) {
      toast({
        title: "Logout failed",
        description: error.message || "Failed to log out",
        variant: "destructive"
      });
    }
  };

  const handleDeleteChats = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Chats deleted",
        description: "All your conversations have been deleted.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to delete chats",
        description: error.message || "An error occurred while deleting chats",
        variant: "destructive"
      });
    }
  };

  const handleDeleteAccount = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setUser({
        authenticated: false,
        profile: {
          id: '',
          name: '',
          email: '',
          verified: false
        }
      });
      
      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to delete account",
        description: error.message || "An error occurred while deleting your account",
        variant: "destructive"
      });
    }
  };

  const handleSetup2FA = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setTfaEnabled(!tfaEnabled);
      toast({
        title: tfaEnabled ? "2FA Disabled" : "2FA Enabled",
        description: tfaEnabled 
          ? "Two-factor authentication has been disabled." 
          : "Two-factor authentication has been successfully set up.",
      });
    } catch (error: any) {
      toast({
        title: "2FA setup failed",
        description: error.message || "Failed to set up two-factor authentication",
        variant: "destructive"
      });
    }
  };

  const handleChangePassword = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update the password last changed date
      setUser(prev => ({
        ...prev,
        profile: {
          ...prev.profile,
          passwordLastChanged: new Date().toISOString().split('T')[0]
        }
      }));
      
      toast({
        title: "Password changed",
        description: "Your password has been successfully updated.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to change password",
        description: error.message || "An error occurred while changing your password",
        variant: "destructive"
      });
    }
  };

  const openExternalLink = (url: string) => {
    // In a real app, you might want to warn users before opening external links
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!user.authenticated) {
    return (
      <div className="container max-w-md mx-auto py-10">
        <Tabs defaultValue="login">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <LoginCard onSuccessfulLogin={() => {
              // Mock login behavior
              setUser({
                authenticated: true,
                profile: {
                  id: 'user123456',
                  name: 'John Doe',
                  email: 'john.doe@example.com',
                  verified: true
                }
              });
            }} />
          </TabsContent>
          <TabsContent value="signup">
            <SignupCard onSuccessfulSignup={() => {
              // Mock signup behavior
              setUser({
                authenticated: true,
                profile: {
                  id: 'user789012',
                  name: 'New User',
                  email: 'new.user@example.com',
                  verified: false
                }
              });
            }} />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-10 px-4">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences.
          </p>
        </div>

        {loading ? (
          <ProfileSkeleton />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Security</span>
              </TabsTrigger>
              <TabsTrigger value="general" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">General</span>
              </TabsTrigger>
              <TabsTrigger value="about" className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                <span className="hidden sm:inline">About</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-4">
              <ProfileTab
                user={user}
                onUpdateProfile={handleUpdateProfile}
                onLogout={handleLogout}
                onDeleteChats={handleDeleteChats}
                onDeleteAccount={handleDeleteAccount}
              />
            </TabsContent>

            <TabsContent value="security" className="space-y-4">
              <SecurityTab
                user={user}
                onSetup2FA={handleSetup2FA}
                onChangePassword={handleChangePassword}
                tfaEnabled={tfaEnabled}
              />
            </TabsContent>

            <TabsContent value="general" className="space-y-4">
              <GeneralSettingsTab
                theme={theme}
                setTheme={setTheme}
              />
            </TabsContent>

            <TabsContent value="about" className="space-y-4">
              <AboutTab
                openExternalLink={openExternalLink}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default ProfileSettings;