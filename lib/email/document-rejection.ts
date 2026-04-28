/**
 * Document Rejection Email
 *
 * Sent to a cleaner when admin rejects one of their verification documents
 * via the admin review queue. Includes the admin's rejection reason verbatim
 * plus a deep link back to /dashboard/pro/documents for re-upload.
 */

import { sendResendEmail, wrapEmailTemplate, generateButton, DEFAULT_FROM, type SendEmailResult } from './resend';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bossofclean.com';

// Mirrors the DB CHECK enum on cleaner_documents.document_type plus a default
// label for unknown values. Keep in sync with the API allowlist at
// app/api/pro/documents/route.ts and the admin review page DOC_TYPE_LABELS.
const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  license: 'Business License',
  insurance: 'Liability Insurance',
  id_photo: 'ID Photo',
  background_check: 'Background Check',
  certification: 'Certification',
  other: 'Document',
};

export interface DocumentRejectionEmailParams {
  toEmail: string;
  businessName: string;
  documentType: string;
  rejectionReason: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendDocumentRejectionEmail(
  params: DocumentRejectionEmailParams
): Promise<SendEmailResult> {
  const { toEmail, businessName, documentType, rejectionReason } = params;
  const prettyType = DOCUMENT_TYPE_LABELS[documentType] ?? 'Document';
  const subject = `Action needed: Your ${prettyType} was not approved`;

  const safeBusinessName = escapeHtml(businessName);
  const safeReason = escapeHtml(rejectionReason);
  const safePrettyType = escapeHtml(prettyType);

  const html = wrapEmailTemplate(`
    <h2 style="color: #b91c1c; margin: 0 0 16px 0;">Document Not Approved</h2>
    <p style="color: #374151; margin: 0 0 16px 0;">
      Hi ${safeBusinessName},
    </p>
    <p style="color: #374151; margin: 0 0 16px 0;">
      Your <strong>${safePrettyType}</strong> was reviewed but couldn't be approved as submitted.
      Please read the admin's note below, then re-upload an updated document.
    </p>
    <div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #dc2626;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #991b1b;">Reason from admin:</p>
      <p style="margin: 0; color: #374151; white-space: pre-wrap;">${safeReason}</p>
    </div>
    ${generateButton(`Re-upload your ${prettyType}`, `${BASE_URL}/dashboard/pro/documents`, 'warning')}
    <p style="color: #6b7280; font-size: 14px; margin: 16px 0 0 0;">
      Once you re-upload, our team will review again within 1-2 business days.
    </p>
  `);

  return sendResendEmail({
    to: toEmail,
    subject,
    html,
    from: DEFAULT_FROM,
  });
}
