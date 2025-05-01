'use client';

import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import firebaseAuthService from '@/lib/auth-service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, Loader2, LogOut, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface ProfileTabProps {
  user: ReturnType<typeof firebaseAuthService.useAuth>;
  onUpdateProfile: () => void;
  onLogout: () => void;
  onDeleteChats: () => void;
  onDeleteAccount: () => void;
}

export const ProfileTab = ({ user, onUpdateProfile, onLogout, onDeleteChats, onDeleteAccount }: ProfileTabProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [improveModel, setImproveModel] = useState<boolean>(true);
  const [phoneNumber, setPhoneNumber] = useState<string>(user.profile.phone || '');
  const [name, setName] = useState<string>(user.profile.name || '');
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  
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

  const isGoogleAuth = user.profile.provider === "google.com";

  const handleUpdateProfile = async () => {
    if (name === user.profile.name) {
      toast({
        title: "Nothing to update",
        description: "You haven't made any changes to your profile."
      });
      return;
    }

    setIsUpdating(true);
    try {
      await firebaseAuthService.updateUserProfile(name);
      toast({
        title: "Profile updated",
        description: "Your profile information has been updated successfully."
      });
      onUpdateProfile();
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
              />
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number
              </Label>
              <Input
                id="phone"
                value={phoneNumber}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhoneNumber(e.target.value)}
                className="w-full"
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button
              onClick={handleUpdateProfile}
              disabled={isUpdating || name === user.profile.name}
              className="w-full sm:w-auto"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4" />
                  Updating...
                </>
              ) : (
                'Update Profile'
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={onLogout}
              className="w-full sm:w-auto"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log Out
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
          <CardDescription>Irreversible and destructive actions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={onDeleteChats}
              className="w-full sm:w-auto"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete All Chats
            </Button>
            
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="w-full sm:w-auto"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Account
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Account</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete your account? This action cannot be undone.
                    All your data will be permanently deleted.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDeleteDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      onDeleteAccount();
                      setDeleteDialogOpen(false);
                    }}
                  >
                    Delete Account
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 