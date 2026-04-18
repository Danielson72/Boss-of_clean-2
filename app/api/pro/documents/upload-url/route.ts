import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/pro/documents/upload-url?filename=foo.pdf&type=insurance
// Returns a signed upload URL for Supabase Storage (5 min TTL)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: cleaner } = await supabase
      .from('cleaners')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!cleaner) {
      return NextResponse.json({ error: 'Cleaner profile not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename')
    const docType = searchParams.get('type') || 'other'
    if (!filename) {
      return NextResponse.json({ error: 'filename is required' }, { status: 400 })
    }

    const ext = filename.split('.').pop() || 'pdf'
    const storagePath = `${cleaner.id}/${docType}/${Date.now()}.${ext}`

    const { data, error } = await supabase.storage
      .from('cleaner-documents')
      .createSignedUploadUrl(storagePath, { upsert: false })

    if (error || !data) {
      return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 })
    }

    const publicUrl = supabase.storage.from('cleaner-documents').getPublicUrl(storagePath).data.publicUrl

    return NextResponse.json({
      signedUrl: data.signedUrl,
      path: storagePath,
      token: data.token,
      fileUrl: publicUrl,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
