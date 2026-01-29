/**
 * New Message Email Notification Service
 *
 * Sends email notifications when a user receives a new message.
 */

import { createLogger } from '../utils/logger';

const logger = createLogger({ file: 'lib/email/new-message' });
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bossofclean.com';

export interface NewMessageEmailData {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  messagePreview: string;
  conversationId: string;
}

/**
 * Send a new message notification email
 */
export async function sendNewMessageEmail(
  data: NewMessageEmailData
): Promise<boolean> {
  const messagesUrl = `${BASE_URL}/dashboard/messages/${data.conversationId}`;

  logger.info('[EMAIL] New Message Notification');
  logger.info(`   To: ${data.recipientEmail}`);
  logger.info(`   Subject: New message from ${data.senderName}`);
  logger.info(`   Preview: ${data.messagePreview.substring(0, 50)}...`);
  logger.info(`   Messages URL: ${messagesUrl}`);
  logger.info('');

  // TODO: Replace with actual email provider (Resend, SendGrid, etc.)
  // return await resend.emails.send({
  //   from: 'Boss of Clean <messages@bossofclean.com>',
  //   to: data.recipientEmail,
  //   subject: `New message from ${data.senderName}`,
  //   html: generateNewMessageHtml(data, messagesUrl),
  // });

  return true;
}

/**
 * Generate HTML for new message notification email
 */
export function generateNewMessageHtml(
  data: NewMessageEmailData,
  messagesUrl: string
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
            New Message
          </h1>
          <p style="color: #6b7280; font-size: 16px; margin-bottom: 24px;">
            Hi ${data.recipientName}, you have a new message from
            <strong>${data.senderName}</strong>.
          </p>

          <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #2563eb;">
            <p style="color: #374151; font-size: 14px; margin: 0; font-style: italic;">
              "${data.messagePreview}${data.messagePreview.length >= 100 ? '...' : ''}"
            </p>
          </div>

          <div style="text-align: center; margin-bottom: 32px;">
            <a href="${messagesUrl}"
               style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
              View Message
            </a>
          </div>

          <p style="color: #9ca3af; font-size: 14px; text-align: center;">
            This email was sent by Boss of Clean. Reply to messages directly on our platform.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
