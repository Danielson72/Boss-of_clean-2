'use client';

import { CheckCircle2, Calendar, Clock, MapPin, Home, DollarSign } from 'lucide-react';
import Link from 'next/link';

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

interface BookingConfirmationProps {
  bookingId: string;
  businessName: string;
  serviceType: string;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  bookingDate: string;
  startTime: string;
  endTime: string;
  address: string;
  estimatedPrice: number;
  estimatedHours: number;
}

export function BookingConfirmation({
  bookingId,
  businessName,
  serviceType,
  propertyType,
  bedrooms,
  bathrooms,
  bookingDate,
  startTime,
  endTime,
  address,
  estimatedPrice,
  estimatedHours,
}: BookingConfirmationProps) {
  const formattedDate = new Date(bookingDate + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const serviceLabel = serviceType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const propertyLabel = propertyType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="max-w-lg mx-auto text-center">
      {/* Success Icon */}
      <div className="mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
      <p className="text-gray-600 mb-6">
        Your cleaning appointment with <strong>{businessName}</strong> has been confirmed.
        You&apos;ll receive a confirmation email shortly.
      </p>

      {/* Booking Details Card */}
      <div className="bg-gray-50 rounded-lg p-6 text-left space-y-4 mb-6">
        <div className="flex items-start gap-3">
          <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm text-gray-500">Date</p>
            <p className="font-medium text-gray-900">{formattedDate}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm text-gray-500">Time</p>
            <p className="font-medium text-gray-900">
              {formatTime(startTime)} - {formatTime(endTime)} ({estimatedHours}h)
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Home className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm text-gray-500">Service</p>
            <p className="font-medium text-gray-900">
              {serviceLabel} - {propertyLabel} ({bedrooms}bd/{bathrooms}ba)
            </p>
          </div>
        </div>

        {address && (
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">Address</p>
              <p className="font-medium text-gray-900">{address}</p>
            </div>
          </div>
        )}

        <div className="flex items-start gap-3">
          <DollarSign className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm text-gray-500">Estimated Price</p>
            <p className="font-medium text-gray-900">${estimatedPrice.toFixed(2)}</p>
          </div>
        </div>

        <div className="pt-3 border-t">
          <p className="text-xs text-gray-500">Booking ID: {bookingId}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-center">
        <Link
          href="/dashboard/customer"
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm font-medium"
        >
          Go to Dashboard
        </Link>
        <Link
          href="/search"
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition text-sm font-medium"
        >
          Book Another
        </Link>
      </div>
    </div>
  );
}
