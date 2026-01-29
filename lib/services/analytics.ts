import { createClient } from '@/lib/supabase/client';
import { createLogger } from '../utils/logger';
import type { BookingData } from '@/lib/types/api';

const logger = createLogger({ file: 'lib/services/analytics' });

export interface MonthlyEarnings {
  month: string;
  year: number;
  earnings: number;
  bookingsCount: number;
}

export interface EarningsStats {
  totalEarnings: number;
  monthlyEarnings: number;
  totalBookings: number;
  completedBookings: number;
  conversionRate: number;
  averageBookingValue: number;
}

export interface EarningsData {
  stats: EarningsStats;
  monthlyData: MonthlyEarnings[];
  recentBookings: BookingEarning[];
}

export interface BookingEarning {
  id: string;
  booking_date: string;
  total_price: number;
  service_type: string;
  status: string;
  customer_name: string;
}

export class AnalyticsService {
  private supabase = createClient();

  async getEarningsData(cleanerId: string): Promise<EarningsData> {
    // Get completed bookings with earnings
    const { data: bookings, error: bookingsError } = await this.supabase
      .from('bookings')
      .select(`
        id,
        booking_date,
        total_price,
        service_type,
        status,
        created_at,
        customer:users!bookings_customer_id_fkey(full_name)
      `)
      .eq('cleaner_id', cleanerId)
      .order('booking_date', { ascending: false });

    if (bookingsError) {
      logger.error('Error fetching bookings:', {}, bookingsError);
      throw new Error('Failed to fetch bookings data');
    }

    // Get lead matches for conversion rate calculation
    const { data: leadMatches, error: leadsError } = await this.supabase
      .from('lead_matches')
      .select('id, status')
      .eq('cleaner_id', cleanerId);

    if (leadsError) {
      logger.error('Error fetching leads:', {}, leadsError);
    }

    const completedBookings = bookings?.filter(b => b.status === 'completed') || [];
    const allBookings = bookings || [];
    const leads = leadMatches || [];

    // Calculate stats
    const totalEarnings = completedBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);

    // Calculate current month earnings
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyEarnings = completedBookings
      .filter(b => new Date(b.booking_date) >= currentMonthStart)
      .reduce((sum, b) => sum + (b.total_price || 0), 0);

    // Calculate conversion rate (leads that converted to bookings)
    const totalLeads = leads.length;
    const convertedLeads = leads.filter(l => l.status === 'booked').length;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    // Calculate average booking value
    const averageBookingValue = completedBookings.length > 0
      ? totalEarnings / completedBookings.length
      : 0;

    // Generate monthly data for the last 6 months
    const monthlyData = this.generateMonthlyData(completedBookings);

    // Format recent bookings
    const recentBookings: BookingEarning[] = allBookings.slice(0, 10).map(b => {
      // Handle customer which could be an array or single object from the join
      const customer = Array.isArray(b.customer) ? b.customer[0] : b.customer;
      return {
        id: b.id,
        booking_date: b.booking_date,
        total_price: b.total_price || 0,
        service_type: b.service_type,
        status: b.status,
        customer_name: customer?.full_name || 'Unknown',
      };
    });

    return {
      stats: {
        totalEarnings,
        monthlyEarnings,
        totalBookings: allBookings.length,
        completedBookings: completedBookings.length,
        conversionRate,
        averageBookingValue,
      },
      monthlyData,
      recentBookings,
    };
  }

  private generateMonthlyData(completedBookings: BookingData[]): MonthlyEarnings[] {
    const months: MonthlyEarnings[] = [];
    const now = new Date();

    // Generate last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const monthBookings = completedBookings.filter(b => {
        const bookingDate = new Date(b.booking_date);
        return bookingDate >= monthStart && bookingDate <= monthEnd;
      });

      months.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        year: date.getFullYear(),
        earnings: monthBookings.reduce((sum, b) => sum + (b.total_price || 0), 0),
        bookingsCount: monthBookings.length,
      });
    }

    return months;
  }

  async exportEarningsToCSV(cleanerId: string): Promise<string> {
    const { data: bookings, error } = await this.supabase
      .from('bookings')
      .select(`
        id,
        booking_date,
        start_time,
        end_time,
        total_price,
        service_type,
        status,
        address,
        city,
        zip_code,
        customer:users!bookings_customer_id_fkey(full_name, email)
      `)
      .eq('cleaner_id', cleanerId)
      .eq('status', 'completed')
      .order('booking_date', { ascending: false });

    if (error) {
      logger.error('Error exporting bookings:', {}, error);
      throw new Error('Failed to export bookings data');
    }

    // Generate CSV
    const headers = [
      'Date',
      'Start Time',
      'End Time',
      'Service Type',
      'Customer Name',
      'Customer Email',
      'Address',
      'City',
      'ZIP Code',
      'Amount',
      'Status',
    ];

    const rows = (bookings || []).map(b => {
      // Handle customer which could be an array or single object from the join
      const customerData = Array.isArray(b.customer) ? b.customer[0] : b.customer;
      const customer = customerData as { full_name: string; email: string } | null;
      return [
        b.booking_date,
        b.start_time,
        b.end_time,
        b.service_type,
        customer?.full_name || '',
        customer?.email || '',
        b.address || '',
        b.city || '',
        b.zip_code || '',
        `$${(b.total_price || 0).toFixed(2)}`,
        b.status,
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
}

export const analyticsService = new AnalyticsService();
