'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft, Save, Calendar, Clock, Zap, X, CheckCircle, CalendarOff, Trash2
} from 'lucide-react';
import Link from 'next/link';
import { WeeklySchedule, DaySchedule, createDefaultSchedule } from '@/components/availability/WeeklySchedule';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ file: 'app/dashboard/cleaner/availability/page.tsx' });

interface BlockedDate {
  id?: string;
  blocked_date: string;
  reason: string;
}

export default function AvailabilityPage() {
  const { user } = useAuth();
  const [cleanerId, setCleanerId] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<DaySchedule[]>(createDefaultSchedule());
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [instantBooking, setInstantBooking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [newBlockedDate, setNewBlockedDate] = useState('');
  const [newBlockedReason, setNewBlockedReason] = useState('');
  const supabase = createClient();

  const loadAvailability = useCallback(async () => {
    if (!user) return;

    try {
      // Get cleaner ID
      const { data: cleaner, error: cleanerError } = await supabase
        .from('cleaners')
        .select('id, instant_booking')
        .eq('user_id', user.id)
        .single();

      if (cleanerError) throw cleanerError;
      if (!cleaner) return;

      setCleanerId(cleaner.id);
      setInstantBooking(cleaner.instant_booking || false);

      // Load availability slots
      const { data: slots, error: slotsError } = await supabase
        .from('cleaner_availability')
        .select('*')
        .eq('cleaner_id', cleaner.id)
        .order('day_of_week', { ascending: true });

      if (slotsError) throw slotsError;

      if (slots && slots.length > 0) {
        // Group slots by day
        const scheduleMap = new Map<number, DaySchedule>();
        for (let i = 0; i < 7; i++) {
          scheduleMap.set(i, { day_of_week: i, is_available: false, slots: [] });
        }

        slots.forEach((slot) => {
          const day = scheduleMap.get(slot.day_of_week)!;
          day.is_available = slot.is_available;
          day.slots.push({
            start_time: slot.start_time.substring(0, 5),
            end_time: slot.end_time.substring(0, 5),
          });
          scheduleMap.set(slot.day_of_week, day);
        });

        setSchedule(Array.from(scheduleMap.values()));
      }

      // Load blocked dates
      const { data: blocked, error: blockedError } = await supabase
        .from('cleaner_blocked_dates')
        .select('*')
        .eq('cleaner_id', cleaner.id)
        .order('blocked_date', { ascending: true });

      if (blockedError) throw blockedError;
      if (blocked) {
        setBlockedDates(blocked.map((b) => ({
          id: b.id,
          blocked_date: b.blocked_date,
          reason: b.reason || '',
        })));
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
      // Update instant booking on cleaners table
      const { error: cleanerError } = await supabase
        .from('cleaners')
        .update({ instant_booking: instantBooking, updated_at: new Date().toISOString() })
        .eq('id', cleanerId);

      if (cleanerError) throw cleanerError;

      // Delete existing availability slots for this cleaner
      const { error: deleteError } = await supabase
        .from('cleaner_availability')
        .delete()
        .eq('cleaner_id', cleanerId);

      if (deleteError) throw deleteError;

      // Insert new availability slots
      const slotsToInsert = schedule.flatMap((day) =>
        day.slots.map((slot) => ({
          cleaner_id: cleanerId,
          day_of_week: day.day_of_week,
          start_time: slot.start_time,
          end_time: slot.end_time,
          is_available: day.is_available,
        }))
      );

      if (slotsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('cleaner_availability')
          .insert(slotsToInsert);

        if (insertError) throw insertError;
      }

      setMessage('Availability saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      logger.error('Error saving availability', { function: 'handleSave', error });
      setMessage('Error saving availability settings');
    } finally {
      setSaving(false);
    }
  };

  const addBlockedDate = async () => {
    if (!cleanerId || !newBlockedDate) return;

    try {
      const { data, error } = await supabase
        .from('cleaner_blocked_dates')
        .insert({
          cleaner_id: cleanerId,
          blocked_date: newBlockedDate,
          reason: newBlockedReason || null,
        })
        .select()
        .single();

      if (error) throw error;

      setBlockedDates([...blockedDates, {
        id: data.id,
        blocked_date: data.blocked_date,
        reason: data.reason || '',
      }]);
      setNewBlockedDate('');
      setNewBlockedReason('');
    } catch (error) {
      logger.error('Error adding blocked date', { function: 'addBlockedDate', error });
      setMessage('Error adding blocked date');
    }
  };

  const removeBlockedDate = async (dateId: string) => {
    try {
      const { error } = await supabase
        .from('cleaner_blocked_dates')
        .delete()
        .eq('id', dateId);

      if (error) throw error;

      setBlockedDates(blockedDates.filter((d) => d.id !== dateId));
    } catch (error) {
      logger.error('Error removing blocked date', { function: 'removeBlockedDate', error });
      setMessage('Error removing blocked date');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
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
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center gap-4">
                <Link
                  href="/dashboard/cleaner"
                  className="text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="h-6 w-6" />
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">
                  Availability Settings
                </h1>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition duration-300 flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {message && (
            <div className={`mb-6 p-4 rounded-md ${
              message.includes('Error')
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}>
              <div className="flex items-center gap-2">
                {message.includes('Error') ? (
                  <X className="h-5 w-5" />
                ) : (
                  <CheckCircle className="h-5 w-5" />
                )}
                {message}
              </div>
            </div>
          )}

          <div className="space-y-8">
            {/* Instant Booking Toggle */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Zap className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Instant Booking</h2>
                    <p className="text-sm text-gray-600">
                      Allow customers to book directly without waiting for quote approval
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
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            {/* Weekly Schedule */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Weekly Schedule
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Set your regular working hours for each day of the week
              </p>
              <WeeklySchedule schedule={schedule} onChange={setSchedule} />
            </div>

            {/* Blocked Dates */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <CalendarOff className="h-5 w-5" />
                Blocked Dates
              </h2>
              <p className="text-sm text-gray-600 mb-6">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={newBlockedReason}
                    onChange={(e) => setNewBlockedReason(e.target.value)}
                    placeholder="Reason (optional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <button
                  onClick={addBlockedDate}
                  disabled={!newBlockedDate}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition duration-300 text-sm flex items-center gap-1"
                >
                  <Calendar className="h-4 w-4" />
                  Block Date
                </button>
              </div>

              {/* List of blocked dates */}
              {blockedDates.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No blocked dates. Add dates when you will be unavailable.
                </p>
              ) : (
                <div className="space-y-2">
                  {blockedDates.map((date) => (
                    <div
                      key={date.id}
                      className="flex items-center justify-between p-3 border border-red-100 bg-red-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <CalendarOff className="h-4 w-4 text-red-500" />
                        <div>
                          <span className="text-sm font-medium text-gray-900">
                            {new Date(date.blocked_date + 'T00:00:00').toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                          {date.reason && (
                            <span className="text-sm text-gray-600 ml-2">- {date.reason}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => date.id && removeBlockedDate(date.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
