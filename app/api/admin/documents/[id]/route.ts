import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const REQUIRED_DOC_TYPES = ['business_license', 'insurance_certificate', 'w9'];

async function sendApprovalEmail(cleanerEmail: string, cleanerName: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Boss of Clean <noreply@bossofclean.com>',
      to: cleanerEmail,
      subject: 'Your Boss of Clean account is approved!',
      html: `<p>Hi ${cleanerName},</p><p>Your Boss of Clean account is approved. You can now unlock leads.</p><p>– The Boss of Clean Team</p>`,
    }),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: userRecord } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userRecord?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { action, review_notes } = body;

  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'action must be "approve" or "reject"' }, { status: 400 });
  }

  if (action === 'reject' && !review_notes?.trim()) {
    return NextResponse.json({ error: 'review_notes required when rejecting' }, { status: 400 });
  }

  const { data: doc, error: docError } = await supabase
    .from('cleaner_documents')
    .select('id, cleaner_id, document_type')
    .eq('id', params.id)
    .single();

  if (docError || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  const newStatus = action === 'approve' ? 'approved' : 'rejected';

  const { data: updated, error: updateError } = await supabase
    .from('cleaner_documents')
    .update({
      verification_status: newStatus,
      verified_at: new Date().toISOString(),
      verified_by: user.id,
      rejection_reason: review_notes ?? null,
    })
    .eq('id', params.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  await supabase.from('admin_actions').insert({
    admin_id: user.id,
    action_type: `document_${action}`,
    target_type: 'cleaner_document',
    target_id: params.id,
    notes: review_notes ?? null,
    metadata: { document_type: doc.document_type, cleaner_id: doc.cleaner_id },
  });

  if (action === 'approve') {
    const { data: allDocs } = await supabase
      .from('cleaner_documents')
      .select('document_type, verification_status')
      .eq('cleaner_id', doc.cleaner_id);

    const approvedTypes = new Set(
      (allDocs ?? [])
        .filter(d => d.verification_status === 'approved')
        .map(d => d.document_type)
    );

    const allRequiredApproved = REQUIRED_DOC_TYPES.every(t => approvedTypes.has(t));

    if (allRequiredApproved) {
      await supabase
        .from('cleaners')
        .update({ approval_status: 'approved', approved_at: new Date().toISOString() })
        .eq('id', doc.cleaner_id);

      const { data: cleanerData } = await supabase
        .from('cleaners')
        .select('user_id, business_name, users(email, full_name)')
        .eq('id', doc.cleaner_id)
        .single();

      if (cleanerData) {
        const userData = Array.isArray(cleanerData.users) ? cleanerData.users[0] : cleanerData.users;
        if (userData?.email) {
          await sendApprovalEmail(userData.email, userData.full_name ?? cleanerData.business_name);
        }
      }
    }
  }

  return NextResponse.json(updated);
}
