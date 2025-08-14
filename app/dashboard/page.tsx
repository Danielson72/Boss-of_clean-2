'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/lib/auth/protected-route';

export default function DashboardPage() {
  const { user, isCustomer, isCleaner } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      if (isCleaner) {
        router.push('/dashboard/cleaner');
      } else if (isCustomer) {
        router.push('/dashboard/customer');
      } else {
        // Default to customer dashboard if role is unclear
        router.push('/dashboard/customer');
      }
    }
  }, [user, isCustomer, isCleaner, router]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to your dashboard...</p>
        </div>
      </div>
    </ProtectedRoute>
  );
}