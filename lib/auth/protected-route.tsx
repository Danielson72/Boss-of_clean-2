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
  const { user, loading, isCustomer, isCleaner } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push(redirectTo);
    } else if (!loading && requireRole) {
      // Check role-based access
      if (requireRole === 'customer' && !isCustomer) {
        router.push('/dashboard');
      } else if (requireRole === 'cleaner' && !isCleaner) {
        router.push('/dashboard');
      }
    }
  }, [user, loading, requireRole, isCustomer, isCleaner, router, redirectTo]);

  if (loading) {
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