/**
 * Resend Email Client
 *
 * Core email sending utility using Resend.
 * All email functions should use this client for consistency.
 */

import { Resend } from 'resend';
import { createLogger } from '../utils/logger';

const logger = createLogger({ file: 'lib/email/resend' });

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Default sender
export const DEFAULT_FROM = 'Boss of Clean <noreply@bossofclean.com>';
export const BILLING_FROM = 'Boss of Clean Billing <noreply@bossofclean.com>';
export const ALERTS_FROM = 'Boss of Clean Alerts <noreply@bossofclean.com>';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bossofclean.com';

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Send an email using Resend
 */
export async function sendResendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const { to, subject, html, text, from = DEFAULT_FROM, replyTo } = params;

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
      replyTo,
    });

    if (error) {
      logger.error('Failed to send email', { to, subject }, error);
      return { success: false, error: error.message };
    }

    logger.info('Email sent successfully', {
      function: 'sendResendEmail',
      to,
      subject,
      id: data?.id,
    });

    return { success: true, id: data?.id };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Email send exception', { to, subject }, error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Generate the standard Boss of Clean email wrapper
 */
export function wrapEmailTemplate(content: string, options?: { includeUnsubscribe?: boolean; unsubscribeUrl?: string }): string {
  const unsubscribeSection = options?.includeUnsubscribe && options?.unsubscribeUrl
    ? `
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          <a href="${options.unsubscribeUrl}" style="color: #6b7280; text-decoration: underline;">Unsubscribe</a>
          &nbsp;|&nbsp;
          <a href="${BASE_URL}/settings" style="color: #6b7280; text-decoration: underline;">Manage preferences</a>
        </p>
      </div>
    `
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Boss of Clean</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Boss of Clean</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">Purrfection is our Standard</p>
        </div>

        <!-- Content -->
        <div style="background: white; padding: 32px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          ${content}
          ${unsubscribeSection}
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 24px; color: #9ca3af; font-size: 12px;">
          <p style="margin: 0 0 8px 0;">Boss of Clean - Florida's Premier Cleaning Marketplace</p>
          <p style="margin: 0;">
            <a href="${BASE_URL}" style="color: #6b7280; text-decoration: none;">bossofclean.com</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate a styled CTA button
 */
export function generateButton(text: string, url: string, color: 'primary' | 'success' | 'warning' = 'primary'): string {
  const colors = {
    primary: '#2563eb',
    success: '#16a34a',
    warning: '#ea580c',
  };

  return `
    <div style="text-align: center; margin: 24px 0;">
      <a href="${url}"
         style="display: inline-block; background-color: ${colors[color]}; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
        ${text}
      </a>
    </div>
  `;
}

/**
 * Generate an info box
 */
export function generateInfoBox(items: { label: string; value: string }[]): string {
  const rows = items
    .map(item => `<p style="margin: 8px 0;"><strong>${item.label}:</strong> ${item.value}</p>`)
    .join('');

  return `
    <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #2563eb;">
      ${rows}
    </div>
  `;
}

export { resend };
