'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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

  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Store the element that was focused before modal opened
  useEffect(() => {
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Focus the close button when modal opens
    closeButtonRef.current?.focus();

    return () => {
      // Return focus to the previously focused element when modal closes
      previousActiveElement.current?.focus();
    };
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Focus trap
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleConfirm = useCallback(async () => {
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
  }, [selectedDate, selectedTime, booking.estimated_hours, onConfirm]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reschedule-modal-title"
      aria-describedby="reschedule-modal-description"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
        role="document"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 id="reschedule-modal-title" className="text-lg font-semibold text-gray-900">
            Reschedule Booking
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          <div className="mb-4 p-3 bg-blue-50 rounded-md" id="reschedule-modal-description">
            <p className="text-sm text-blue-800">
              <strong>{booking.cleaner.business_name}</strong> -{' '}
              {booking.service_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Select a new date and time for your appointment.
            </p>
          </div>

          {error && (
            <div
              className="mb-4 p-3 bg-red-50 rounded-md flex items-start gap-2"
              role="alert"
              aria-live="assertive"
            >
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
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
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedDate || !selectedTime || submitting}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              selectedDate && selectedTime && !submitting
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            )}
            aria-busy={submitting}
          >
            {submitting ? 'Rescheduling...' : 'Confirm Reschedule'}
          </button>
        </div>
      </div>
    </div>
  );
}
