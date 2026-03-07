'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/lib/auth/protected-route';

export default function DashboardPage() {
  const { user, loading, isAdmin, isCleaner, isCustomer, dbRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for AuthContext to finish loading before redirecting
    if (loading || !user) return;

    if (isAdmin) {
      router.push('/dashboard/admin');
    } else if (isCleaner) {
      router.push('/dashboard/pro');
    } else if (isCustomer) {
      router.push('/dashboard/customer');
    } else {
      console.error(`[dashboard/page] No role resolved for user. dbRole="${dbRole}". Falling back to /dashboard/customer.`);
      router.push('/dashboard/customer');
    }
  }, [user, loading, isAdmin, isCleaner, isCustomer, dbRole, router]);

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
