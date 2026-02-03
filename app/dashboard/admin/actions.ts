'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createLogger } from '@/lib/utils/logger'
import { sendResendEmail, wrapEmailTemplate, generateButton } from '@/lib/email/resend'

const logger = createLogger({ file: 'app/dashboard/admin/actions' })
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bossofclean.com'

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
    logger.error('Error approving cleaner', { function: 'approveCleaner' }, error)
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
    logger.error('Error rejecting cleaner', { function: 'rejectCleaner' }, error)
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
    logger.error('Error requesting info', { function: 'requestCleanerInfo' }, error)
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
    logger.error('Error verifying document', { function: 'verifyDocument' }, error)
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
    logger.error('Error fetching documents', { function: 'getCleanerDetails' }, docsError)
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
    logger.error('Error fetching reviews', { function: 'getCleanerDetails' }, reviewsError)
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
  const subjects = {
    approved: 'Your Application Has Been Approved!',
    rejected: 'Application Status Update',
    info_requested: 'Additional Information Required'
  }

  let content: string

  if (status === 'approved') {
    content = `
      <h2 style="color: #16a34a; font-size: 24px; margin: 0 0 8px 0;">Congratulations!</h2>
      <p style="color: #6b7280; font-size: 16px; margin-bottom: 24px;">
        Your cleaning business <strong>"${businessName}"</strong> has been approved on Boss of Clean.
      </p>

      <div style="background: #ecfdf5; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #16a34a;">
        <p style="margin: 0 0 12px 0; color: #065f46; font-weight: 600;">You can now:</p>
        <ul style="color: #047857; margin: 0; padding-left: 20px;">
          <li>Receive quote requests from customers</li>
          <li>Update your business profile</li>
          <li>Manage your service areas</li>
          <li>Start earning with Boss of Clean!</li>
        </ul>
      </div>

      ${generateButton('Go to Your Dashboard', `${BASE_URL}/dashboard/cleaner`, 'success')}
    `
  } else if (status === 'rejected') {
    content = `
      <h2 style="color: #111827; font-size: 24px; margin: 0 0 8px 0;">Application Update</h2>
      <p style="color: #6b7280; font-size: 16px; margin-bottom: 24px;">
        Thank you for your interest in Boss of Clean.
      </p>

      <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">
        Unfortunately, we are unable to approve your application for <strong>"${businessName}"</strong> at this time.
      </p>

      <div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #dc2626;">
        <p style="margin: 0; color: #991b1b; font-weight: 600;">Reason:</p>
        <p style="margin: 8px 0 0 0; color: #b91c1c;">${reason || 'Please contact support for more information.'}</p>
      </div>

      <p style="color: #6b7280; font-size: 14px;">
        If you believe this was in error or would like to reapply with updated information, please contact our support team.
      </p>
    `
  } else {
    content = `
      <h2 style="color: #f59e0b; font-size: 24px; margin: 0 0 8px 0;">Additional Information Needed</h2>
      <p style="color: #6b7280; font-size: 16px; margin-bottom: 24px;">
        We're reviewing your application for <strong>"${businessName}"</strong> and need a bit more information.
      </p>

      <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <p style="margin: 0; color: #92400e; font-weight: 600;">What we need:</p>
        <p style="margin: 8px 0 0 0; color: #78350f;">${reason || 'Please check your dashboard for details.'}</p>
      </div>

      ${generateButton('Update Your Application', `${BASE_URL}/dashboard/cleaner/onboarding`, 'warning')}

      <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
        Once you've provided the requested information, we'll continue reviewing your application.
      </p>
    `
  }

  logger.info('Sending status email', {
    function: 'sendStatusEmail',
    to: email,
    status,
  })

  await sendResendEmail({
    to: email,
    subject: subjects[status],
    html: wrapEmailTemplate(content),
  })
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
