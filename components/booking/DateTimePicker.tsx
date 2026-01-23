'use client';

import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Clock } from 'lucide-react';

interface TimeSlot {
  start_time: string;
  end_time: string;
}

interface AvailabilitySlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface DateTimePickerProps {
  cleanerId: string;
  selectedDate: Date | undefined;
  selectedTime: string | undefined;
  onDateChange: (date: Date | undefined) => void;
  onTimeChange: (time: string | undefined) => void;
  estimatedHours: number;
}

function generateTimeSlots(
  availability: AvailabilitySlot[],
  dayOfWeek: number,
  estimatedHours: number
): TimeSlot[] {
  const daySlots = availability.filter(
    (s) => s.day_of_week === dayOfWeek && s.is_available
  );

  const slots: TimeSlot[] = [];

  for (const slot of daySlots) {
    const [startH, startM] = slot.start_time.split(':').map(Number);
    const [endH, endM] = slot.end_time.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const durationMinutes = estimatedHours * 60;

    for (let t = startMinutes; t + durationMinutes <= endMinutes; t += 60) {
      const slotStartH = Math.floor(t / 60);
      const slotStartM = t % 60;
      const slotEndH = Math.floor((t + durationMinutes) / 60);
      const slotEndM = (t + durationMinutes) % 60;

      slots.push({
        start_time: `${String(slotStartH).padStart(2, '0')}:${String(slotStartM).padStart(2, '0')}`,
        end_time: `${String(slotEndH).padStart(2, '0')}:${String(slotEndM).padStart(2, '0')}`,
      });
    }
  }

  return slots;
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

// Convert JS Date.getDay() (0=Sunday) to schema day_of_week (0=Monday)
function jsToSchemaDow(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

export function DateTimePicker({
  cleanerId,
  selectedDate,
  selectedTime,
  onDateChange,
  onTimeChange,
  estimatedHours,
}: DateTimePickerProps) {
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  const [existingBookings, setExistingBookings] = useState<
    { booking_date: string; start_time: string; end_time: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  useEffect(() => {
    async function fetchAvailability() {
      setLoading(true);
      try {
        const res = await fetch(`/api/bookings/availability?cleanerId=${cleanerId}`);
        if (res.ok) {
          const data = await res.json();
          setAvailability(data.availability || []);
          setBlockedDates(
            (data.blockedDates || []).map(
              (d: { blocked_date: string }) => new Date(d.blocked_date + 'T00:00:00')
            )
          );
          setExistingBookings(data.existingBookings || []);
        }
      } catch (err) {
        console.error('Failed to fetch availability:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAvailability();
  }, [cleanerId]);

  useEffect(() => {
    if (!selectedDate) {
      setTimeSlots([]);
      return;
    }

    const dow = jsToSchemaDow(selectedDate.getDay());
    const allSlots = generateTimeSlots(availability, dow, estimatedHours);

    // Filter out slots that overlap with existing bookings on this date
    const dateStr = selectedDate.toISOString().split('T')[0];
    const dayBookings = existingBookings.filter((b) => b.booking_date === dateStr);

    const availableSlots = allSlots.filter((slot) => {
      return !dayBookings.some((booking) => {
        return slot.start_time < booking.end_time && slot.end_time > booking.start_time;
      });
    });

    setTimeSlots(availableSlots);
    // Reset time if previously selected slot is no longer available
    if (selectedTime && !availableSlots.find((s) => s.start_time === selectedTime)) {
      onTimeChange(undefined);
    }
  }, [selectedDate, availability, existingBookings, estimatedHours, selectedTime, onTimeChange]);

  // Determine which days of week have availability
  const availableDows = new Set(
    availability.filter((s) => s.is_available).map((s) => s.day_of_week)
  );

  const isDateDisabled = (date: Date): boolean => {
    // Past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;

    // Check if day of week has availability
    const dow = jsToSchemaDow(date.getDay());
    if (!availableDows.has(dow)) return true;

    // Check blocked dates
    const dateStr = date.toISOString().split('T')[0];
    if (blockedDates.some((d) => d.toISOString().split('T')[0] === dateStr)) return true;

    return false;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-20 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (availability.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>This cleaner hasn&apos;t set up their availability yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Selection */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Select a Date</h3>
        <div className="border rounded-lg p-2 inline-block">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={onDateChange}
            disabled={isDateDisabled}
            fromDate={new Date()}
          />
        </div>
      </div>

      {/* Time Selection */}
      {selectedDate && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Available Times for{' '}
            {selectedDate.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </h3>
          {timeSlots.length === 0 ? (
            <p className="text-sm text-gray-500">
              No available time slots for this date. Please select another date.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {timeSlots.map((slot) => (
                <button
                  key={slot.start_time}
                  type="button"
                  onClick={() => onTimeChange(slot.start_time)}
                  className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                    selectedTime === slot.start_time
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                  }`}
                >
                  {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
