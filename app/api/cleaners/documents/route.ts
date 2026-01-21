import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/cleaners/documents - Get cleaner's documents
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get cleaner profile
    const { data: cleaner, error: cleanerError } = await supabase
      .from('cleaners')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (cleanerError || !cleaner) {
      return NextResponse.json({ error: 'Cleaner profile not found' }, { status: 404 })
    }

    // Get documents
    const { data: documents, error } = await supabase
      .from('cleaner_documents')
      .select('*')
      .eq('cleaner_id', cleaner.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching documents:', error)
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
    }

    return NextResponse.json({ documents: documents || [] })
  } catch (error) {
    console.error('Error in GET /api/cleaners/documents:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/cleaners/documents - Upload a document (metadata only, actual upload via Supabase Storage)
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get cleaner profile
    const { data: cleaner, error: cleanerError } = await supabase
      .from('cleaners')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (cleanerError || !cleaner) {
      return NextResponse.json({ error: 'Cleaner profile not found' }, { status: 404 })
    }

    const body = await request.json()
    const { document_type, file_name, file_url, file_size, mime_type } = body

    // Validate document type
    const validTypes = ['license', 'insurance', 'background_check', 'certification', 'other']
    if (!validTypes.includes(document_type)) {
      return NextResponse.json({ error: 'Invalid document type' }, { status: 400 })
    }

    if (!file_name || !file_url) {
      return NextResponse.json({ error: 'File name and URL are required' }, { status: 400 })
    }

    // Insert document record
    const { data: document, error } = await supabase
      .from('cleaner_documents')
      .insert({
        cleaner_id: cleaner.id,
        document_type,
        file_name,
        file_url,
        file_size: file_size || null,
        mime_type: mime_type || null,
        verification_status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating document:', error)
      return NextResponse.json({ error: 'Failed to save document' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      document
    })
  } catch (error) {
    console.error('Error in POST /api/cleaners/documents:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/cleaners/documents - Delete a document
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('id')

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    // Get cleaner profile
    const { data: cleaner, error: cleanerError } = await supabase
      .from('cleaners')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (cleanerError || !cleaner) {
      return NextResponse.json({ error: 'Cleaner profile not found' }, { status: 404 })
    }

    // Delete document (RLS will ensure it belongs to this cleaner)
    const { error } = await supabase
      .from('cleaner_documents')
      .delete()
      .eq('id', documentId)
      .eq('cleaner_id', cleaner.id)

    if (error) {
      console.error('Error deleting document:', error)
      return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/cleaners/documents:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
