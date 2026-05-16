import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// DLD-445 — pros self-service for license registration.
// Verification (verification_status, verified_at, verified_by) is guarded
// by `public.pro_licenses_guard_verification_columns()` at the DB layer:
// non-admin inserts/updates always land as 'pending' regardless of what
// the client sends.

const ALLOWED_LICENSE_TYPES = [
  'plumbing',
  'hvac',
  'electrical',
  'general_contractor',
  'pest_control',
  'roofing',
  'other',
] as const;

const ALLOWED_AUTHORITIES = ['FL_DBPR', 'OTHER'] as const;

export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: pro, error: proError } = await supabase
    .from('pros')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (proError || !pro) {
    return NextResponse.json({ error: 'Pro profile not found' }, { status: 404 });
  }

  const { data: licenses, error } = await supabase
    .from('pro_licenses')
    .select(
      'id, license_type, license_number, issuing_state, issuing_authority, ' +
      'verification_status, submitted_documents, verified_at, rejection_reason, ' +
      'expires_at, dbpr_status, last_checked_at, notes, created_at, updated_at'
    )
    .eq('pro_id', pro.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch licenses' }, { status: 500 });
  }

  return NextResponse.json(licenses ?? []);
}

interface SubmitLicenseBody {
  license_type?: string;
  license_number?: string;
  issuing_state?: string;
  issuing_authority?: string;
  expires_at?: string | null;
  submitted_documents?: Array<{ url: string; label?: string; uploaded_at?: string }>;
  notes?: string | null;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: pro, error: proError } = await supabase
    .from('pros')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (proError || !pro) {
    return NextResponse.json({ error: 'Pro profile not found' }, { status: 404 });
  }

  let body: SubmitLicenseBody;
  try {
    body = (await request.json()) as SubmitLicenseBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const licenseType = body.license_type?.trim().toLowerCase();
  const licenseNumber = body.license_number?.trim();

  if (!licenseType || !ALLOWED_LICENSE_TYPES.includes(licenseType as typeof ALLOWED_LICENSE_TYPES[number])) {
    return NextResponse.json(
      { error: `license_type must be one of: ${ALLOWED_LICENSE_TYPES.join(', ')}` },
      { status: 400 }
    );
  }

  if (!licenseNumber || licenseNumber.length < 3 || licenseNumber.length > 64) {
    return NextResponse.json(
      { error: 'license_number must be 3-64 characters' },
      { status: 400 }
    );
  }

  const issuingState = (body.issuing_state ?? 'FL').trim().toUpperCase();
  if (issuingState.length !== 2) {
    return NextResponse.json({ error: 'issuing_state must be a 2-letter code' }, { status: 400 });
  }

  const issuingAuthority = (body.issuing_authority ?? 'FL_DBPR').trim().toUpperCase();
  if (!ALLOWED_AUTHORITIES.includes(issuingAuthority as typeof ALLOWED_AUTHORITIES[number])) {
    return NextResponse.json(
      { error: `issuing_authority must be one of: ${ALLOWED_AUTHORITIES.join(', ')}` },
      { status: 400 }
    );
  }

  let expiresAt: string | null = null;
  if (body.expires_at) {
    const parsed = new Date(body.expires_at);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: 'expires_at must be a valid ISO timestamp' }, { status: 400 });
    }
    expiresAt = parsed.toISOString();
  }

  const submittedDocuments = Array.isArray(body.submitted_documents)
    ? body.submitted_documents.filter(
        (d) => d && typeof d.url === 'string' && d.url.length > 0
      )
    : [];

  const { data: license, error: insertError } = await supabase
    .from('pro_licenses')
    .insert({
      pro_id: pro.id,
      license_type: licenseType,
      license_number: licenseNumber,
      issuing_state: issuingState,
      issuing_authority: issuingAuthority,
      expires_at: expiresAt,
      submitted_documents: submittedDocuments,
      notes: body.notes?.trim() || null,
      // verification_status is forced to 'pending' by the DB trigger
      // regardless of what we send; we omit it to be explicit.
    })
    .select()
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json(
        { error: 'You have already submitted this license. Update the existing record instead.' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to save license', details: insertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json(license, { status: 201 });
}
