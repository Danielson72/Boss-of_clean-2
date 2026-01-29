/**
 * Booking Confirmation Email Service
 *
 * Sends confirmation emails to both customers and cleaners
 * when an instant booking is created.
 */

import { createLogger } from '../utils/logger';

const logger = createLogger({ file: 'lib/email/booking-confirmation' });
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bossofclean.com';

export interface BookingConfirmationData {
  bookingId: string;
  customerName: string;
  customerEmail: string;
  cleanerEmail: string;
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
  specialInstructions?: string;
}

/**
 * Send booking confirmation to customer
 */
export async function sendBookingConfirmationToCustomer(
  data: BookingConfirmationData
): Promise<boolean> {
  logger.info('[EMAIL] Booking Confirmation - Customer');
  logger.info(`   To: ${data.customerEmail}`);
  logger.info(`   Subject: Booking Confirmed with ${data.businessName}!`);
  logger.info(`   Booking ID: ${data.bookingId}`);
  logger.info(`   Service: ${data.serviceType}`);
  logger.info(`   Date: ${data.bookingDate}`);
  logger.info(`   Time: ${data.startTime} - ${data.endTime}`);
  logger.info(`   Address: ${data.address}`);
  logger.info(`   Estimated Price: $${data.estimatedPrice}`);
  logger.info(`   View URL: ${BASE_URL}/dashboard/customer/bookings/${data.bookingId}`);
  logger.info('');

  // TODO: Replace with actual email provider (Resend, SendGrid, etc.)
  // return await resend.emails.send({
  //   from: 'Boss of Clean <bookings@bossofclean.com>',
  //   to: data.customerEmail,
  //   subject: `Booking Confirmed with ${data.businessName}!`,
  //   html: generateCustomerConfirmationHtml(data),
  // });

  return true;
}

/**
 * Send booking notification to cleaner
 */
export async function sendBookingNotificationToCleaner(
  data: BookingConfirmationData
): Promise<boolean> {
  logger.info('[EMAIL] Booking Notification - Cleaner');
  logger.info(`   To: ${data.cleanerEmail}`);
  logger.info(`   Subject: New Booking from ${data.customerName}!`);
  logger.info(`   Booking ID: ${data.bookingId}`);
  logger.info(`   Service: ${data.serviceType}`);
  logger.info(`   Property: ${data.propertyType} (${data.bedrooms}bd/${data.bathrooms}ba)`);
  logger.info(`   Date: ${data.bookingDate}`);
  logger.info(`   Time: ${data.startTime} - ${data.endTime}`);
  logger.info(`   Address: ${data.address}`);
  logger.info(`   Estimated Price: $${data.estimatedPrice}`);
  logger.info(`   View URL: ${BASE_URL}/dashboard/cleaner/bookings/${data.bookingId}`);
  logger.info('');

  // TODO: Replace with actual email provider
  return true;
}

/**
 * Send both confirmation emails for a new booking
 */
export async function sendBookingConfirmationEmails(
  data: BookingConfirmationData
): Promise<{ customerSent: boolean; cleanerSent: boolean }> {
  const [customerSent, cleanerSent] = await Promise.all([
    sendBookingConfirmationToCustomer(data),
    sendBookingNotificationToCleaner(data),
  ]);

  return { customerSent, cleanerSent };
}
