import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';

const SIGNED_URL_EXPIRY_SECONDS = 600;

export async function GET(
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

  const adminSupabase = createServiceRoleClient();

  const { data: doc, error: docError } = await adminSupabase
    .from('cleaner_documents')
    .select('file_url, mime_type, file_name')
    .eq('id', params.id)
    .single();

  if (docError || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  const { data: signedUrlData, error: signedUrlError } = await adminSupabase.storage
    .from('cleaner-documents')
    .createSignedUrl(doc.file_url, SIGNED_URL_EXPIRY_SECONDS);

  if (signedUrlError || !signedUrlData?.signedUrl) {
    return NextResponse.json(
      { error: 'Failed to generate signed URL', details: signedUrlError?.message ?? 'Unknown' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    signedUrl: signedUrlData.signedUrl,
    mimeType: doc.mime_type,
    fileName: doc.file_name,
    expiresIn: SIGNED_URL_EXPIRY_SECONDS,
  });
}
