'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/context/AuthContext';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft, Save, Calendar, Clock, Zap, X, CheckCircle,
  CalendarOff, Trash2, Settings2, Link2
} from 'lucide-react';
import Link from 'next/link';
import { type WeeklyScheduleData, createDefaultSchedule } from '@/components/availability/WeeklySchedule';
import { createLogger } from '@/lib/utils/logger';

const WeeklySchedule = dynamic(
  () => import('@/components/availability/WeeklySchedule').then((mod) => mod.WeeklySchedule),
  {
    loading: () => (
      <div className="space-y-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-4 bg-gray-50 animate-pulse">
            <div className="h-5 w-32 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    ),
    ssr: false,
  }
);

const logger = createLogger({ file: 'app/dashboard/pro/availability/page.tsx' });

interface DateOverride {
  date: string;       // "2026-03-15"
  type: 'blocked' | 'available';
  reason?: string;
  slots?: { start: string; end: string }[];
}

export default function AvailabilityPage() {
  const { user } = useAuth();
  const [cleanerId, setCleanerId] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<WeeklyScheduleData>(createDefaultSchedule());
  const [dateOverrides, setDateOverrides] = useState<DateOverride[]>([]);
  const [instantBooking, setInstantBooking] = useState(false);
  const [advanceBookingDays, setAdvanceBookingDays] = useState(30);
  const [minimumNoticeHours, setMinimumNoticeHours] = useState(24);
  const [bufferTimeMinutes, setBufferTimeMinutes] = useState(30);
  const [externalCalendarUrl, setExternalCalendarUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [newBlockedDate, setNewBlockedDate] = useState('');
  const [newBlockedReason, setNewBlockedReason] = useState('');
  const supabase = createClient();

  const loadAvailability = useCallback(async () => {
    if (!user) return;

    try {
      // Get cleaner ID and instant_booking setting
      const { data: cleaner, error: cleanerError } = await supabase
        .from('cleaners')
        .select('id, instant_booking')
        .eq('user_id', user.id)
        .single();

      if (cleanerError) throw cleanerError;
      if (!cleaner) return;

      setCleanerId(cleaner.id);
      setInstantBooking(cleaner.instant_booking || false);

      // Load availability row (one row per cleaner)
      const { data: avail, error: availError } = await supabase
        .from('cleaner_availability')
        .select('*')
        .eq('cleaner_id', cleaner.id)
        .single();

      if (availError && availError.code !== 'PGRST116') throw availError;

      if (avail) {
        if (avail.weekly_schedule && Object.keys(avail.weekly_schedule).length > 0) {
          setSchedule(avail.weekly_schedule as WeeklyScheduleData);
        }
        if (Array.isArray(avail.date_overrides)) {
          setDateOverrides(avail.date_overrides as DateOverride[]);
        }
        setAdvanceBookingDays(avail.advance_booking_days ?? 30);
        setMinimumNoticeHours(avail.minimum_notice_hours ?? 24);
        setBufferTimeMinutes(avail.buffer_time_minutes ?? 30);
        setExternalCalendarUrl(avail.external_calendar_url || '');
      }
    } catch (error) {
      logger.error('Error loading availability', { function: 'loadAvailability', error });
      setMessage('Error loading availability settings');
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  const handleSave = async () => {
    if (!cleanerId) return;

    setSaving(true);
    setMessage('');

    try {
      // Update instant_booking on cleaners table
      const { error: cleanerError } = await supabase
        .from('cleaners')
        .update({ instant_booking: instantBooking, updated_at: new Date().toISOString() })
        .eq('id', cleanerId);

      if (cleanerError) throw cleanerError;

      // Upsert cleaner_availability row
      const { error: availError } = await supabase
        .from('cleaner_availability')
        .upsert(
          {
            cleaner_id: cleanerId,
            weekly_schedule: schedule,
            date_overrides: dateOverrides,
            advance_booking_days: advanceBookingDays,
            minimum_notice_hours: minimumNoticeHours,
            buffer_time_minutes: bufferTimeMinutes,
            external_calendar_url: externalCalendarUrl || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'cleaner_id' }
        );

      if (availError) throw availError;

      setMessage('Availability saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      logger.error('Error saving availability', { function: 'handleSave', error });
      setMessage('Error saving availability settings');
    } finally {
      setSaving(false);
    }
  };

  const addBlockedDate = () => {
    if (!newBlockedDate) return;

    // Check for duplicate
    if (dateOverrides.some((d) => d.date === newBlockedDate)) {
      setMessage('Error: This date already has an override');
      return;
    }

    setDateOverrides([
      ...dateOverrides,
      {
        date: newBlockedDate,
        type: 'blocked',
        reason: newBlockedReason || undefined,
      },
    ]);
    setNewBlockedDate('');
    setNewBlockedReason('');
  };

  const removeOverride = (date: string) => {
    setDateOverrides(dateOverrides.filter((d) => d.date !== date));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading availability...</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute requireRole="cleaner">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4 sm:py-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <Link
                  href="/dashboard/pro"
                  className="text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                </Link>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                    Availability Settings
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                    Set your working hours and blocked dates
                  </p>
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-emerald-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-emerald-700 disabled:bg-emerald-400 transition flex items-center gap-2 text-sm sm:text-base font-medium"
              >
                <Save className="h-4 w-4" />
                <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save Changes'}</span>
                <span className="sm:hidden">{saving ? 'Saving' : 'Save'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {message && (
            <div
              className={`mb-6 p-4 rounded-lg text-sm ${
                message.includes('Error')
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-green-50 text-green-700 border border-green-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {message.includes('Error') ? (
                  <X className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                )}
                {message}
              </div>
            </div>
          )}

          <div className="space-y-6 sm:space-y-8">
            {/* Instant Booking Toggle */}
            <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Zap className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                      Instant Booking
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Let customers book directly without waiting for approval
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={instantBooking}
                    onChange={(e) => setInstantBooking(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                </label>
              </div>
            </div>

            {/* Weekly Schedule */}
            <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-700" />
                Weekly Schedule
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mb-5">
                Set your regular working hours for each day of the week
              </p>
              <WeeklySchedule schedule={schedule} onChange={setSchedule} />
            </div>

            {/* Blocked Dates */}
            <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <CalendarOff className="h-5 w-5 text-gray-700" />
                Blocked Dates
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mb-5">
                Block specific dates when you are unavailable (vacations, holidays, etc.)
              </p>

              {/* Add new blocked date */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="flex-1">
                  <input
                    type="date"
                    value={newBlockedDate}
                    onChange={(e) => setNewBlockedDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={newBlockedReason}
                    onChange={(e) => setNewBlockedReason(e.target.value)}
                    placeholder="Reason (optional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                  />
                </div>
                <button
                  onClick={addBlockedDate}
                  disabled={!newBlockedDate}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition text-sm flex items-center justify-center gap-1"
                >
                  <Calendar className="h-4 w-4" />
                  Block Date
                </button>
              </div>

              {/* List of blocked dates */}
              {dateOverrides.filter((d) => d.type === 'blocked').length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No blocked dates. Add dates when you will be unavailable.
                </p>
              ) : (
                <div className="space-y-2">
                  {dateOverrides
                    .filter((d) => d.type === 'blocked')
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((override) => (
                      <div
                        key={override.date}
                        className="flex items-center justify-between p-3 border border-red-100 bg-red-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <CalendarOff className="h-4 w-4 text-red-500 flex-shrink-0" />
                          <div>
                            <span className="text-sm font-medium text-gray-900">
                              {new Date(override.date + 'T00:00:00').toLocaleDateString(
                                'en-US',
                                {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                }
                              )}
                            </span>
                            {override.reason && (
                              <span className="text-sm text-gray-600 ml-2">
                                - {override.reason}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => removeOverride(override.date)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Booking Preferences */}
            <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-gray-700" />
                Booking Preferences
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mb-5">
                Control how far in advance customers can book and minimum notice required
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Advance Booking (days)
                  </label>
                  <input
                    type="number"
                    value={advanceBookingDays}
                    onChange={(e) => setAdvanceBookingDays(Number(e.target.value))}
                    min={1}
                    max={365}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    How far ahead customers can book
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Minimum Notice (hours)
                  </label>
                  <input
                    type="number"
                    value={minimumNoticeHours}
                    onChange={(e) => setMinimumNoticeHours(Number(e.target.value))}
                    min={1}
                    max={168}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Minimum hours before a booking
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Buffer Time (minutes)
                  </label>
                  <input
                    type="number"
                    value={bufferTimeMinutes}
                    onChange={(e) => setBufferTimeMinutes(Number(e.target.value))}
                    min={0}
                    max={120}
                    step={15}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Gap between bookings
                  </p>
                </div>
              </div>
            </div>

            {/* External Calendar */}
            <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <Link2 className="h-5 w-5 text-gray-700" />
                External Calendar (Coming Soon)
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mb-5">
                Paste your iCal URL to sync with Google Calendar, Outlook, or Apple Calendar
              </p>

              <input
                type="url"
                value={externalCalendarUrl}
                onChange={(e) => setExternalCalendarUrl(e.target.value)}
                placeholder="https://calendar.google.com/calendar/ical/..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
              />
              <p className="mt-2 text-xs text-gray-400">
                Calendar sync will be available in a future update. Your URL will be saved for when it launches.
              </p>
            </div>
          </div>

          {/* Bottom Save Button (mobile convenience) */}
          <div className="mt-8 sm:hidden">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 disabled:bg-emerald-400 transition flex items-center justify-center gap-2 font-medium"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save All Changes'}
            </button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
