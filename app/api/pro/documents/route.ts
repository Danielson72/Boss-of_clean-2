import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function GET() {
  const supabase = createClient();

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
  const supabase = createClient();

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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  const documentType = formData.get('document_type') as string | null;

  const validTypes = ['business_license', 'insurance_certificate', 'w9', 'ein_letter', 'other'];
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
    return NextResponse.json({ error: 'File type not allowed. Use PDF, JPG, PNG, or HEIC.' }, { status: 400 });
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

  return NextResponse.json(doc, { status: 201 });
}
