import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
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

  const { data: documents, error } = await supabase
    .from('cleaner_documents')
    .select(`
      id,
      document_type,
      file_name,
      file_url,
      file_size,
      verification_status,
      rejection_reason,
      created_at,
      verified_at,
      verified_by,
      cleaner_id,
      cleaners (
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

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }

  return NextResponse.json(documents ?? []);
}
