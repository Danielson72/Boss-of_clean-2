'use client';

import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Bell, MessageSquare, Mail, Star, CheckCircle, XCircle } from 'lucide-react';

export interface NotificationPreferencesData {
  booking_updates: boolean;
  messages: boolean;
  promotions: boolean;
  review_requests: boolean;
}

interface NotificationPreferencesProps {
  preferences: NotificationPreferencesData;
  onUpdate: (preferences: NotificationPreferencesData) => Promise<void>;
  loading?: boolean;
}

interface NotificationOption {
  key: keyof NotificationPreferencesData;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const notificationOptions: NotificationOption[] = [
  {
    key: 'booking_updates',
    label: 'Booking Updates',
    description: 'Receive updates about your bookings, including confirmations, changes, and completions.',
    icon: <Bell className="h-5 w-5" />,
  },
  {
    key: 'messages',
    label: 'Messages',
    description: 'Get notified when cleaners send you messages or respond to your inquiries.',
    icon: <MessageSquare className="h-5 w-5" />,
  },
  {
    key: 'promotions',
    label: 'Promotions & Offers',
    description: 'Receive special offers, discounts, and promotional content from Boss of Clean.',
    icon: <Mail className="h-5 w-5" />,
  },
  {
    key: 'review_requests',
    label: 'Review Requests',
    description: 'Receive reminders to review cleaners after your bookings are completed.',
    icon: <Star className="h-5 w-5" />,
  },
];

export function NotificationPreferences({
  preferences,
  onUpdate,
  loading = false,
}: NotificationPreferencesProps) {
  const [localPreferences, setLocalPreferences] = useState<NotificationPreferencesData>(preferences);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setLocalPreferences(preferences);
  }, [preferences]);

  const handleToggle = async (key: keyof NotificationPreferencesData) => {
    if (saving) return;

    setSaving(key);
    setMessage(null);

    const newPreferences = {
      ...localPreferences,
      [key]: !localPreferences[key],
    };

    setLocalPreferences(newPreferences);

    try {
      await onUpdate(newPreferences);
      setMessage({ type: 'success', text: 'Preferences updated successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setLocalPreferences(preferences);
      setMessage({ type: 'error', text: 'Failed to update preferences' });
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between p-4 bg-gray-100 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div>
                <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-48 bg-gray-200 rounded" />
              </div>
            </div>
            <div className="w-11 h-6 bg-gray-200 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {message && (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <XCircle className="h-5 w-5" />
          )}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      {notificationOptions.map((option) => (
        <div
          key={option.key}
          className="flex items-center justify-between p-4 bg-white border rounded-lg hover:shadow-sm transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-50 text-blue-600 rounded-full">
              {option.icon}
            </div>
            <div>
              <h4 className="font-medium text-gray-900">{option.label}</h4>
              <p className="text-sm text-gray-500">{option.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saving === option.key && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
            )}
            <Switch
              checked={localPreferences[option.key]}
              onCheckedChange={() => handleToggle(option.key)}
              disabled={saving !== null}
              aria-label={`Toggle ${option.label}`}
            />
          </div>
        </div>
      ))}

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          <strong>Note:</strong> Even with notifications turned off, we may still send you important
          account-related emails, such as password resets and security alerts.
        </p>
      </div>
    </div>
  );
}
