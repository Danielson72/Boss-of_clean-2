export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { createLogger } from '@/lib/utils/logger';
import { sendResendEmail, wrapEmailTemplate, generateInfoBox, ALERTS_FROM } from '@/lib/email/resend';

const logger = createLogger({ file: 'api/contact/route' });

const ADMIN_EMAIL = 'admin@bossofclean.com';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Name, email, subject, and message are required' },
        { status: 400 }
      );
    }

    // 1. Save to database FIRST (before attempting email)
    const supabase = createServiceRoleClient();
    const { error: dbError } = await supabase
      .from('contact_submissions')
      .insert({
        name: name.trim(),
        email: email.trim(),
        phone: body.phone?.trim() || null,
        subject,
        message: message.trim(),
      });

    if (dbError) {
      logger.error('Failed to save contact submission', { function: 'POST' }, dbError);
      return NextResponse.json(
        { error: 'Failed to save your message. Please try again.' },
        { status: 500 }
      );
    }

    logger.info('Contact submission saved', { function: 'POST', email, subject });

    // 2. Send notification email to admin (non-blocking — DB save already succeeded)
    const subjectLabels: Record<string, string> = {
      general: 'General Inquiry',
      list_business: 'List My Business',
      customer_support: 'Customer Support',
      partnership: 'Partnership',
      other: 'Other',
    };

    try {
      const emailContent = `
        <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px 0;">New Contact Form Submission</h2>
        ${generateInfoBox([
          { label: 'Name', value: name },
          { label: 'Email', value: email },
          ...(body.phone ? [{ label: 'Phone', value: body.phone }] : []),
          { label: 'Subject', value: subjectLabels[subject] || subject },
        ])}
        <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; font-weight: 600; color: #374151;">Message:</p>
          <p style="margin: 0; color: #4b5563; white-space: pre-wrap;">${message}</p>
        </div>
      `;

      await sendResendEmail({
        to: ADMIN_EMAIL,
        subject: `[Contact Form] ${subjectLabels[subject] || subject} — ${name}`,
        html: wrapEmailTemplate(emailContent),
        replyTo: email,
        from: ALERTS_FROM,
      });
    } catch (emailErr) {
      // Email failure is non-critical — submission is already saved
      logger.error('Failed to send admin notification email', { function: 'POST' }, emailErr);
    }

    // 3. Send confirmation email to customer
    try {
      const customerHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Boss of Clean</h1>
              <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px; color: #FF5F1F;">Purrfection is our Standard</p>
            </div>
            <div style="background: white; padding: 32px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              <p style="color: #111827; font-size: 16px; margin: 0 0 16px 0;">Hi ${name},</p>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Thank you for reaching out to Boss of Clean! We've received your message and our team will get back to you within 24 hours.
              </p>
              <p style="color: #374151; font-size: 14px; font-weight: 600; margin: 0 0 12px 0;">Here's a summary of what you sent us:</p>
              <div style="background: #f9fafb; border-left: 4px solid #FF5F1F; border-radius: 0 8px 8px 0; padding: 16px; margin: 0 0 24px 0;">
                <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;"><strong>Subject:</strong> ${subjectLabels[subject] || subject}</p>
                <p style="margin: 0; color: #6b7280; font-size: 13px;"><strong>Message:</strong></p>
                <p style="margin: 8px 0 0 0; color: #374151; font-size: 14px; white-space: pre-wrap;">${message}</p>
              </div>
              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 24px;">
                <p style="color: #4b5563; font-size: 14px; margin: 0 0 4px 0;">
                  If you need immediate assistance, call us at
                </p>
                <a href="tel:407-461-6039" style="color: #FF5F1F; font-size: 18px; font-weight: 700; text-decoration: none;">407-461-6039</a>
              </div>
            </div>
            <div style="text-align: center; padding: 24px; color: #9ca3af; font-size: 12px;">
              <p style="margin: 0 0 4px 0; color: #FF5F1F; font-weight: 600;">Purrfection is our Standard</p>
              <p style="margin: 0;">
                <a href="https://bossofclean.com" style="color: #6b7280; text-decoration: none;">bossofclean.com</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      await sendResendEmail({
        to: email,
        subject: 'We received your message — Boss of Clean',
        html: customerHtml,
        from: 'Boss of Clean <no-reply@bossofclean.com>',
      });
    } catch (customerEmailErr) {
      logger.error('Failed to send customer confirmation email', { function: 'POST', email }, customerEmailErr);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('Contact form error', { function: 'POST' }, err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
