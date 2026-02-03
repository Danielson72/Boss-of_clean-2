/**
 * New Message Email Notification Service
 *
 * Sends email notifications when a user receives a new message.
 */

import { createLogger } from '../utils/logger';
import { sendResendEmail, wrapEmailTemplate, generateButton } from './resend';

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
 * Generate HTML for new message notification email
 */
export function generateNewMessageHtml(
  data: NewMessageEmailData,
  messagesUrl: string
): string {
  const content = `
    <h2 style="color: #111827; font-size: 24px; margin: 0 0 8px 0;">New Message</h2>
    <p style="color: #6b7280; font-size: 16px; margin-bottom: 24px;">
      Hi ${data.recipientName}, you have a new message from
      <strong>${data.senderName}</strong>.
    </p>

    <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #2563eb;">
      <p style="color: #374151; font-size: 14px; margin: 0; font-style: italic;">
        "${data.messagePreview}${data.messagePreview.length >= 100 ? '...' : ''}"
      </p>
    </div>

    ${generateButton('View Message', messagesUrl)}

    <p style="color: #9ca3af; font-size: 14px; text-align: center; margin-top: 24px;">
      Reply directly on our platform to keep your conversation in one place.
    </p>
  `;

  return wrapEmailTemplate(content);
}

/**
 * Send a new message notification email
 */
export async function sendNewMessageEmail(
  data: NewMessageEmailData
): Promise<boolean> {
  const messagesUrl = `${BASE_URL}/dashboard/messages/${data.conversationId}`;

  logger.info('Sending new message notification', {
    function: 'sendNewMessageEmail',
    to: data.recipientEmail,
    conversationId: data.conversationId,
  });

  const result = await sendResendEmail({
    to: data.recipientEmail,
    subject: `New message from ${data.senderName}`,
    html: generateNewMessageHtml(data, messagesUrl),
  });

  return result.success;
}
