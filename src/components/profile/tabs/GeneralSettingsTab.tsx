'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SunIcon, MoonIcon, MonitorSmartphoneIcon, Info } from 'lucide-react';

type ThemeType = 'light' | 'dark' | 'system';

interface GeneralSettingsTabProps {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

export const GeneralSettingsTab = ({ theme, setTheme }: GeneralSettingsTabProps) => (
  <Card className="w-full">
    <CardHeader>
      <CardTitle>General Settings</CardTitle>
      <CardDescription>Manage your app preferences.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="language">Language</Label>
        <Select defaultValue="en">
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
              <SelectValue placeholder="Select theme" />
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
                  <MonitorSmartphoneIcon className="h-4 w-4" />
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
    </CardContent>
  </Card>
); 