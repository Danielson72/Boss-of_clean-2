import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// DLD-445 — admin queue listing for pro_licenses verification.
// Default filter: pending. Pass ?status=verified|rejected|expired|all to
// override. RLS already restricts to admins, but we also gate the route
// at the application layer so a non-admin gets a clean 403.

export async function GET(request: NextRequest) {
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

  const statusParam = request.nextUrl.searchParams.get('status') ?? 'pending';
  const allowedStatuses = ['pending', 'verified', 'rejected', 'expired'];

  let query = supabase
    .from('pro_licenses')
    .select(`
      id,
      pro_id,
      license_type,
      license_number,
      issuing_state,
      issuing_authority,
      verification_status,
      submitted_documents,
      verified_at,
      verified_by,
      rejection_reason,
      expires_at,
      dbpr_status,
      last_checked_at,
      notes,
      created_at,
      updated_at,
      pros (
        id,
        business_name,
        user_id,
        users (
          full_name,
          email
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (statusParam !== 'all') {
    if (!allowedStatuses.includes(statusParam)) {
      return NextResponse.json(
        { error: `status must be one of: ${allowedStatuses.join(', ')}, all` },
        { status: 400 }
      );
    }
    query = query.eq('verification_status', statusParam);
  }

  const { data: licenses, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch licenses', details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(licenses ?? []);
}
