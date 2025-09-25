'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, MapPin, DollarSign, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BookingDetailModal } from './BookingDetailModal';
import { RecurringCTA } from './RecurringCTA';

interface Booking {
  id: string;
  service_type: string;
  scheduled_date: string;
  scheduled_time: string;
  address: string;
  status: 'completed' | 'cancelled' | 'in_progress' | 'scheduled';
  total_amount: number;
  cleaner_name?: string;
  photos_before?: string[];
  photos_after?: string[];
  rating?: number;
  notes?: string;
}

interface BookingHistoryListProps {
  bookings: Booking[];
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  userTier: 'free' | 'growth' | 'pro' | 'enterprise';
}

const statusConfig = {
  completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
  cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
  in_progress: { color: 'bg-blue-100 text-blue-800', label: 'In Progress' },
  scheduled: { color: 'bg-yellow-100 text-yellow-800', label: 'Scheduled' }
};

export function BookingHistoryList({
  bookings,
  onLoadMore,
  hasMore = false,
  loading = false,
  userTier
}: BookingHistoryListProps) {
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      {/* CEO Cat Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-bold">🐱</span>
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Your Cleaning History</h2>
        <p className="text-sm text-gray-600 ml-auto">Purrfection is our Standard</p>
      </div>

      {bookings.length === 0 ? (
        <Card className="text-center py-12" data-testid="empty-state">
          <CardContent>
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings yet</h3>
            <p className="text-gray-600 mb-4">Book your first cleaning service to get started!</p>
            <Button className="bg-blue-600 hover:bg-blue-700">
              Book Now
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {bookings.map((booking) => (
            <Card key={booking.id} className="hover:shadow-md transition-shadow" data-testid="booking-card">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-medium" data-testid="service-type">
                      {booking.service_type}
                    </CardTitle>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1" data-testid="booking-date">
                        <Calendar className="w-4 h-4" />
                        {formatDate(booking.scheduled_date)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {booking.scheduled_time}
                      </div>
                    </div>
                  </div>
                  <Badge
                    className={cn(
                      statusConfig[booking.status].color,
                      "text-xs font-medium px-2 py-1"
                    )}
                    data-testid="status-badge"
                  >
                    {statusConfig[booking.status].label}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    {booking.address}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm font-medium text-gray-900" data-testid="total-amount">
                      <DollarSign className="w-4 h-4" />
                      {formatCurrency(booking.total_amount)}
                    </div>

                    <div className="flex items-center gap-2">
                      {booking.cleaner_name && (
                        <span className="text-sm text-gray-600">
                          by {booking.cleaner_name}
                        </span>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedBooking(booking)}
                        className="flex items-center gap-1"
                        data-testid="view-details"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </Button>
                    </div>
                  </div>

                  {booking.rating && (
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-gray-600">Your rating:</span>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <span
                            key={i}
                            className={cn(
                              "text-sm",
                              i < booking.rating! ? "text-yellow-400" : "text-gray-300"
                            )}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Load More Button */}
          {hasMore && (
            <div className="text-center pt-4">
              <Button
                variant="outline"
                onClick={onLoadMore}
                disabled={loading}
                className="min-w-32"
                data-testid="load-more"
              >
                {loading ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Recurring CTA */}
      <RecurringCTA userTier={userTier} />

      {/* Detail Modal */}
      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          isOpen={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
          userTier={userTier}
        />
      )}
    </div>
  );
}