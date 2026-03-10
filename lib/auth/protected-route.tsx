'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: 'customer' | 'cleaner' | 'admin';
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requireRole,
  redirectTo = '/login'
}: ProtectedRouteProps) {
  const { user, loading, roleLoaded, isCustomer, isCleaner, isAdmin } = useAuth();
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  // Still resolving: loading is true OR user exists but role fetch hasn't completed yet
  const isResolving = loading || (!!user && !roleLoaded);

  // Safety timeout: if still resolving after 10 seconds, show error
  useEffect(() => {
    if (!isResolving) {
      setTimedOut(false);
      return;
    }
    const timeout = setTimeout(() => setTimedOut(true), 10000);
    return () => clearTimeout(timeout);
  }, [isResolving]);

  useEffect(() => {
    if (isResolving) return;

    if (!user) {
      router.push(redirectTo);
    } else if (requireRole) {
      // Only check role access once dbRole has resolved
      if (requireRole === 'admin' && !isAdmin) {
        router.push('/dashboard');
      } else if (requireRole === 'customer' && !isCustomer) {
        router.push('/dashboard');
      } else if (requireRole === 'cleaner' && !isCleaner) {
        router.push('/dashboard');
      }
    }
  }, [user, isResolving, requireRole, isCustomer, isCleaner, isAdmin, router, redirectTo]);

  if (timedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto px-4">
          <p className="text-gray-800 font-medium mb-2">Something went wrong</p>
          <p className="text-gray-500 text-sm mb-4">
            The page took too long to load. This usually means a session issue.
          </p>
          <a
            href="/logout"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            Sign out and try again
          </a>
        </div>
      </div>
    );
  }

  if (isResolving) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
