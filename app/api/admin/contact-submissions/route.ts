export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase: null, error: 'Not authenticated' };

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userData?.role !== 'admin') return { supabase: null, error: 'Admin access required' };
  return { supabase, error: null };
}

export async function GET() {
  const { supabase, error } = await verifyAdmin();
  if (!supabase) {
    return NextResponse.json({ error }, { status: 403 });
  }

  const { data, error: dbError } = await supabase
    .from('contact_submissions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ submissions: data });
}

export async function PATCH(request: NextRequest) {
  const { supabase, error } = await verifyAdmin();
  if (!supabase) {
    return NextResponse.json({ error }, { status: 403 });
  }

  const body = await request.json();
  const { id, is_read } = body;

  if (!id || typeof is_read !== 'boolean') {
    return NextResponse.json({ error: 'id and is_read are required' }, { status: 400 });
  }

  const { error: dbError } = await supabase
    .from('contact_submissions')
    .update({ is_read })
    .eq('id', id);

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
