'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Star, Shield, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/context/AuthContext';
import { DateTimePicker } from '@/components/booking/DateTimePicker';
import { BookingConfirmation } from '@/components/booking/BookingConfirmation';

const SERVICE_TYPES = [
  { value: 'residential', label: 'Residential Cleaning' },
  { value: 'deep_cleaning', label: 'Deep Cleaning' },
  { value: 'move_in_out', label: 'Move In/Out Cleaning' },
  { value: 'maid_service', label: 'Maid Service' },
  { value: 'carpet_cleaning', label: 'Carpet Cleaning' },
  { value: 'window_cleaning', label: 'Window Cleaning' },
  { value: 'pressure_washing', label: 'Pressure Washing' },
  { value: 'office_cleaning', label: 'Office Cleaning' },
  { value: 'commercial', label: 'Commercial Cleaning' },
  { value: 'post_construction', label: 'Post Construction' },
];

const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'office', label: 'Office' },
  { value: 'other', label: 'Other' },
];

interface CleanerProfile {
  id: string;
  business_name: string;
  business_description: string;
  profile_image_url: string | null;
  hourly_rate: number;
  minimum_hours: number;
  average_rating: number;
  total_reviews: number;
  insurance_verified: boolean;
  services: string[];
  instant_booking: boolean;
}

// Pricing multipliers based on service type
const SERVICE_MULTIPLIERS: Record<string, number> = {
  residential: 1.0,
  deep_cleaning: 1.5,
  move_in_out: 1.75,
  maid_service: 1.0,
  carpet_cleaning: 1.25,
  window_cleaning: 1.1,
  pressure_washing: 1.3,
  office_cleaning: 1.2,
  commercial: 1.4,
  post_construction: 2.0,
};

// Base hours by property size
function estimateHours(bedrooms: number, bathrooms: number, serviceType: string): number {
  const baseHours = 1.5 + bedrooms * 0.5 + bathrooms * 0.5;
  const multiplier = SERVICE_MULTIPLIERS[serviceType] || 1.0;
  return Math.max(2, Math.round(baseHours * multiplier * 2) / 2); // Round to nearest 0.5, min 2h
}

