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

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('Contact form error', { function: 'POST' }, err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
