'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import ErrorBoundary from '@/lib/components/ErrorBoundary';

function DashboardRedirect() {
  const { user, isCustomer, isCleaner, loading } = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Don't redirect while auth is still loading
    if (loading || isRedirecting) {
      return;
    }

    // Only redirect if we have a user and haven't started redirecting
    if (user && !isRedirecting) {
      setIsRedirecting(true);

      try {
        // Add a small delay to ensure state has settled
        const redirectTimer = setTimeout(() => {
          if (isCleaner) {
            router.push('/dashboard/cleaner');
          } else if (isCustomer) {
            router.push('/dashboard/customer');
          } else {
            // Default to customer dashboard if role is unclear
            router.push('/dashboard/customer');
          }
        }, 100);

        return () => clearTimeout(redirectTimer);
      } catch (error) {
        console.error('Dashboard redirect error:', error);
        setIsRedirecting(false);
      }
    }
  }, [user, isCustomer, isCleaner, loading, router, isRedirecting]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">
          {loading ? 'Checking authentication...' : 'Redirecting to your dashboard...'}
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ErrorBoundary>
      <ProtectedRoute>
        <DashboardRedirect />
      </ProtectedRoute>
    </ErrorBoundary>
  );
}