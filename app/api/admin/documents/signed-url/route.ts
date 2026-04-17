import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/utils/logger'

const logger = createLogger({ file: 'api/admin/documents/signed-url' })

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (userData?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const documentId = request.nextUrl.searchParams.get('documentId')
  if (!documentId) return NextResponse.json({ error: 'documentId required' }, { status: 400 })

  const { data: doc, error: docErr } = await supabase
    .from('cleaner_documents')
    .select('file_url, file_name')
    .eq('id', documentId)
    .single()

  if (docErr || !doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

  // Extract storage path from file_url
  // file_url is either a full public URL or a storage path
  let storagePath: string
  const urlMatch = doc.file_url.match(/cleaner-documents\/(.+)$/)
  if (urlMatch) {
    storagePath = urlMatch[1]
  } else if (!doc.file_url.startsWith('http')) {
    storagePath = doc.file_url
  } else {
    // Already a direct URL (e.g. fallback blob URLs) — return as-is
    return NextResponse.json({ url: doc.file_url })
  }

  const { data: signed, error: signErr } = await supabase.storage
    .from('cleaner-documents')
    .createSignedUrl(storagePath, 300) // 5 min expiry

  if (signErr || !signed) {
    logger.error('Failed to create signed URL', { documentId }, signErr)
    return NextResponse.json({ error: 'Failed to create signed URL' }, { status: 500 })
  }

  return NextResponse.json({ url: signed.signedUrl })
}
