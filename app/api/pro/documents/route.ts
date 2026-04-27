import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: cleaner, error: cleanerError } = await supabase
    .from('cleaners')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (cleanerError || !cleaner) {
    return NextResponse.json({ error: 'Cleaner profile not found' }, { status: 404 });
  }

  const { data: documents, error } = await supabase
    .from('cleaner_documents')
    .select('id, document_type, file_name, file_url, file_size, verification_status, rejection_reason, created_at, verified_at')
    .eq('cleaner_id', cleaner.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }

  return NextResponse.json(documents ?? []);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: cleaner, error: cleanerError } = await supabase
    .from('cleaners')
    .select('id, business_name')
    .eq('user_id', user.id)
    .single();

  if (cleanerError || !cleaner) {
    return NextResponse.json({ error: 'Cleaner profile not found' }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  const documentType = formData.get('document_type') as string | null;

  const validTypes = ['license', 'insurance', 'background_check', 'id_photo', 'certification', 'other'];
  if (!documentType || !validTypes.includes(documentType)) {
    return NextResponse.json({ error: 'Invalid document_type' }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File exceeds 10 MB limit' }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'File type not allowed. Use PDF, JPG, PNG, or WebP.' }, { status: 400 });
  }

  const ext = file.name.split('.').pop() ?? 'pdf';
  const storagePath = `${cleaner.id}/${documentType}_${Date.now()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from('cleaner-documents')
    .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: 'Upload failed', details: uploadError.message }, { status: 500 });
  }

  const { data: { publicUrl } } = supabase.storage
    .from('cleaner-documents')
    .getPublicUrl(storagePath);

  const { data: doc, error: insertError } = await supabase
    .from('cleaner_documents')
    .insert({
      cleaner_id: cleaner.id,
      document_type: documentType,
      file_name: file.name,
      file_url: storagePath,
      file_size: file.size,
      mime_type: file.type,
      verification_status: 'pending',
    })
    .select()
    .single();

  if (insertError) {
    await supabase.storage.from('cleaner-documents').remove([storagePath]);
    return NextResponse.json({ error: 'Failed to save document record' }, { status: 500 });
  }

  // Best-effort notifications (non-blocking — failures must not break the upload).
  const prettyType = ({
    license: 'Business License',
    insurance: 'Liability Insurance',
    id_photo: 'Photo ID',
    background_check: 'Background Check',
    certification: 'Certification',
    other: 'Other Document',
  } as Record<string, string>)[documentType] ?? documentType;

  try {
    const adminSupabase = createServiceRoleClient();
    const { data: admins } = await adminSupabase
      .from('users')
      .select('id')
      .eq('role', 'admin');

    if (admins && admins.length > 0) {
      const notificationRows = admins.map(admin => ({
        user_id: admin.id,
        type: 'document_upload',
        title: 'New Pro Document Uploaded',
        message: `${cleaner.business_name ?? 'A pro'} uploaded ${prettyType} for review.`,
        action_url: '/dashboard/admin/pros/documents',
      }));
      await adminSupabase.from('notifications').insert(notificationRows);
    }
  } catch (notifyErr) {
    console.error('[doc-upload] in-app notification failed:', notifyErr);
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bossofclean.com';
    fetch(`${baseUrl}/api/admin/document-upload-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName: cleaner.business_name ?? 'Unknown',
        documentType,
        cleanerEmail: user.email,
        documentId: doc.id,
      }),
    }).catch(err => console.error('[doc-upload] admin email failed:', err));
  } catch (emailErr) {
    console.error('[doc-upload] admin email setup failed:', emailErr);
  }

  return NextResponse.json(doc, { status: 201 });
}
