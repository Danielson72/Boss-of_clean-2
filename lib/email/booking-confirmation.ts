/**
 * Booking Confirmation Email Service
 *
 * Sends confirmation emails to both customers and cleaners
 * when an instant booking is created.
 */

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
  console.log('📧 [EMAIL] Booking Confirmation - Customer');
  console.log(`   To: ${data.customerEmail}`);
  console.log(`   Subject: Booking Confirmed with ${data.businessName}!`);
  console.log(`   Booking ID: ${data.bookingId}`);
  console.log(`   Service: ${data.serviceType}`);
  console.log(`   Date: ${data.bookingDate}`);
  console.log(`   Time: ${data.startTime} - ${data.endTime}`);
  console.log(`   Address: ${data.address}`);
  console.log(`   Estimated Price: $${data.estimatedPrice}`);
  console.log(`   View URL: ${BASE_URL}/dashboard/customer/bookings/${data.bookingId}`);
  console.log('');

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
  console.log('📧 [EMAIL] Booking Notification - Cleaner');
  console.log(`   To: ${data.cleanerEmail}`);
  console.log(`   Subject: New Booking from ${data.customerName}!`);
  console.log(`   Booking ID: ${data.bookingId}`);
  console.log(`   Service: ${data.serviceType}`);
  console.log(`   Property: ${data.propertyType} (${data.bedrooms}bd/${data.bathrooms}ba)`);
  console.log(`   Date: ${data.bookingDate}`);
  console.log(`   Time: ${data.startTime} - ${data.endTime}`);
  console.log(`   Address: ${data.address}`);
  console.log(`   Estimated Price: $${data.estimatedPrice}`);
  console.log(`   View URL: ${BASE_URL}/dashboard/cleaner/bookings/${data.bookingId}`);
  console.log('');

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
