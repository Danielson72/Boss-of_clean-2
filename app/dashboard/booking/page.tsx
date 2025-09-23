import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import BookingHistoryClient from './BookingHistoryClient';
// import type { Database } from '@/lib/supabase/database.types';

export default async function BookingHistoryPage() {
  const supabase = createServerComponentClient({ cookies });

  // Check authentication
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login?redirect=/dashboard/booking');
  }

  // Get user profile to determine tier
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  // Check if user is a customer (not cleaner or admin)
  if (profile?.role !== 'customer') {
    redirect('/dashboard');
  }

  // Get user's subscription tier (default to 'free' if not found)
  const { data: subscription } = await supabase
    .from('cleaners')
    .select('subscription_tier')
    .eq('user_id', user.id)
    .single();

  // For customers, we'll default to 'growth' tier for demo purposes
  // In production, you'd have a separate customer subscription system
  const userTier = 'growth' as 'free' | 'growth' | 'pro' | 'enterprise';

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