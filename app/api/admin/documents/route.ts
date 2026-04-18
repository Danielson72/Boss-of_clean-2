import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function verifyAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
  return data?.role === 'admin' ? user : null
}

// GET /api/admin/documents?status=pending — list all cleaner documents
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const admin = await verifyAdmin(supabase)
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase
      .from('cleaner_documents')
      .select(`
        *,
        cleaner:cleaners(
          id,
          business_name,
          user:users(full_name, email)
        )
      `)
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('verification_status', status)
    }

    const { data: documents, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
    }

    return NextResponse.json({ documents: documents || [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/documents?id=uuid — approve or reject a document
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const admin = await verifyAdmin(supabase)
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('id')
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 })
    }

    const { status, notes } = await request.json() as { status: string; notes?: string }
    if (!['verified', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'status must be "verified" or "rejected"' }, { status: 400 })
    }
    if (status === 'rejected' && !notes?.trim()) {
      return NextResponse.json({ error: 'Review notes required when rejecting' }, { status: 400 })
    }

    // Use service-role to bypass RLS
    const srClient = createServiceRoleClient()

    // Update document
    const { data: doc, error: docError } = await srClient
      .from('cleaner_documents')
      .update({
        verification_status: status,
        verified_at: new Date().toISOString(),
        verified_by: admin.id,
        rejection_reason: status === 'rejected' ? (notes || null) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      .select('cleaner_id, document_type')
      .single()

    if (docError || !doc) {
      return NextResponse.json({ error: 'Failed to update document' }, { status: 500 })
    }

    // Log admin action
    await srClient.from('admin_actions').insert({
      admin_id: admin.id,
      action_type: status === 'verified' ? 'document_approved' : 'document_rejected',
      target_type: 'cleaner_document',
      target_id: documentId,
      notes: notes || null,
      metadata: { document_type: doc.document_type },
    })

    // Check if all required docs for this cleaner are now approved
    if (status === 'verified') {
      const { data: allDocs } = await srClient
        .from('cleaner_documents')
        .select('document_type, verification_status')
        .eq('cleaner_id', doc.cleaner_id)

      const approved = new Set(
        (allDocs || [])
          .filter(d => d.verification_status === 'verified')
          .map(d => d.document_type)
      )

      const requiredDocs = ['insurance', 'license']
      const allApproved = requiredDocs.every(t => approved.has(t))

      if (allApproved) {
        await srClient
          .from('cleaners')
          .update({ approval_status: 'approved' })
          .eq('id', doc.cleaner_id)
          .eq('approval_status', 'pending')

        // Notify pro
        const { data: cleaner } = await srClient
          .from('cleaners')
          .select('user_id, business_name, user:users(email)')
          .eq('id', doc.cleaner_id)
          .single()

        if (cleaner) {
          await srClient.from('notifications').insert({
            user_id: cleaner.user_id,
            type: 'approval',
            title: 'Account Approved!',
            message: `Your Boss of Clean pro account has been approved. You can now unlock leads and start earning.`,
            action_url: '/dashboard/pro',
          })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
