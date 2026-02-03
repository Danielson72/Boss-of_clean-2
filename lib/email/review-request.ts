/**
 * Review Request Email Service
 *
 * Sends review request emails to customers after their
 * booking is marked as completed.
 */

import { createLogger } from '../utils/logger';
import { sendResendEmail, wrapEmailTemplate, generateButton } from './resend';

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
 * Generate HTML for review request email
 */
export function generateReviewRequestHtml(
  data: ReviewRequestData,
  reviewUrl: string
): string {
  const content = `
    <h2 style="color: #111827; font-size: 24px; margin: 0 0 8px 0;">How was your cleaning?</h2>
    <p style="color: #6b7280; font-size: 16px; margin-bottom: 24px;">
      Hi ${data.customerName}, your <strong>${data.serviceType.replace(/_/g, ' ')}</strong> with
      <strong>${data.businessName}</strong> on ${data.bookingDate} is complete.
    </p>

    <p style="color: #6b7280; font-size: 16px; margin-bottom: 24px;">
      Your feedback helps other customers find great cleaners and helps
      ${data.businessName} improve their service.
    </p>

    <!-- Star Rating Preview -->
    <div style="text-align: center; margin: 24px 0;">
      <p style="color: #374151; font-size: 14px; margin-bottom: 12px;">How would you rate your experience?</p>
      <div style="font-size: 32px; letter-spacing: 8px;">
        ⭐⭐⭐⭐⭐
      </div>
    </div>

    ${generateButton('Leave a Review', reviewUrl)}

    <p style="color: #9ca3af; font-size: 14px; text-align: center; margin-top: 24px;">
      It only takes a minute and means the world to ${data.businessName}!
    </p>
  `;

  return wrapEmailTemplate(content);
}

/**
 * Send a review request email to a customer after booking completion
 */
export async function sendReviewRequestEmail(
  data: ReviewRequestData
): Promise<boolean> {
  const reviewUrl = `${BASE_URL}/review/${data.bookingId}`;

  logger.info('Sending review request email', {
    function: 'sendReviewRequestEmail',
    to: data.customerEmail,
    bookingId: data.bookingId,
  });

  const result = await sendResendEmail({
    to: data.customerEmail,
    subject: `How was your cleaning with ${data.businessName}?`,
    html: generateReviewRequestHtml(data, reviewUrl),
  });

  return result.success;
}

/**
 * Send a review published notification to a cleaner
 */
export async function sendReviewPublishedEmail(data: {
  to: string;
  businessName: string;
  customerName: string;
  rating: number;
  reviewExcerpt: string;
  reviewId: string;
}): Promise<boolean> {
  logger.info('Sending review published notification', {
    function: 'sendReviewPublishedEmail',
    to: data.to,
    reviewId: data.reviewId,
  });

  const stars = '★'.repeat(data.rating) + '☆'.repeat(5 - data.rating);

  const content = `
    <h2 style="color: #111827; font-size: 24px; margin: 0 0 8px 0;">You received a new review!</h2>
    <p style="color: #6b7280; font-size: 16px; margin-bottom: 24px;">
      Hi ${data.businessName}, <strong>${data.customerName}</strong> left you a review.
    </p>

    <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
      <div style="color: #f59e0b; font-size: 28px; letter-spacing: 4px; margin-bottom: 12px;">
        ${stars}
      </div>
      <p style="color: #374151; font-style: italic; margin: 0;">
        "${data.reviewExcerpt}${data.reviewExcerpt.length >= 100 ? '...' : ''}"
      </p>
      <p style="color: #9ca3af; font-size: 14px; margin: 12px 0 0 0;">
        — ${data.customerName}
      </p>
    </div>

    ${generateButton('View Full Review', `${BASE_URL}/dashboard/cleaner/reviews`)}

    <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
      Great reviews help you stand out and win more jobs. Keep up the great work!
    </p>
  `;

  const result = await sendResendEmail({
    to: data.to,
    subject: `You received a ${data.rating}-star review!`,
    html: wrapEmailTemplate(content),
  });

  return result.success;
}
