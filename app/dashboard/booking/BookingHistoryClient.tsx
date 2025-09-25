'use client';

import { useState } from 'react';
import { useBookingHistory, type BookingFilters } from '@/lib/hooks/useBookingHistory';
import { BookingHistoryList } from './BookingHistoryList';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Filter,
  RefreshCw,
  Calendar,
  Search,
  X
} from 'lucide-react';

interface BookingHistoryClientProps {
  userTier: 'free' | 'growth' | 'pro' | 'enterprise';
}

export default function BookingHistoryClient({ userTier }: BookingHistoryClientProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [tempFilters, setTempFilters] = useState<BookingFilters>({});

  const {
    bookings,
    pagination,
    filters,
    loading,
    error,
    isInitialLoad,
    loadMore,
    refresh,
    updateFilters,
    clearFilters,
    hasBookings,
    isEmpty,
    hasError
  } = useBookingHistory();

  const handleApplyFilters = () => {
    updateFilters(tempFilters);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setTempFilters({});
    clearFilters();
    setShowFilters(false);
  };

  const hasActiveFilters = Object.values(filters).some(value => value && value.trim() !== '');

  if (hasError) {
    return (
      <Card className="max-w-2xl mx-auto" data-testid="error-message">
        <CardContent className="pt-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load History</h3>
          <p className="text-gray-600 mb-4">
            {error || 'Something went wrong while loading your booking history.'}
          </p>
          <Button onClick={refresh} className="bg-blue-600 hover:bg-blue-700">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters & Search
            </CardTitle>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Badge variant="secondary" className="text-xs">
                  {Object.values(filters).filter(v => v).length} active
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? 'Hide' : 'Show'} Filters
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                disabled={loading}
                data-testid="refresh-button"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>

        {showFilters && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Status Filter */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Status
                </label>
                <Select
                  value={tempFilters.status || ''}
                  onValueChange={(value) =>
                    setTempFilters(prev => ({ ...prev, status: value === 'all' ? '' : value }))
                  }
                  data-testid="status-filter"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" data-testid="status-all">All Statuses</SelectItem>
                    <SelectItem value="completed" data-testid="status-completed">Completed</SelectItem>
                    <SelectItem value="scheduled" data-testid="status-scheduled">Scheduled</SelectItem>
                    <SelectItem value="in_progress" data-testid="status-in_progress">In Progress</SelectItem>
                    <SelectItem value="cancelled" data-testid="status-cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Service Type Filter */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Service Type
                </label>
                <Select
                  value={tempFilters.service_type || ''}
                  onValueChange={(value) =>
                    setTempFilters(prev => ({ ...prev, service_type: value === 'all' ? '' : value }))
                  }
                  data-testid="service-type-filter"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All services" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" data-testid="service-all">All Services</SelectItem>
                    <SelectItem value="house-cleaning" data-testid="service-house-cleaning">House Cleaning</SelectItem>
                    <SelectItem value="deep-cleaning" data-testid="service-deep-cleaning">Deep Cleaning</SelectItem>
                    <SelectItem value="office-cleaning" data-testid="service-office-cleaning">Office Cleaning</SelectItem>
                    <SelectItem value="move-in-out" data-testid="service-move-in-out">Move In/Out</SelectItem>
                    <SelectItem value="carpet-cleaning" data-testid="service-carpet-cleaning">Carpet Cleaning</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date From */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  From Date
                </label>
                <Input
                  type="date"
                  value={tempFilters.date_from || ''}
                  onChange={(e) =>
                    setTempFilters(prev => ({ ...prev, date_from: e.target.value }))
                  }
                  data-testid="date-from"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  To Date
                </label>
                <Input
                  type="date"
                  value={tempFilters.date_to || ''}
                  onChange={(e) =>
                    setTempFilters(prev => ({ ...prev, date_to: e.target.value }))
                  }
                  data-testid="date-to"
                />
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex items-center gap-2 mt-4 pt-4 border-t">
              <Button onClick={handleApplyFilters} size="sm" data-testid="apply-filters">
                <Search className="w-4 h-4 mr-1" />
                Apply Filters
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                disabled={!hasActiveFilters}
                data-testid="clear-filters"
              >
                Clear All
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Results Summary */}
      {hasBookings && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Showing {bookings.length} of {pagination.total} booking{pagination.total !== 1 ? 's' : ''}
          </span>
          {hasActiveFilters && (
            <Badge variant="outline" className="text-xs">
              Filtered results
            </Badge>
          )}
        </div>
      )}

      {/* Booking History List */}
      <div data-testid="booking-history-list">
        <BookingHistoryList
          bookings={bookings}
          onLoadMore={loadMore}
          hasMore={pagination.hasMore}
          loading={loading}
          userTier={userTier}
        />
      </div>

      {/* Empty State for initial load */}
      {isInitialLoad && loading && (
        <Card data-testid="loading-indicator">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Your History</h3>
            <p className="text-gray-600">
              We&apos;re fetching your cleaning service history...
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}