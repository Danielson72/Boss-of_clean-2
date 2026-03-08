'use client';

import { useEffect } from 'react';
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

  // Still resolving: loading is true OR user exists but role fetch hasn't completed yet
  const isResolving = loading || (!!user && !roleLoaded);

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
