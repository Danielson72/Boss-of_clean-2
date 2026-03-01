'use client';

import { Plus, X, Clock } from 'lucide-react';

export interface TimeSlot {
  start: string; // "08:00"
  end: string;   // "12:00"
}

export interface DaySchedule {
  enabled: boolean;
  slots: TimeSlot[];
}

// weekly_schedule jsonb shape: { "0": DaySchedule, "1": DaySchedule, ... }
// Keys are day-of-week indices: 0=Monday ... 6=Sunday
export type WeeklyScheduleData = Record<string, DaySchedule>;

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DEFAULT_SLOTS: TimeSlot[] = [
  { start: '08:00', end: '12:00' },
  { start: '13:00', end: '17:00' },
];

interface WeeklyScheduleProps {
  schedule: WeeklyScheduleData;
  onChange: (schedule: WeeklyScheduleData) => void;
}

export function WeeklySchedule({ schedule, onChange }: WeeklyScheduleProps) {
  const toggleDay = (dayIndex: number) => {
    const key = String(dayIndex);
    const current = schedule[key] || { enabled: false, slots: [] };
    const enabled = !current.enabled;
    onChange({
      ...schedule,
      [key]: {
        enabled,
        slots: enabled && current.slots.length === 0 ? [...DEFAULT_SLOTS] : current.slots,
      },
    });
  };

  const addSlot = (dayIndex: number) => {
    const key = String(dayIndex);
    const day = schedule[key];
    if (!day) return;
    const lastSlot = day.slots[day.slots.length - 1];
    const newStart = lastSlot ? lastSlot.end : '08:00';
    const newEnd = incrementTime(newStart, 2);
    onChange({
      ...schedule,
      [key]: { ...day, slots: [...day.slots, { start: newStart, end: newEnd }] },
    });
  };

  const removeSlot = (dayIndex: number, slotIndex: number) => {
    const key = String(dayIndex);
    const day = schedule[key];
    if (!day) return;
    onChange({
      ...schedule,
      [key]: { ...day, slots: day.slots.filter((_, i) => i !== slotIndex) },
    });
  };

  const updateSlotTime = (
    dayIndex: number,
    slotIndex: number,
    field: 'start' | 'end',
    value: string
  ) => {
    const key = String(dayIndex);
    const day = schedule[key];
    if (!day) return;
    onChange({
      ...schedule,
      [key]: {
        ...day,
        slots: day.slots.map((slot, i) =>
          i === slotIndex ? { ...slot, [field]: value } : slot
        ),
      },
    });
  };

  return (
    <div className="space-y-3">
      {DAYS.map((dayName, dayIndex) => {
        const day = schedule[String(dayIndex)] || { enabled: false, slots: [] };

        return (
          <div
            key={dayIndex}
            className={`border rounded-lg p-4 transition-colors ${
              day.enabled ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={day.enabled}
                    onChange={() => toggleDay(dayIndex)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
                </label>
                <span
                  className={`font-medium text-sm ${
                    day.enabled ? 'text-gray-900' : 'text-gray-500'
                  }`}
                >
                  {dayName}
                </span>
              </div>
              {day.enabled && (
                <button
                  onClick={() => addSlot(dayIndex)}
                  className="text-emerald-600 hover:text-emerald-700 text-xs flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Add slot
                </button>
              )}
            </div>

            {day.enabled && day.slots.length > 0 && (
              <div className="ml-12 space-y-2">
                {day.slots.map((slot, slotIndex) => (
                  <div key={slotIndex} className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="time"
                      value={slot.start}
                      onChange={(e) =>
                        updateSlotTime(dayIndex, slotIndex, 'start', e.target.value)
                      }
                      className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                    <span className="text-gray-500 text-sm">to</span>
                    <input
                      type="time"
                      value={slot.end}
                      onChange={(e) =>
                        updateSlotTime(dayIndex, slotIndex, 'end', e.target.value)
                      }
                      className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                    {day.slots.length > 1 && (
                      <button
                        onClick={() => removeSlot(dayIndex, slotIndex)}
                        className="text-red-500 hover:text-red-600 p-1"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {day.enabled && day.slots.length === 0 && (
              <p className="ml-12 text-sm text-gray-500">No time slots configured</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function incrementTime(time: string, hours: number): string {
  const [h, m] = time.split(':').map(Number);
  const newHour = Math.min(h + hours, 20);
  return `${String(newHour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function createDefaultSchedule(): WeeklyScheduleData {
  const schedule: WeeklyScheduleData = {};
  for (let i = 0; i < 7; i++) {
    schedule[String(i)] = {
      enabled: i < 5,
      slots: i < 5 ? [...DEFAULT_SLOTS] : [],
    };
  }
  return schedule;
}
