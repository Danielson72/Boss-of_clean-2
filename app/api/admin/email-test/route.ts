import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendResendEmail, wrapEmailTemplate, generateButton } from '@/lib/email/resend';
import { z } from 'zod';

const emailTestSchema = z.object({
  to: z.string().email('Invalid email address').optional(),
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can send test emails
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = emailTestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const recipient = parsed.data.to || user.email;

    if (!recipient) {
      return NextResponse.json({ error: 'No recipient email' }, { status: 400 });
    }

    const safeRecipient = escapeHtml(recipient);

    const html = wrapEmailTemplate(`
      <h2 style="margin: 0 0 16px 0; color: #111827;">Email Deliverability Test</h2>
      <p style="color: #4b5563; line-height: 1.6;">
        This is a test email from <strong>Boss of Clean</strong> to verify email deliverability.
      </p>
      <p style="color: #4b5563; line-height: 1.6;">
        If you received this email, your Resend integration is working correctly.
      </p>
      <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #22c55e;">
        <p style="margin: 0; color: #166534;"><strong>Status:</strong> Deliverability confirmed</p>
        <p style="margin: 8px 0 0 0; color: #166534;"><strong>Sent at:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET</p>
        <p style="margin: 8px 0 0 0; color: #166534;"><strong>Sent to:</strong> ${safeRecipient}</p>
      </div>
      ${generateButton('Go to Dashboard', process.env.NEXT_PUBLIC_SITE_URL || 'https://bossofclean.com' + '/dashboard')}
    `);

    const result = await sendResendEmail({
      to: recipient,
      subject: 'Boss of Clean — Email Deliverability Test',
      html,
      text: `Email Deliverability Test\n\nThis is a test email from Boss of Clean. If you received this, your Resend integration is working.\n\nSent at: ${new Date().toISOString()}`,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message_id: result.id,
        sent_to: recipient,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Unhandled error in /api/admin/email-test:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
