'use client';

export const ProfileSkeleton = () => (
  <div className="w-full space-y-6 p-4">
    <div className="space-y-2">
      <div className="h-8 w-64 bg-muted rounded animate-pulse" />
      <div className="h-4 w-48 bg-muted rounded animate-pulse" />
    </div>
    <div className="flex items-center space-x-4">
      <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
      <div className="space-y-2">
        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
        <div className="h-4 w-64 bg-muted rounded animate-pulse" />
      </div>
    </div>
    <div className="h-10 w-full bg-muted rounded animate-pulse" />
    <div className="h-10 w-full bg-muted rounded animate-pulse" />
    <div className="h-10 w-full bg-muted rounded animate-pulse" />
  </div>
); 