'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Booking {
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
  service_date: string;
  city: string;
  zip_code: string;
  duration_hours?: number;
  created_at: string;
  updated_at: string;
}

export interface BookingHistoryResponse {
  bookings: Booking[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface BookingFilters {
  status?: string;
  service_type?: string;
  date_from?: string;
  date_to?: string;
}

interface UseBookingHistoryOptions {
  initialLimit?: number;
  initialFilters?: BookingFilters;
}

export function useBookingHistory({
  initialLimit = 10,
  initialFilters = {}
}: UseBookingHistoryOptions = {}) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: initialLimit,
    total: 0,
    totalPages: 0,
    hasMore: false
  });
  const [filters, setFilters] = useState<BookingFilters>(initialFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const fetchBookings = useCallback(async (page: number = 1, resetData: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value && value.trim() !== '')
        )
      });

      const response = await fetch(`/api/history?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch booking history: ${response.status}`);
      }

      const data: BookingHistoryResponse = await response.json();

      if (resetData || page === 1) {
        setBookings(data.bookings);
      } else {
        // Append for infinite scroll/load more
        setBookings(prev => [...prev, ...data.bookings]);
      }

      setPagination(data.pagination);
      setIsInitialLoad(false);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load booking history';
      setError(errorMessage);
      console.error('Error fetching booking history:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit]);

  // Initial load
  useEffect(() => {
    fetchBookings(1, true);
  }, [filters, fetchBookings]); // Re-fetch when filters change

  const loadMore = useCallback(() => {
    if (!loading && pagination.hasMore) {
      fetchBookings(pagination.page + 1, false);
    }
  }, [fetchBookings, loading, pagination.hasMore, pagination.page]);

  const refresh = useCallback(() => {
    fetchBookings(1, true);
  }, [fetchBookings]);

  const updateFilters = useCallback((newFilters: Partial<BookingFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const setLimit = useCallback((newLimit: number) => {
    setPagination(prev => ({ ...prev, limit: newLimit }));
    fetchBookings(1, true);
  }, [fetchBookings]);

  // Optimistic update for booking status changes
  const updateBookingOptimistically = useCallback((bookingId: string, updates: Partial<Booking>) => {
    setBookings(prev =>
      prev.map(booking =>
        booking.id === bookingId
          ? { ...booking, ...updates }
          : booking
      )
    );
  }, []);

  return {
    // Data
    bookings,
    pagination,
    filters,

    // State
    loading,
    error,
    isInitialLoad,

    // Actions
    loadMore,
    refresh,
    updateFilters,
    clearFilters,
    setLimit,
    updateBookingOptimistically,

    // Computed
    hasBookings: bookings.length > 0,
    isEmpty: !loading && !isInitialLoad && bookings.length === 0,
    hasError: !!error,
  };
}