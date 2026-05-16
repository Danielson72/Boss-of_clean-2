import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// DLD-445 — admin verify / reject for a single pro_licenses row.
// The DB trigger `pro_licenses_guard_verification_columns` is bypassed
// for admins (public.is_admin() returns true) so the update lands as
// requested. We also log the action to admin_actions so it shows up in
// the existing audit trail next to document verifications.

interface PatchBody {
  action?: 'verify' | 'reject' | 'expire' | 'reset';
  rejection_reason?: string | null;
  notes?: string | null;
  dbpr_status?: string | null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();

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

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const action = body.action;
  if (!action || !['verify', 'reject', 'expire', 'reset'].includes(action)) {
    return NextResponse.json(
      { error: 'action must be one of: verify, reject, expire, reset' },
      { status: 400 }
    );
  }

  if (action === 'reject' && !body.rejection_reason?.trim()) {
    return NextResponse.json(
      { error: 'rejection_reason required when rejecting' },
      { status: 400 }
    );
  }

  const { data: existing, error: existingError } = await supabase
    .from('pro_licenses')
    .select('id, pro_id, verification_status, license_type, license_number')
    .eq('id', params.id)
    .single();

  if (existingError || !existing) {
    return NextResponse.json({ error: 'License not found' }, { status: 404 });
  }

  const nowIso = new Date().toISOString();

  const update: Record<string, unknown> = {};
  switch (action) {
    case 'verify':
      update.verification_status = 'verified';
      update.verified_at = nowIso;
      update.verified_by = user.id;
      update.rejection_reason = null;
      if (typeof body.dbpr_status === 'string') update.dbpr_status = body.dbpr_status;
      update.last_checked_at = nowIso;
      break;
    case 'reject':
      update.verification_status = 'rejected';
      update.verified_at = nowIso;
      update.verified_by = user.id;
      update.rejection_reason = body.rejection_reason!.trim();
      break;
    case 'expire':
      update.verification_status = 'expired';
      update.last_checked_at = nowIso;
      break;
    case 'reset':
      update.verification_status = 'pending';
      update.verified_at = null;
      update.verified_by = null;
      update.rejection_reason = null;
      break;
  }

  if (typeof body.notes === 'string') {
    update.notes = body.notes.trim() || null;
  }

  const { data: updated, error: updateError } = await supabase
    .from('pro_licenses')
    .update(update)
    .eq('id', params.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json(
      { error: 'Update failed', details: updateError.message },
      { status: 500 }
    );
  }

  // Audit. Don't fail the request if logging is unavailable.
  try {
    await supabase.from('admin_actions').insert({
      admin_id: user.id,
      action_type: `license_${action}`,
      target_type: 'pro_license',
      target_id: params.id,
      notes: body.rejection_reason ?? body.notes ?? null,
      metadata: {
        license_type: existing.license_type,
        license_number: existing.license_number,
        pro_id: existing.pro_id,
        previous_status: existing.verification_status,
      },
    });
  } catch (auditErr) {
    console.error('[admin-licenses] audit log failed:', auditErr);
  }

  return NextResponse.json(updated);
}
