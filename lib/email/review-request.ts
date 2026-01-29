/**
 * Review Request Email Service
 *
 * Sends review request emails to customers after their
 * booking is marked as completed.
 */

import { createLogger } from '../utils/logger';

const logger = createLogger({ file: 'lib/email/review-request' });
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bossofclean.com';

export interface ReviewRequestData {
  bookingId: string;
  customerName: string;
  customerEmail: string;
  businessName: string;
  serviceType: string;
  bookingDate: string;
}

/**
 * Send a review request email to a customer after booking completion
 */
export async function sendReviewRequestEmail(
  data: ReviewRequestData
): Promise<boolean> {
  const reviewUrl = `${BASE_URL}/review/${data.bookingId}`;

  logger.info('[EMAIL] Review Request - Customer');
  logger.info(`   To: ${data.customerEmail}`);
  logger.info(`   Subject: How was your cleaning with ${data.businessName}?`);
  logger.info(`   Booking ID: ${data.bookingId}`);
  logger.info(`   Service: ${data.serviceType}`);
  logger.info(`   Date: ${data.bookingDate}`);
  logger.info(`   Review URL: ${reviewUrl}`);
  logger.info('');

  // TODO: Replace with actual email provider (Resend, SendGrid, etc.)
  // return await resend.emails.send({
  //   from: 'Boss of Clean <reviews@bossofclean.com>',
  //   to: data.customerEmail,
  //   subject: `How was your cleaning with ${data.businessName}?`,
  //   html: generateReviewRequestHtml(data, reviewUrl),
  // });

  return true;
}

/**
 * Generate HTML for review request email
 */
export function generateReviewRequestHtml(
  data: ReviewRequestData,
  reviewUrl: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h1 style="color: #111827; font-size: 24px; margin-bottom: 8px;">
            How was your cleaning?
          </h1>
          <p style="color: #6b7280; font-size: 16px; margin-bottom: 24px;">
            Hi ${data.customerName}, your ${data.serviceType.replace(/_/g, ' ')} with
            <strong>${data.businessName}</strong> on ${data.bookingDate} is complete.
          </p>
          <p style="color: #6b7280; font-size: 16px; margin-bottom: 32px;">
            Your feedback helps other customers find great cleaners and helps
            ${data.businessName} improve their service.
          </p>
          <div style="text-align: center; margin-bottom: 32px;">
            <a href="${reviewUrl}"
               style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
              Leave a Review
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 14px; text-align: center;">
            This email was sent by Boss of Clean. If you did not use this service,
            please ignore this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
