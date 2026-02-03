/**
 * Booking Confirmation Email Service
 *
 * Sends confirmation emails to both customers and cleaners
 * when an instant booking is created.
 */

import { createLogger } from '../utils/logger';
import { sendResendEmail, wrapEmailTemplate, generateButton, generateInfoBox, DEFAULT_FROM } from './resend';

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
 * Generate customer confirmation email HTML
 */
function generateCustomerConfirmationHtml(data: BookingConfirmationData): string {
  const content = `
    <h2 style="color: #111827; font-size: 24px; margin: 0 0 8px 0;">Booking Confirmed!</h2>
    <p style="color: #6b7280; font-size: 16px; margin-bottom: 24px;">
      Hi ${data.customerName}, your cleaning has been scheduled with <strong>${data.businessName}</strong>.
    </p>

    ${generateInfoBox([
      { label: 'Service', value: data.serviceType.replace(/_/g, ' ') },
      { label: 'Date', value: data.bookingDate },
      { label: 'Time', value: `${data.startTime} - ${data.endTime}` },
      { label: 'Address', value: data.address },
      { label: 'Property', value: `${data.propertyType} (${data.bedrooms} bed, ${data.bathrooms} bath)` },
      { label: 'Estimated Price', value: `$${data.estimatedPrice}` },
    ])}

    ${data.specialInstructions ? `
      <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <p style="margin: 0; font-weight: 600; color: #92400e;">Special Instructions:</p>
        <p style="margin: 8px 0 0 0; color: #78350f;">${data.specialInstructions}</p>
      </div>
    ` : ''}

    ${generateButton('View Booking Details', `${BASE_URL}/dashboard/customer/bookings/${data.bookingId}`)}

    <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
      Need to make changes? You can manage your booking from your dashboard or contact ${data.businessName} directly.
    </p>
  `;

  return wrapEmailTemplate(content);
}

/**
 * Generate cleaner notification email HTML
 */
function generateCleanerNotificationHtml(data: BookingConfirmationData): string {
  const content = `
    <h2 style="color: #111827; font-size: 24px; margin: 0 0 8px 0;">New Booking!</h2>
    <p style="color: #6b7280; font-size: 16px; margin-bottom: 24px;">
      Great news! <strong>${data.customerName}</strong> has booked your services.
    </p>

    ${generateInfoBox([
      { label: 'Customer', value: data.customerName },
      { label: 'Service', value: data.serviceType.replace(/_/g, ' ') },
      { label: 'Date', value: data.bookingDate },
      { label: 'Time', value: `${data.startTime} - ${data.endTime}` },
      { label: 'Address', value: data.address },
      { label: 'Property', value: `${data.propertyType} (${data.bedrooms} bed, ${data.bathrooms} bath)` },
      { label: 'Estimated Hours', value: `${data.estimatedHours} hours` },
      { label: 'Estimated Price', value: `$${data.estimatedPrice}` },
    ])}

    ${data.specialInstructions ? `
      <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <p style="margin: 0; font-weight: 600; color: #92400e;">Special Instructions:</p>
        <p style="margin: 8px 0 0 0; color: #78350f;">${data.specialInstructions}</p>
      </div>
    ` : ''}

    ${generateButton('View Booking Details', `${BASE_URL}/dashboard/cleaner/bookings/${data.bookingId}`)}

    <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
      Make sure to confirm with the customer and arrive on time. Great service leads to great reviews!
    </p>
  `;

  return wrapEmailTemplate(content);
}

/**
 * Send booking confirmation to customer
 */
export async function sendBookingConfirmationToCustomer(
  data: BookingConfirmationData
): Promise<boolean> {
  logger.info('Sending booking confirmation to customer', {
    function: 'sendBookingConfirmationToCustomer',
    bookingId: data.bookingId,
    to: data.customerEmail,
  });

  const result = await sendResendEmail({
    to: data.customerEmail,
    subject: `Booking Confirmed with ${data.businessName}!`,
    html: generateCustomerConfirmationHtml(data),
  });

  return result.success;
}

/**
 * Send booking notification to cleaner
 */
export async function sendBookingNotificationToCleaner(
  data: BookingConfirmationData
): Promise<boolean> {
  logger.info('Sending booking notification to cleaner', {
    function: 'sendBookingNotificationToCleaner',
    bookingId: data.bookingId,
    to: data.cleanerEmail,
  });

  const result = await sendResendEmail({
    to: data.cleanerEmail,
    subject: `New Booking from ${data.customerName}!`,
    html: generateCleanerNotificationHtml(data),
  });

  return result.success;
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
