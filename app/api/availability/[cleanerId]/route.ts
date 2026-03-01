import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ file: 'api/availability/[cleanerId]/route' });

interface TimeSlot {
  start: string;
  end: string;
}

interface DaySchedule {
  enabled: boolean;
  slots: TimeSlot[];
}

type WeeklyScheduleData = Record<string, DaySchedule>;

interface DateOverride {
  date: string;
  type: 'blocked' | 'available';
  reason?: string;
  slots?: TimeSlot[];
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  return createClient(url, key);
}

/**
 * GET /api/availability/[cleanerId]?from=2026-03-01&to=2026-03-31
 *
 * Returns available time slots for the cleaner within the given date range.
 * Merges weekly schedule + date overrides - existing bookings.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { cleanerId: string } }
) {
  const { cleanerId } = params;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!from || !to) {
    return NextResponse.json(
      { error: 'from and to query params required (YYYY-MM-DD)' },
      { status: 400 }
    );
  }

  try {
    const supabase = getServiceClient();

    // Fetch cleaner availability settings
    const { data: avail, error: availError } = await supabase
      .from('cleaner_availability')
      .select('weekly_schedule, date_overrides, advance_booking_days, minimum_notice_hours, buffer_time_minutes')
      .eq('cleaner_id', cleanerId)
      .single();

    if (availError && availError.code === 'PGRST116') {
      // No availability row — return empty
      return NextResponse.json({ available: [], settings: null });
    }
    if (availError) throw availError;

    const weeklySchedule = (avail.weekly_schedule || {}) as WeeklyScheduleData;
    const dateOverrides = (avail.date_overrides || []) as DateOverride[];
    const overrideMap = new Map(dateOverrides.map((o) => [o.date, o]));

    // Fetch existing bookings in the date range
    const { data: bookings, error: bookingError } = await supabase
      .from('booking_history')
      .select('service_date, service_time, duration_hours, start_time, end_time, status')
      .eq('cleaner_id', cleanerId)
      .gte('service_date', from)
      .lte('service_date', to)
      .in('status', ['pending', 'confirmed', 'in_progress']);

    if (bookingError) {
      logger.warn('Error fetching bookings (non-fatal)', {
        function: 'GET',
        error: bookingError.message,
      });
    }

    // Build a map of booked time ranges per date
    const bookedByDate = new Map<string, { start: string; end: string }[]>();
    (bookings || []).forEach((b) => {
      const dateStr = b.service_date;
      if (!bookedByDate.has(dateStr)) bookedByDate.set(dateStr, []);

      // Use start_time/end_time if available, otherwise derive from service_time + duration
      if (b.start_time && b.end_time) {
        const start = new Date(b.start_time);
        const end = new Date(b.end_time);
        bookedByDate.get(dateStr)!.push({
          start: `${String(start.getUTCHours()).padStart(2, '0')}:${String(start.getUTCMinutes()).padStart(2, '0')}`,
          end: `${String(end.getUTCHours()).padStart(2, '0')}:${String(end.getUTCMinutes()).padStart(2, '0')}`,
        });
      } else if (b.service_time && b.duration_hours) {
        const [h, m] = b.service_time.split(':').map(Number);
        const endH = h + (b.duration_hours || 2);
        bookedByDate.get(dateStr)!.push({
          start: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
          end: `${String(Math.min(endH, 23)).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
        });
      }
    });

    const bufferMinutes = avail.buffer_time_minutes || 0;

    // Iterate over each date in range
    const available: { date: string; slots: TimeSlot[] }[] = [];
    const startDate = new Date(from + 'T00:00:00');
    const endDate = new Date(to + 'T00:00:00');

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];

      // Check for date override
      const override = overrideMap.get(dateStr);
      if (override?.type === 'blocked') {
        // Blocked — skip this date
        continue;
      }

      let daySlots: TimeSlot[];

      if (override?.type === 'available' && override.slots) {
        // Use override slots
        daySlots = override.slots;
      } else {
        // Use weekly schedule — JS getDay() returns 0=Sunday, but our keys are 0=Monday
        const jsDay = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
        const scheduleKey = String(jsDay === 0 ? 6 : jsDay - 1); // Convert to 0=Mon, 6=Sun
        const daySchedule = weeklySchedule[scheduleKey];

        if (!daySchedule?.enabled || !daySchedule.slots?.length) {
          continue;
        }
        daySlots = daySchedule.slots;
      }

      // Subtract booked slots + buffer time
      const booked = bookedByDate.get(dateStr) || [];
      const openSlots = subtractBookings(daySlots, booked, bufferMinutes);

      if (openSlots.length > 0) {
        available.push({ date: dateStr, slots: openSlots });
      }
    }

    return NextResponse.json({
      available,
      settings: {
        advance_booking_days: avail.advance_booking_days,
        minimum_notice_hours: avail.minimum_notice_hours,
        buffer_time_minutes: avail.buffer_time_minutes,
      },
    });
  } catch (error) {
    logger.error('Error fetching availability', { function: 'GET', cleanerId }, error);
    return NextResponse.json(
      { error: 'Failed to fetch availability' },
      { status: 500 }
    );
  }
}

/**
 * Subtract booked time ranges (with buffer) from available slots.
 * Returns remaining open time ranges.
 */
function subtractBookings(
  slots: TimeSlot[],
  booked: { start: string; end: string }[],
  bufferMinutes: number
): TimeSlot[] {
  if (booked.length === 0) return slots;

  // Convert booked to minutes with buffer
  const bookedRanges = booked.map((b) => ({
    start: timeToMinutes(b.start) - bufferMinutes,
    end: timeToMinutes(b.end) + bufferMinutes,
  }));

  const result: TimeSlot[] = [];

  for (const slot of slots) {
    let ranges = [{ start: timeToMinutes(slot.start), end: timeToMinutes(slot.end) }];

    for (const booked of bookedRanges) {
      const next: { start: number; end: number }[] = [];
      for (const range of ranges) {
        // No overlap
        if (range.end <= booked.start || range.start >= booked.end) {
          next.push(range);
          continue;
        }
        // Left portion
        if (range.start < booked.start) {
          next.push({ start: range.start, end: booked.start });
        }
        // Right portion
        if (range.end > booked.end) {
          next.push({ start: booked.end, end: range.end });
        }
      }
      ranges = next;
    }

    for (const range of ranges) {
      // Only include slots that are at least 30 minutes long
      if (range.end - range.start >= 30) {
        result.push({
          start: minutesToTime(range.start),
          end: minutesToTime(range.end),
        });
      }
    }
  }

  return result;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
