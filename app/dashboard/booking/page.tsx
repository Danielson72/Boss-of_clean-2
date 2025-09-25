import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import BookingHistoryClient from './BookingHistoryClient';
// import type { Database } from '@/lib/supabase/database.types';

export default async function BookingHistoryPage() {
  const supabase = createServerComponentClient({ cookies });

  let user = null;
  let userTier: 'free' | 'growth' | 'pro' | 'enterprise' = 'growth';

  try {
    // Check authentication
    const { data: { user: authUser }, error } = await supabase.auth.getUser();

    if (error || !authUser) {
      redirect('/login?redirect=/dashboard/booking');
    }

    user = authUser;

    // Get user profile to determine tier (with error handling)
    try {
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      // Check if user is a customer (allow if profile doesn't exist or role is customer)
      if (profile && profile.role && profile.role !== 'customer') {
        redirect('/dashboard');
      }
    } catch (profileError) {
      // If profile query fails, assume customer role and continue
      console.warn('Profile query failed, assuming customer role:', profileError);
    }

    // For customers, we'll default to 'growth' tier for demo purposes
    // Skip complex subscription queries that might fail
    userTier = 'growth';

  } catch (error) {
    console.error('Server-side auth error in booking page:', error);
    redirect('/login?redirect=/dashboard/booking');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-lg">🐱</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    My Cleaning History
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Track your past and upcoming cleaning services
                  </p>
                </div>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm text-blue-600 font-medium italic">
                  &quot;Purrfection is our Standard&quot;
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BookingHistoryClient userTier={userTier} />
      </div>
    </div>
  );
}