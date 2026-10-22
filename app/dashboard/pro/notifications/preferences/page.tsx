'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, MessageSquare, Smartphone, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/context/AuthContext';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import {
  NotificationPreferences,
  type NotificationOption,
  type NotificationPreferencesData,
} from '@/components/settings/NotificationPreferences';

const PREF_COLUMNS = 'booking_updates, messages, promotions, review_requests, sms_new_leads, sms_new_messages';

const SMS_LOCKED_NOTE = 'Add your mobile number and agree to text alerts in Profile';

export default function ProNotificationPreferencesPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [preferences, setPreferences] = useState<NotificationPreferencesData | null>(null);
  const [smsConsent, setSmsConsent] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      try {
        // Does this pro have SMS consent on file? Drives whether the text
        // toggles are live or read-only.
        const { data: pro } = await supabase
          .from('pros')
          .select('sms_consent_at')
          .eq('user_id', user.id)
          .maybeSingle();
        setSmsConsent(!!pro?.sms_consent_at);

        const { data, error } = await supabase
          .from('notification_preferences')
          .select(PREF_COLUMNS)
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setPreferences(data as unknown as NotificationPreferencesData);
          return;
        }

        // First visit: create the row and let the column defaults apply
        // (email/in-app categories true, SMS false).
        const { data: created, error: insertError } = await supabase
          .from('notification_preferences')
          .insert({ user_id: user.id })
          .select(PREF_COLUMNS)
          .single();

        if (insertError) throw insertError;
        setPreferences(created as unknown as NotificationPreferencesData);
      } catch {
        setPreferences(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  const handleUpdate = async (next: NotificationPreferencesData) => {
    if (!user) return;
    const { error } = await supabase
      .from('notification_preferences')
      .update({
        booking_updates: next.booking_updates,
        messages: next.messages,
        sms_new_leads: next.sms_new_leads,
        sms_new_messages: next.sms_new_messages,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (error) throw error;
    setPreferences(next);
  };

  const options: NotificationOption[] = [
    {
      key: 'booking_updates',
      label: 'New leads and hires',
      description:
        'Get an email and a dashboard alert when a new lead arrives or a customer confirms a hire.',
      icon: <Bell className="h-5 w-5" />,
    },
    {
      key: 'sms_new_leads',
      label: 'Text me about new leads',
      description: 'Send a text message when a new lead arrives.',
      icon: <Smartphone className="h-5 w-5" />,
      disabled: !smsConsent,
      disabledNote: smsConsent ? undefined : SMS_LOCKED_NOTE,
    },
    {
      key: 'messages',
      label: 'Messages',
      description: 'Get an email and a dashboard alert when a customer sends you a message.',
      icon: <MessageSquare className="h-5 w-5" />,
    },
    {
      key: 'sms_new_messages',
      label: 'Text me about messages',
      description: 'Send a text message when a customer sends you a message.',
      icon: <Smartphone className="h-5 w-5" />,
      disabled: !smsConsent,
      disabledNote: smsConsent ? undefined : SMS_LOCKED_NOTE,
    },
  ];

  return (
    <ProtectedRoute requireRole="cleaner">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link
          href="/dashboard/pro/notifications"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to notifications
        </Link>

        <h1 className="mt-4 text-2xl font-bold text-gray-900">Notification preferences</h1>
        <p className="mt-1 text-sm text-gray-600">
          Choose how Boss of Clean reaches you about your work.
        </p>

        <div className="mt-6">
          <NotificationPreferences
            preferences={
              preferences ?? {
                booking_updates: true,
                messages: true,
                promotions: true,
                review_requests: true,
                sms_new_leads: false,
                sms_new_messages: false,
              }
            }
            onUpdate={handleUpdate}
            loading={loading}
            options={options}
            footerNote="Payment receipts and account emails, such as password resets, are always sent. Text messages also stop any time you reply STOP."
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}
