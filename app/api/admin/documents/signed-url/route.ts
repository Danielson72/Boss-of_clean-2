import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/admin/documents/signed-url?documentId=uuid
// Returns a 5-minute signed URL for viewing a private document
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    if (!documentId) {
      return NextResponse.json({ error: 'documentId is required' }, { status: 400 })
    }

    const { data: doc } = await supabase
      .from('cleaner_documents')
      .select('file_url')
      .eq('id', documentId)
      .single()

    if (!doc?.file_url) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Extract storage path from URL
    const match = doc.file_url.match(/cleaner-documents\/(.+)$/)
    if (!match) {
      return NextResponse.json({ error: 'Cannot parse storage path' }, { status: 400 })
    }

    const { data: urlData, error } = await supabase.storage
      .from('cleaner-documents')
      .createSignedUrl(match[1], 300) // 5 minutes

    if (error || !urlData) {
      return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 })
    }

    return NextResponse.json({ signedUrl: urlData.signedUrl })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
