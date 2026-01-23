'use client';

import { useState } from 'react';
import { Clock, Plus, X } from 'lucide-react';

export interface TimeSlot {
  start_time: string;
  end_time: string;
}

export interface DaySchedule {
  day_of_week: number;
  is_available: boolean;
  slots: TimeSlot[];
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DEFAULT_SLOTS: TimeSlot[] = [
  { start_time: '08:00', end_time: '12:00' },
  { start_time: '13:00', end_time: '17:00' },
];

interface WeeklyScheduleProps {
  schedule: DaySchedule[];
  onChange: (schedule: DaySchedule[]) => void;
}

export function WeeklySchedule({ schedule, onChange }: WeeklyScheduleProps) {
  const toggleDay = (dayIndex: number) => {
    const updated = schedule.map((day) => {
      if (day.day_of_week === dayIndex) {
        const isAvailable = !day.is_available;
        return {
          ...day,
          is_available: isAvailable,
          slots: isAvailable && day.slots.length === 0 ? [...DEFAULT_SLOTS] : day.slots,
        };
      }
      return day;
    });
    onChange(updated);
  };

  const addSlot = (dayIndex: number) => {
    const updated = schedule.map((day) => {
      if (day.day_of_week === dayIndex) {
        const lastSlot = day.slots[day.slots.length - 1];
        const newStart = lastSlot ? lastSlot.end_time : '08:00';
        const newEnd = incrementTime(newStart, 2);
        return {
          ...day,
          slots: [...day.slots, { start_time: newStart, end_time: newEnd }],
        };
      }
      return day;
    });
    onChange(updated);
  };

  const removeSlot = (dayIndex: number, slotIndex: number) => {
    const updated = schedule.map((day) => {
      if (day.day_of_week === dayIndex) {
        const slots = day.slots.filter((_, i) => i !== slotIndex);
        return { ...day, slots };
      }
      return day;
    });
    onChange(updated);
  };

  const updateSlotTime = (dayIndex: number, slotIndex: number, field: 'start_time' | 'end_time', value: string) => {
    const updated = schedule.map((day) => {
      if (day.day_of_week === dayIndex) {
        const slots = day.slots.map((slot, i) => {
          if (i === slotIndex) {
            return { ...slot, [field]: value };
          }
          return slot;
        });
        return { ...day, slots };
      }
      return day;
    });
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {schedule.map((day) => (
        <div
          key={day.day_of_week}
          className={`border rounded-lg p-4 transition-colors ${
            day.is_available ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200 bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={day.is_available}
                  onChange={() => toggleDay(day.day_of_week)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
              <span className={`font-medium text-sm ${day.is_available ? 'text-gray-900' : 'text-gray-500'}`}>
                {DAYS[day.day_of_week]}
              </span>
            </div>
            {day.is_available && (
              <button
                onClick={() => addSlot(day.day_of_week)}
                className="text-blue-600 hover:text-blue-700 text-xs flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                Add slot
              </button>
            )}
          </div>

          {day.is_available && day.slots.length > 0 && (
            <div className="ml-12 space-y-2">
              {day.slots.map((slot, slotIndex) => (
                <div key={slotIndex} className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="time"
                    value={slot.start_time}
                    onChange={(e) => updateSlotTime(day.day_of_week, slotIndex, 'start_time', e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="text-gray-500 text-sm">to</span>
                  <input
                    type="time"
                    value={slot.end_time}
                    onChange={(e) => updateSlotTime(day.day_of_week, slotIndex, 'end_time', e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {day.slots.length > 1 && (
                    <button
                      onClick={() => removeSlot(day.day_of_week, slotIndex)}
                      className="text-red-500 hover:text-red-600 p-1"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {day.is_available && day.slots.length === 0 && (
            <p className="ml-12 text-sm text-gray-500">No time slots configured</p>
          )}
        </div>
      ))}
    </div>
  );
}

function incrementTime(time: string, hours: number): string {
  const [h, m] = time.split(':').map(Number);
  const newHour = Math.min(h + hours, 23);
  return `${String(newHour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function createDefaultSchedule(): DaySchedule[] {
  return Array.from({ length: 7 }, (_, i) => ({
    day_of_week: i,
    is_available: i < 5, // Mon-Fri enabled by default
    slots: i < 5 ? [...DEFAULT_SLOTS] : [],
  }));
}
