'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { authState } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authState.loading && !authState.authenticated) {
      router.push('/login');
    }
  }, [authState.authenticated, authState.loading, router]);

  // Show loading state while checking authentication
  if (authState.loading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Don't render content if not authenticated
  if (!authState.authenticated) {
    return null;
  }

  return <>{children}</>;
}