import { NextResponse } from 'next/server';
import { sendResendEmail, wrapEmailTemplate, ALERTS_FROM, generateInfoBox } from '@/lib/email/resend';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ file: 'api/admin/document-upload-notification' });

const ADMIN_EMAIL = 'admin@bossofclean.com';

const DOC_TYPE_LABELS: Record<string, string> = {
  license: 'Business License',
  insurance: 'Liability Insurance',
  id_photo: 'Photo ID',
  background_check: 'Background Check',
  certification: 'Certification',
  other: 'Other Document',
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { businessName, documentType, cleanerEmail, documentId } = body;

    if (!businessName || !documentType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const prettyType = DOC_TYPE_LABELS[documentType] ?? documentType;
    const subject = `New Document Uploaded: ${businessName} — ${prettyType}`;

    const infoItems = [
      { label: 'Business', value: businessName },
      { label: 'Document Type', value: prettyType },
      { label: 'Cleaner Email', value: cleanerEmail || 'Not provided' },
    ];
    if (documentId) {
      infoItems.push({ label: 'Document ID', value: documentId });
    }

    const html = wrapEmailTemplate(`
      <h2 style="color: #1e40af; margin: 0 0 16px 0;">New Document Awaiting Review 📄</h2>
      <p style="color: #374151; margin: 0 0 16px 0;">
        A pro just uploaded a verification document on Boss of Clean.
      </p>
      ${generateInfoBox(infoItems)}
      <p style="color: #374151; margin: 16px 0 0 0;">
        <a href="https://bossofclean.com/dashboard/admin/pros/documents"
           style="color: #2563eb; text-decoration: underline;">
          Review in Admin Dashboard →
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
      logger.error('Failed to send admin doc upload notification', { businessName, documentType }, result.error);
      return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
    }

    logger.info('Admin doc upload notification sent', { businessName, documentType, emailId: result.id });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Admin doc upload notification error', {}, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
