'use client';

import { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Home,
  DollarSign,
  User,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CleanerBooking {
  id: string;
  cleaner_id: string;
  customer_id: string;
  service_type: string;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  booking_date: string;
  start_time: string;
  end_time: string;
  zip_code: string;
  address: string;
  special_instructions?: string;
  estimated_price: number;
  estimated_hours: number;
  status: 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  cancellation_reason?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
  customer: {
    full_name: string;
    email: string;
    phone?: string;
  };
}

interface CleanerBookingListProps {
  bookings: CleanerBooking[];
  onConfirm: (bookingId: string) => void;
  onDecline: (bookingId: string, reason: string) => void;
  onComplete: (bookingId: string) => void;
  actionLoading: string | null;
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatServiceType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getStatusStyles(status: string): string {
  switch (status) {
    case 'confirmed':
      return 'text-green-700 bg-green-100';
    case 'cancelled':
      return 'text-red-700 bg-red-100';
    case 'completed':
      return 'text-blue-700 bg-blue-100';
    case 'no_show':
      return 'text-orange-700 bg-orange-100';
    default:
      return 'text-gray-700 bg-gray-100';
  }
}

function isUpcoming(booking: CleanerBooking): boolean {
  const bookingDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
  return bookingDateTime > new Date();
}

function isPastConfirmed(booking: CleanerBooking): boolean {
  const bookingEnd = new Date(`${booking.booking_date}T${booking.end_time}`);
  return booking.status === 'confirmed' && bookingEnd < new Date();
}

export function CleanerBookingList({
  bookings,
  onConfirm,
  onDecline,
  onComplete,
  actionLoading,
}: CleanerBookingListProps) {
  const [declineBookingId, setDeclineBookingId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  const handleDeclineSubmit = (bookingId: string) => {
    onDecline(bookingId, declineReason || 'Declined by cleaner');
    setDeclineBookingId(null);
    setDeclineReason('');
  };

  if (bookings.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
        <p className="text-gray-600">Bookings from customers will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map((booking) => {
        const upcoming = isUpcoming(booking);
        const pastConfirmed = isPastConfirmed(booking);

        return (
          <div
            key={booking.id}
            className={cn(
              'border rounded-lg p-6 transition duration-300',
              booking.status === 'cancelled'
                ? 'opacity-75 bg-gray-50'
                : 'bg-white hover:shadow-md'
            )}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                {/* Header: customer name + status */}
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {booking.customer.full_name}
                  </h3>
                  <span
                    className={cn(
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                      getStatusStyles(booking.status)
                    )}
                  >
                    {booking.status === 'no_show'
                      ? 'No Show'
                      : booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </span>
                  {pastConfirmed && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-orange-700 bg-orange-100">
                      Ready to Complete
                    </span>
                  )}
                  {upcoming && booking.status === 'confirmed' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-blue-700 bg-blue-100">
                      Upcoming
                    </span>
                  )}
                </div>

                {/* Booking details grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span>{formatDate(booking.booking_date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span>
                      {formatTime(booking.start_time)} - {formatTime(booking.end_time)} (
                      {booking.estimated_hours}h)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-blue-600" />
                    <span>
                      {formatServiceType(booking.service_type)} - {booking.bedrooms}bd/
                      {booking.bathrooms}ba
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">
                      ${booking.estimated_price.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <span>{booking.address || booking.zip_code}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-600" />
                    <span>{booking.customer.full_name}</span>
                  </div>
                  {booking.customer.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-blue-600" />
                      <span>{booking.customer.email}</span>
                    </div>
                  )}
                  {booking.customer.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-blue-600" />
                      <span>{booking.customer.phone}</span>
                    </div>
                  )}
                </div>

                {/* Special instructions */}
                {booking.special_instructions && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-700">
                      <strong>Notes:</strong> {booking.special_instructions}
                    </p>
                  </div>
                )}

                {/* Cancellation reason */}
                {booking.status === 'cancelled' && booking.cancellation_reason && (
                  <div className="mt-3 p-3 bg-red-50 rounded-md">
                    <p className="text-sm text-red-700">
                      <strong>Cancellation reason:</strong> {booking.cancellation_reason}
                    </p>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="ml-4 flex flex-col gap-2">
                {booking.status === 'confirmed' && upcoming && (
                  <>
                    <button
                      onClick={() => onConfirm(booking.id)}
                      disabled={actionLoading === booking.id}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-2 text-sm rounded-md transition',
                        actionLoading === booking.id
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'text-green-700 bg-green-50 hover:bg-green-100'
                      )}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Confirm
                    </button>
                    <button
                      onClick={() => setDeclineBookingId(booking.id)}
                      disabled={actionLoading === booking.id}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-2 text-sm rounded-md transition',
                        actionLoading === booking.id
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'text-red-700 bg-red-50 hover:bg-red-100'
                      )}
                    >
                      <XCircle className="h-4 w-4" />
                      Decline
                    </button>
                  </>
                )}
                {pastConfirmed && (
                  <button
                    onClick={() => onComplete(booking.id)}
                    disabled={actionLoading === booking.id}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 text-sm rounded-md transition',
                      actionLoading === booking.id
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'text-blue-700 bg-blue-50 hover:bg-blue-100'
                    )}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Mark Complete
                  </button>
                )}
              </div>
            </div>

            {/* Decline reason modal (inline) */}
            {declineBookingId === booking.id && (
              <div className="mt-4 p-4 border rounded-md bg-red-50">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <h4 className="font-medium text-red-900">Decline this booking?</h4>
                </div>
                <input
                  type="text"
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Reason for declining (optional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDeclineSubmit(booking.id)}
                    disabled={actionLoading === booking.id}
                    className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition"
                  >
                    Confirm Decline
                  </button>
                  <button
                    onClick={() => {
                      setDeclineBookingId(null);
                      setDeclineReason('');
                    }}
                    className="px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
