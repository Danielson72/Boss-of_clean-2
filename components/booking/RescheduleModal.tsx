'use client';

import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { DateTimePicker } from '@/components/booking/DateTimePicker';
import { cn } from '@/lib/utils';
import type { Booking } from '@/components/booking/BookingCard';

interface RescheduleModalProps {
  booking: Booking;
  onClose: () => void;
  onConfirm: (bookingDate: string, startTime: string, endTime: string) => Promise<void>;
}

export function RescheduleModal({ booking, onClose, onConfirm }: RescheduleModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!selectedDate || !selectedTime) return;

    setSubmitting(true);
    setError(null);

    const bookingDate = selectedDate.toISOString().split('T')[0];
    // Calculate end time based on estimated hours
    const [startH, startM] = selectedTime.split(':').map(Number);
    const endMinutes = startH * 60 + startM + booking.estimated_hours * 60;
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    try {
      await onConfirm(bookingDate, selectedTime, endTime);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reschedule booking');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Reschedule Booking</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-md"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          <div className="mb-4 p-3 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>{booking.cleaner.business_name}</strong> - {' '}
              {booking.service_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Select a new date and time for your appointment.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 rounded-md flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <DateTimePicker
            cleanerId={booking.cleaner_id}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            onDateChange={setSelectedDate}
            onTimeChange={setSelectedTime}
            estimatedHours={booking.estimated_hours}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedDate || !selectedTime || submitting}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition',
              selectedDate && selectedTime && !submitting
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            )}
          >
            {submitting ? 'Rescheduling...' : 'Confirm Reschedule'}
          </button>
        </div>
      </div>
    </div>
  );
}
