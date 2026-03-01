import { NextResponse } from 'next/server';
import { sendResendEmail, wrapEmailTemplate, ALERTS_FROM, generateInfoBox } from '@/lib/email/resend';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ file: 'api/admin/signup-notification' });

const ADMIN_EMAIL = 'admin@bossofclean.com';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, fullName, role, businessName, phone, zipCode } = body;

    if (!email || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const roleLabel = role === 'cleaner' ? '🧹 Pro Cleaner' : '🏠 Customer';
    const subject = `New ${roleLabel} Signup: ${fullName || email}`;

    const infoItems = [
      { label: 'Email', value: email },
      { label: 'Name', value: fullName || 'Not provided' },
      { label: 'Role', value: roleLabel },
    ];

    if (role === 'cleaner') {
      infoItems.push(
        { label: 'Business Name', value: businessName || 'Not provided' },
        { label: 'Phone', value: phone || 'Not provided' },
        { label: 'Zip Code', value: zipCode || 'Not provided' }
      );
    }

    const html = wrapEmailTemplate(`
      <h2 style="color: #1e40af; margin: 0 0 16px 0;">New Account Signup! 🎉</h2>
      <p style="color: #374151; margin: 0 0 16px 0;">
        A new <strong>${roleLabel}</strong> just signed up on Boss of Clean.
      </p>
      ${generateInfoBox(infoItems)}
      <p style="color: #374151; margin: 16px 0 0 0;">
        <a href="https://bossofclean.com/dashboard/admin" 
           style="color: #2563eb; text-decoration: underline;">
          View in Admin Dashboard →
        </a>
      </p>
    `);

    const result = await sendResendEmail({
      to: ADMIN_EMAIL,
      subject,
      html,
      from: ALERTS_FROM,
    });

    if (!result.success) {
      logger.error('Failed to send admin signup notification', { email, role }, result.error);
      return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
    }

    logger.info('Admin signup notification sent', { email, role, emailId: result.id });
    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error('Admin signup notification error', {}, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
