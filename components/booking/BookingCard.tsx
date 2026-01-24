'use client';

import {
  Calendar,
  Clock,
  MapPin,
  Home,
  DollarSign,
  Phone,
  Star,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Booking {
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
  status: 'confirmed' | 'cancelled' | 'completed';
  cancellation_reason?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
  cleaner: {
    id: string;
    business_name: string;
    business_phone: string;
    business_email: string;
    profile_image_url?: string;
    average_rating: number;
    user: {
      full_name: string;
      email: string;
    };
  };
}

interface BookingCardProps {
  booking: Booking;
  onReschedule: (booking: Booking) => void;
  onCancel: (booking: Booking) => void;
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
      return 'text-gray-700 bg-gray-100';
    default:
      return 'text-gray-700 bg-gray-100';
  }
}

function canModify(booking: Booking): boolean {
  if (booking.status !== 'confirmed') return false;
  const bookingDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
  const now = new Date();
  const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursUntilBooking >= 24;
}

export function BookingCard({ booking, onReschedule, onCancel }: BookingCardProps) {
  const modifiable = canModify(booking);
  const isPast = new Date(`${booking.booking_date}T${booking.end_time}`) < new Date();

  return (
    <div className={cn(
      'border rounded-lg p-6 transition duration-300',
      booking.status === 'cancelled' ? 'opacity-75 bg-gray-50' : 'bg-white hover:shadow-md'
    )}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          {/* Header: business name + status */}
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {booking.cleaner.business_name}
            </h3>
            <span className={cn(
              'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
              getStatusStyles(booking.status)
            )}>
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </span>
            {isPast && booking.status === 'confirmed' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-blue-700 bg-blue-100">
                Past
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
                {formatTime(booking.start_time)} - {formatTime(booking.end_time)} ({booking.estimated_hours}h)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-blue-600" />
              <span>
                {formatServiceType(booking.service_type)} - {booking.bedrooms}bd/{booking.bathrooms}ba
              </span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <span className="font-medium">${booking.estimated_price.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-600" />
              <span>{booking.address}</span>
            </div>
            {booking.cleaner.business_phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-blue-600" />
                <span>{booking.cleaner.business_phone}</span>
              </div>
            )}
          </div>

          {/* Cleaner rating */}
          {booking.cleaner.average_rating > 0 && (
            <div className="flex items-center gap-1 mt-3 text-sm text-gray-600">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span>{booking.cleaner.average_rating.toFixed(1)}</span>
            </div>
          )}

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
        {booking.status === 'confirmed' && !isPast && (
          <div className="ml-4 flex flex-col gap-2">
            <button
              onClick={() => onReschedule(booking)}
              disabled={!modifiable}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-sm rounded-md transition',
                modifiable
                  ? 'text-blue-700 bg-blue-50 hover:bg-blue-100'
                  : 'text-gray-400 bg-gray-50 cursor-not-allowed'
              )}
              title={!modifiable ? 'Must reschedule at least 24 hours before service' : undefined}
            >
              <RefreshCw className="h-4 w-4" />
              Reschedule
            </button>
            <button
              onClick={() => onCancel(booking)}
              disabled={!modifiable}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-sm rounded-md transition',
                modifiable
                  ? 'text-red-700 bg-red-50 hover:bg-red-100'
                  : 'text-gray-400 bg-gray-50 cursor-not-allowed'
              )}
              title={!modifiable ? 'Must cancel at least 24 hours before service' : undefined}
            >
              <XCircle className="h-4 w-4" />
              Cancel
            </button>
            {!modifiable && (
              <p className="text-xs text-gray-500 max-w-[140px]">
                24h policy: too late to modify
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
