'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { createClient } from '@/lib/supabase/client';
import {
  NotificationPreferences,
  NotificationPreferencesData,
} from '@/components/settings/NotificationPreferences';
import { ArrowLeft, Bell, Settings } from 'lucide-react';
import Link from 'next/link';

export default function CustomerNotificationsPage() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferencesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('notification_preferences')
        .select('booking_updates, messages, promotions, review_requests')
        .eq('user_id', user?.id)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No preferences found, create default ones
          const { data: newData, error: insertError } = await supabase
            .from('notification_preferences')
            .insert({ user_id: user?.id })
            .select('booking_updates, messages, promotions, review_requests')
            .single();

          if (insertError) throw insertError;
          setPreferences(newData);
        } else {
          throw fetchError;
        }
      } else {
        setPreferences(data);
      }
    } catch (err) {
      setError('Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePreferences = async (newPreferences: NotificationPreferencesData) => {
    const { error: updateError } = await supabase
      .from('notification_preferences')
      .update({
        booking_updates: newPreferences.booking_updates,
        messages: newPreferences.messages,
        promotions: newPreferences.promotions,
        review_requests: newPreferences.review_requests,
      })
      .eq('user_id', user?.id);

    if (updateError) {
      throw updateError;
    }

    setPreferences(newPreferences);
  };

  return (
    <ProtectedRoute requireRole="customer">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-6">
              <div className="flex items-center gap-4">
                <Link
                  href="/dashboard/customer"
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span className="hidden sm:inline">Back to Dashboard</span>
                </Link>
              </div>
              <div className="flex items-center gap-2">
                <Bell className="h-6 w-6 text-blue-600" />
                <h1 className="text-xl font-semibold text-gray-900">Notification Settings</h1>
              </div>
              <Link
                href="/settings"
                className="text-gray-600 hover:text-gray-900"
                aria-label="Account Settings"
              >
                <Settings className="h-6 w-6" />
              </Link>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Email Notifications</h2>
              <p className="text-gray-600">
                Choose which email notifications you would like to receive. You can change these
                settings at any time.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">
                {error}
                <button
                  onClick={loadPreferences}
                  className="ml-2 underline hover:no-underline"
                >
                  Try again
                </button>
              </div>
            )}

            <NotificationPreferences
              preferences={preferences || {
                booking_updates: true,
                messages: true,
                promotions: true,
                review_requests: true,
              }}
              onUpdate={handleUpdatePreferences}
              loading={loading}
            />
          </div>

          {/* Unsubscribe info */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              You can also unsubscribe from specific notification types using the link at the bottom
              of any email we send you.
            </p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