export default function BookCleanerPage() {
  const params = useParams<{ cleanerId: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const cleanerId = params?.cleanerId || '';

  const [cleaner, setCleaner] = useState<CleanerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [serviceType, setServiceType] = useState('residential');
  const [propertyType, setPropertyType] = useState('house');
  const [bedrooms, setBedrooms] = useState(2);
  const [bathrooms, setBathrooms] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | undefined>();
  const [address, setAddress] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Confirmation state
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<{
    bookingId: string;
    endTime: string;
  } | null>(null);

  // Calculate pricing
  const hours = estimateHours(bedrooms, bathrooms, serviceType);
  const hourlyRate = cleaner?.hourly_rate || 50;
  const estimatedPrice = Math.round(hours * hourlyRate * 100) / 100;

  const handleTimeChange = useCallback((time: string | undefined) => {
    setSelectedTime(time);
  }, []);

  useEffect(() => {
    async function fetchCleaner() {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('cleaners')
        .select(
          'id, business_name, business_description, profile_image_url, hourly_rate, minimum_hours, average_rating, total_reviews, insurance_verified, services, instant_booking'
        )
        .eq('id', cleanerId)
        .single();

      if (fetchError || !data) {
        setError('Cleaner not found');
      } else if (!data.instant_booking) {
        setError('This cleaner does not accept instant bookings');
      } else {
        setCleaner(data);
      }
      setLoading(false);
    }
    fetchCleaner();
  }, [cleanerId]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?redirect=/book/${cleanerId}`);
    }
  }, [user, authLoading, router, cleanerId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedDate || !selectedTime) {
      setError('Please select a date and time');
      return;
    }
    if (!address.trim()) {
      setError('Please enter your address');
      return;
    }
    if (!zipCode.trim()) {
      setError('Please enter your ZIP code');
      return;
    }

    const bookingDate = selectedDate.toISOString().split('T')[0];
    // Calculate end time
    const [startH, startM] = selectedTime.split(':').map(Number);
    const endMinutes = startH * 60 + startM + hours * 60;
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    setSubmitting(true);

    try {
      const res = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cleanerId,
          serviceType,
          propertyType,
          bedrooms,
          bathrooms,
          bookingDate,
          startTime: selectedTime,
          endTime,
          zipCode,
          address,
          specialInstructions: specialInstructions || undefined,
          estimatedPrice,
          estimatedHours: hours,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create booking');
        return;
      }

      setConfirmedBooking({ bookingId: data.bookingId, endTime });
      setBookingConfirmed(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error && !cleaner) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Unable to Book</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            href="/search"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Back to Search
          </Link>
        </div>
      </div>
    );
  }

  if (bookingConfirmed && confirmedBooking && cleaner) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <BookingConfirmation
          bookingId={confirmedBooking.bookingId}
          businessName={cleaner.business_name}
          serviceType={serviceType}
          propertyType={propertyType}
          bedrooms={bedrooms}
          bathrooms={bathrooms}
          bookingDate={selectedDate!.toISOString().split('T')[0]}
          startTime={selectedTime!}
          endTime={confirmedBooking.endTime}
          address={address}
          estimatedPrice={estimatedPrice}
          estimatedHours={hours}
        />
      </div>
    );
  }

  if (!cleaner) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link
            href="/search"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Search
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Cleaner Info */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center gap-4">
            {cleaner.profile_image_url ? (
              <Image
                src={cleaner.profile_image_url}
                alt={cleaner.business_name}
                width={64}
                height={64}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 font-bold text-xl">
                  {cleaner.business_name.charAt(0)}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Book {cleaner.business_name}
              </h1>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                  {(cleaner.average_rating || 0).toFixed(1)} ({cleaner.total_reviews || 0} reviews)
                </span>
                {cleaner.insurance_verified && (
                  <span className="flex items-center gap-1">
                    <Shield className="h-4 w-4 text-blue-500" />
                    Insured
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Booking Form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Service & Property Details */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Service Details
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Type
                  </label>
                  <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {SERVICE_TYPES.filter(
                      (s) =>
                        cleaner.services.length === 0 ||
                        cleaner.services.includes(s.value)
                    ).map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Property Type
                  </label>
                  <select
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {PROPERTY_TYPES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bedrooms
                  </label>
                  <select
                    value={bedrooms}
                    onChange={(e) => setBedrooms(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? 'Bedroom' : 'Bedrooms'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bathrooms
                  </label>
                  <select
                    value={bathrooms}
                    onChange={(e) => setBathrooms(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? 'Bathroom' : 'Bathrooms'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Date & Time */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Date &amp; Time
              </h2>
              <DateTimePicker
                cleanerId={cleanerId}
                selectedDate={selectedDate}
                selectedTime={selectedTime}
                onDateChange={setSelectedDate}
                onTimeChange={handleTimeChange}
                estimatedHours={hours}
              />
            </div>

            {/* Location */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Location
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 Main St, Apt 4B"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div className="w-1/2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="33101"
                    maxLength={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Special Instructions */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Special Instructions (Optional)
              </h2>
              <textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="Any special requests or access instructions..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Price Summary & Submit */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Price Estimate
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Hourly Rate</span>
                  <span className="font-medium">${hourlyRate}/hr</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estimated Duration</span>
                  <span className="font-medium">{hours} hours</span>
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between text-base">
                  <span className="font-semibold text-gray-900">Estimated Total</span>
                  <span className="font-bold text-blue-600">${estimatedPrice.toFixed(2)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Final price may vary based on actual conditions. Payment handled directly with the cleaner.
                </p>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !selectedDate || !selectedTime}
                className="mt-6 w-full bg-blue-600 text-white py-3 rounded-md font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  `Confirm Booking - $${estimatedPrice.toFixed(2)}`
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
