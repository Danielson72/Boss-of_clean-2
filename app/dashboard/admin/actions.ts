'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface ActionResult {
  success: boolean
  error?: string
  data?: Record<string, unknown>
}

// Helper to verify admin access
async function verifyAdmin(): Promise<{ isAdmin: boolean; userId?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { isAdmin: false, error: 'Not authenticated' }
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userData?.role !== 'admin') {
    return { isAdmin: false, error: 'Admin access required' }
  }

  return { isAdmin: true, userId: user.id }
}

export async function approveCleaner(cleanerId: string, notes?: string): Promise<ActionResult> {
  const { isAdmin, error: authError } = await verifyAdmin()
  if (!isAdmin) {
    return { success: false, error: authError }
  }

  const supabase = await createClient()

  // Call the database function
  const { data, error } = await supabase.rpc('approve_cleaner', {
    p_cleaner_id: cleanerId,
    p_admin_notes: notes || null
  })

  if (error) {
    console.error('Error approving cleaner:', error)
    return { success: false, error: error.message }
  }

  if (!data.success) {
    return { success: false, error: data.error }
  }

  // Send approval email notification
  await sendStatusEmail(data.email, data.business_name, 'approved')

  revalidatePath('/dashboard/admin')
  return { success: true, data }
}

export async function rejectCleaner(cleanerId: string, reason: string): Promise<ActionResult> {
  if (!reason || reason.trim() === '') {
    return { success: false, error: 'Rejection reason is required' }
  }

  const { isAdmin, error: authError } = await verifyAdmin()
  if (!isAdmin) {
    return { success: false, error: authError }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.rpc('reject_cleaner', {
    p_cleaner_id: cleanerId,
    p_reason: reason
  })

  if (error) {
    console.error('Error rejecting cleaner:', error)
    return { success: false, error: error.message }
  }

  if (!data.success) {
    return { success: false, error: data.error }
  }

  // Send rejection email notification
  await sendStatusEmail(data.email, data.business_name, 'rejected', reason)

  revalidatePath('/dashboard/admin')
  return { success: true, data }
}

export async function requestCleanerInfo(cleanerId: string, requestNotes: string): Promise<ActionResult> {
  if (!requestNotes || requestNotes.trim() === '') {
    return { success: false, error: 'Request notes are required' }
  }

  const { isAdmin, error: authError } = await verifyAdmin()
  if (!isAdmin) {
    return { success: false, error: authError }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.rpc('request_cleaner_info', {
    p_cleaner_id: cleanerId,
    p_request_notes: requestNotes
  })

  if (error) {
    console.error('Error requesting info:', error)
    return { success: false, error: error.message }
  }

  if (!data.success) {
    return { success: false, error: data.error }
  }

  // Send info request email notification
  await sendStatusEmail(data.email, data.business_name, 'info_requested', requestNotes)

  revalidatePath('/dashboard/admin')
  return { success: true, data }
}

export async function verifyDocument(
  documentId: string,
  status: 'verified' | 'rejected',
  notes?: string
): Promise<ActionResult> {
  const { isAdmin, error: authError } = await verifyAdmin()
  if (!isAdmin) {
    return { success: false, error: authError }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.rpc('verify_document', {
    p_document_id: documentId,
    p_status: status,
    p_notes: notes || null
  })

  if (error) {
    console.error('Error verifying document:', error)
    return { success: false, error: error.message }
  }

  if (!data.success) {
    return { success: false, error: data.error }
  }

  revalidatePath('/dashboard/admin')
  return { success: true, data }
}

export async function getCleanerDetails(cleanerId: string): Promise<ActionResult> {
  const { isAdmin, error: authError } = await verifyAdmin()
  if (!isAdmin) {
    return { success: false, error: authError }
  }

  const supabase = await createClient()

  // Get cleaner with user info and documents
  const { data: cleaner, error: cleanerError } = await supabase
    .from('cleaners')
    .select(`
      *,
      user:users(
        id,
        email,
        full_name,
        phone,
        city,
        state,
        zip_code,
        created_at
      )
    `)
    .eq('id', cleanerId)
    .single()

  if (cleanerError) {
    return { success: false, error: cleanerError.message }
  }

  // Get documents
  const { data: documents, error: docsError } = await supabase
    .from('cleaner_documents')
    .select('*')
    .eq('cleaner_id', cleanerId)
    .order('created_at', { ascending: false })

  if (docsError) {
    console.error('Error fetching documents:', docsError)
  }

  // Get review history
  const { data: reviews, error: reviewsError } = await supabase
    .from('cleaner_reviews')
    .select(`
      *,
      admin:users!cleaner_reviews_admin_user_id_fkey(
        email,
        full_name
      )
    `)
    .eq('cleaner_id', cleanerId)
    .order('created_at', { ascending: false })

  if (reviewsError) {
    console.error('Error fetching reviews:', reviewsError)
  }

  return {
    success: true,
    data: {
      cleaner,
      documents: documents || [],
      reviews: reviews || []
    }
  }
}

// Email notification helper
async function sendStatusEmail(
  email: string,
  businessName: string,
  status: 'approved' | 'rejected' | 'info_requested',
  reason?: string
): Promise<void> {
  // In production, integrate with your email service (Resend, SendGrid, etc.)
  // For now, just log the email that would be sent

  const subjects = {
    approved: 'Your Application Has Been Approved!',
    rejected: 'Application Status Update',
    info_requested: 'Additional Information Required'
  }

  const bodies = {
    approved: `
Congratulations! Your cleaning business "${businessName}" has been approved on Boss of Clean.

You can now:
- Receive quote requests from customers
- Update your business profile
- Manage your service areas

Log in to your dashboard to get started: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/cleaner
    `,
    rejected: `
Thank you for your interest in Boss of Clean.

Unfortunately, we are unable to approve your application for "${businessName}" at this time.

Reason: ${reason}

If you believe this was in error or would like to reapply with updated information, please contact our support team.
    `,
    info_requested: `
We're reviewing your application for "${businessName}" on Boss of Clean and need additional information.

Request: ${reason}

Please log in to your dashboard to update your application: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/cleaner/onboarding

Once you've provided the requested information, we'll continue reviewing your application.
    `
  }

  console.log('=== Email Notification ===')
  console.log(`To: ${email}`)
  console.log(`Subject: ${subjects[status]}`)
  console.log(`Body: ${bodies[status]}`)
  console.log('========================')

  // TODO: Implement actual email sending
  // Example with Resend:
  // await resend.emails.send({
  //   from: 'Boss of Clean <noreply@bossofclean.com>',
  //   to: email,
  //   subject: subjects[status],
  //   text: bodies[status]
  // })
}

export async function bulkApprovecleaners(cleanerIds: string[]): Promise<ActionResult> {
  const { isAdmin, error: authError } = await verifyAdmin()
  if (!isAdmin) {
    return { success: false, error: authError }
  }

  const results: { id: string; success: boolean; error?: string }[] = []

  for (const cleanerId of cleanerIds) {
    const result = await approveCleaner(cleanerId)
    results.push({ id: cleanerId, ...result })
  }

  const allSuccess = results.every(r => r.success)
  const successCount = results.filter(r => r.success).length

  revalidatePath('/dashboard/admin')

  return {
    success: allSuccess,
    data: {
      results,
      message: `Approved ${successCount} of ${cleanerIds.length} applications`
    }
  }
}
