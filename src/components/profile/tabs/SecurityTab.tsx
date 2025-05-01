'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Shield, Mail, FileText, MonitorSmartphone as MonitorIcon } from 'lucide-react';

export const SecurityTab = () => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Security Settings</CardTitle>
        <CardDescription>Manage your account security preferences.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="two-factor" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Two-Factor Authentication
            </Label>
            <p className="text-sm text-muted-foreground">
              Add an extra layer of security to your account
            </p>
          </div>
          <Switch id="two-factor" />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="email-notifications" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Security Email Notifications
            </Label>
            <p className="text-sm text-muted-foreground">
              Receive emails about important security events
            </p>
          </div>
          <Switch id="email-notifications" defaultChecked />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="activity-log" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Activity Log
            </Label>
            <p className="text-sm text-muted-foreground">
              Keep track of your account activity
            </p>
          </div>
          <Switch id="activity-log" defaultChecked />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="device-management" className="flex items-center gap-2">
              <MonitorIcon className="h-4 w-4" />
              Device Management
            </Label>
            <p className="text-sm text-muted-foreground">
              Manage devices connected to your account
            </p>
          </div>
          <Switch id="device-management" defaultChecked />
        </div>
      </CardContent>
    </Card>
  );
}; 