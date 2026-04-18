import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/pro/documents — list current pro's documents
export async function GET() {
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

    const { data: documents, error } = await supabase
      .from('cleaner_documents')
      .select('*')
      .eq('cleaner_id', cleaner.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
    }

    return NextResponse.json({ documents: documents || [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/pro/documents — save document metadata after Storage upload
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { document_type, file_name, file_url, file_size, mime_type } = body

    const validTypes = ['license', 'insurance', 'background_check', 'certification', 'id_photo', 'other']
    if (!validTypes.includes(document_type)) {
      return NextResponse.json({ error: 'Invalid document type' }, { status: 400 })
    }
    if (!file_name || !file_url) {
      return NextResponse.json({ error: 'file_name and file_url are required' }, { status: 400 })
    }

    const { data: document, error } = await supabase
      .from('cleaner_documents')
      .insert({
        cleaner_id: cleaner.id,
        document_type,
        file_name,
        file_url,
        file_size: file_size || null,
        mime_type: mime_type || null,
        verification_status: 'pending',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to save document' }, { status: 500 })
    }

    return NextResponse.json({ success: true, document })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
