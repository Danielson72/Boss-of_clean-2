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

// Fetch pro contact info + user_id for notifications
async function getProContact(cleanerId: string): Promise<{ email: string; business_name: string; user_id: string } | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('cleaners')
    .select('business_name, user_id, user:users(email)')
    .eq('id', cleanerId)
    .single()
  const email = (data?.user as Record<string, unknown>)?.email as string | undefined
  if (!email || !data?.business_name || !data?.user_id) return null
  return { email, business_name: data.business_name, user_id: data.user_id }
}

// Insert a notification record for a pro
async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  actionUrl?: string
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    message,
    action_url: actionUrl || null,
  })
  if (error) {
    logger.error('Failed to create notification', { function: 'createNotification', type }, error)
  }
}

export async function approveCleaner(cleanerId: string, notes?: string): Promise<ActionResult> {
  console.log('[approveCleaner] start', { cleanerId })
  try {
    const { isAdmin, error: authError } = await verifyAdmin()
    if (!isAdmin) {
      return { success: false, error: authError }
    }

    const supabase = await createClient()

    // Call the database function
    const { data, error } = await supabase.rpc('approve_cleaner', {
      p_cleaner_id: cleanerId
    })

    if (error) {
      logger.error('Error approving cleaner', { function: 'approveCleaner' }, error)
      return { success: false, error: error.message }
    }

    if (!data?.success) {
      return { success: false, error: data?.error || 'RPC returned unsuccessful' }
    }

    // Get contact info for notification + email
    let contact: { email: string; business_name: string; user_id: string } | null = null
    try {
      contact = (data.email && data.business_name && data.user_id)
        ? { email: data.email, business_name: data.business_name, user_id: data.user_id }
        : await getProContact(cleanerId)
    } catch (contactErr) {
      logger.error('Failed to get pro contact', { function: 'approveCleaner' }, contactErr)
    }

    if (contact) {
      // Create in-app notification (non-blocking)
      try {
        await createNotification(
          contact.user_id,
          'approval',
          'Application Approved!',
          `Congratulations! Your business "${contact.business_name}" has been approved. You can now receive quote requests and start earning.`,
          '/dashboard/pro'
        )
      } catch (notifErr) {
        logger.error('Failed to create approval notification', { function: 'approveCleaner' }, notifErr)
      }

      // Send email (fire-and-forget)
      try {
        await sendStatusEmail(contact.email, contact.business_name, 'approved')
      } catch (emailErr) {
        logger.error('Failed to send approval email', { function: 'approveCleaner' }, emailErr)
      }
    }

    revalidatePath('/dashboard/admin')
    console.log('[approveCleaner] success', { cleanerId })
    return { success: true, data }
  } catch (err) {
    logger.error('Unexpected error in approveCleaner', { function: 'approveCleaner', cleanerId }, err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function rejectCleaner(cleanerId: string, reason: string): Promise<ActionResult> {
  console.log('[rejectCleaner] start', { cleanerId })
  if (!reason || reason.trim() === '') {
    return { success: false, error: 'Rejection reason is required' }
  }

  try {
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

    if (!data?.success) {
      return { success: false, error: data?.error || 'RPC returned unsuccessful' }
    }

    // Get contact info for notification + email
    let contact: { email: string; business_name: string; user_id: string } | null = null
    try {
      contact = (data.email && data.business_name && data.user_id)
        ? { email: data.email, business_name: data.business_name, user_id: data.user_id }
        : await getProContact(cleanerId)
    } catch (contactErr) {
      logger.error('Failed to get pro contact', { function: 'rejectCleaner' }, contactErr)
    }

    if (contact) {
      // Create in-app notification (non-blocking)
      try {
        await createNotification(
          contact.user_id,
          'rejection',
          'Application Update',
          `Your application for "${contact.business_name}" was not approved. Reason: ${reason}`,
          '/dashboard/pro/profile'
        )
      } catch (notifErr) {
        logger.error('Failed to create rejection notification', { function: 'rejectCleaner' }, notifErr)
      }

      // Send email (fire-and-forget)
      try {
        await sendStatusEmail(contact.email, contact.business_name, 'rejected', reason)
      } catch (emailErr) {
        logger.error('Failed to send rejection email', { function: 'rejectCleaner' }, emailErr)
      }
    }

    revalidatePath('/dashboard/admin')
    console.log('[rejectCleaner] success', { cleanerId })
    return { success: true, data }
  } catch (err) {
    logger.error('Unexpected error in rejectCleaner', { function: 'rejectCleaner', cleanerId }, err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function requestCleanerInfo(cleanerId: string, requestNotes: string): Promise<ActionResult> {
  console.log('[requestCleanerInfo] start', { cleanerId })
  if (!requestNotes || requestNotes.trim() === '') {
    return { success: false, error: 'Request notes are required' }
  }

  try {
    const { isAdmin, error: authError } = await verifyAdmin()
    if (!isAdmin) {
      return { success: false, error: authError }
    }

    const supabase = await createClient()

    const { data, error } = await supabase.rpc('request_cleaner_info', {
      p_cleaner_id: cleanerId,
      p_message: requestNotes
    })

    if (error) {
      logger.error('Error requesting info', { function: 'requestCleanerInfo' }, error)
      return { success: false, error: error.message }
    }

    if (!data?.success) {
      return { success: false, error: data?.error || 'RPC returned unsuccessful' }
    }

    // Get contact info for notification + email
    let contact: { email: string; business_name: string; user_id: string } | null = null
    try {
      contact = (data.email && data.business_name && data.user_id)
        ? { email: data.email, business_name: data.business_name, user_id: data.user_id }
        : await getProContact(cleanerId)
    } catch (contactErr) {
      logger.error('Failed to get pro contact', { function: 'requestCleanerInfo' }, contactErr)
    }

    if (contact) {
      // Create in-app notification (non-blocking)
      try {
        await createNotification(
          contact.user_id,
          'info_request',
          'Additional Information Needed',
          `We need more information about your application for "${contact.business_name}": ${requestNotes}`,
          '/dashboard/pro/profile'
        )
      } catch (notifErr) {
        logger.error('Failed to create info request notification', { function: 'requestCleanerInfo' }, notifErr)
      }

      // Send email (fire-and-forget)
      try {
        await sendStatusEmail(contact.email, contact.business_name, 'info_requested', requestNotes)
      } catch (emailErr) {
        logger.error('Failed to send info request email', { function: 'requestCleanerInfo' }, emailErr)
      }
    }

    revalidatePath('/dashboard/admin')
    console.log('[requestCleanerInfo] success', { cleanerId })
    return { success: true, data }
  } catch (err) {
    logger.error('Unexpected error in requestCleanerInfo', { function: 'requestCleanerInfo', cleanerId }, err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function verifyDocument(
  documentId: string,
  status: 'verified' | 'rejected' | 'expired',
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
    p_notes: notes ?? null,
  })

  if (error) {
    logger.error('Error verifying document', { function: 'verifyDocument' }, error)
    return { success: false, error: error.message }
  }

  if (!data?.success) {
    return { success: false, error: data?.error || 'RPC returned unsuccessful' }
  }

  // Send email to pro
  const cleanerId = data.cleaner_id as string | undefined
  if (cleanerId) {
    try {
      const contact = await getProContact(cleanerId)
      if (contact) {
        const docLabel = (data.document_type as string | undefined) ?? 'document'
        const isApproved = status === 'verified'
        const subject = isApproved
          ? `Your ${docLabel} has been verified — Boss of Clean`
          : `Action required: ${docLabel} ${status} — Boss of Clean`
        const bodyHtml = wrapEmailTemplate(`
          <h2 style="margin:0 0 16px">${isApproved ? '✅ Document Verified' : status === 'rejected' ? '❌ Document Rejected' : '⚠️ Document Expired'}</h2>
          <p>Hi ${contact.business_name},</p>
          <p>Your <strong>${docLabel.replace(/_/g, ' ')}</strong> has been <strong>${status}</strong>.</p>
          ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
          ${!isApproved ? `<p>Please upload a new document to continue the verification process.</p>` : ''}
          ${generateButton('Go to My Dashboard', `${BASE_URL}/dashboard/pro`, isApproved ? 'success' : 'warning')}
        `)
        await sendResendEmail({ to: contact.email, subject, html: bodyHtml })
        await createNotification(
          contact.user_id,
          'document_verification',
          isApproved ? 'Document Verified' : `Document ${status}`,
          isApproved
            ? `Your ${docLabel.replace(/_/g, ' ')} has been verified.`
            : `Your ${docLabel.replace(/_/g, ' ')} was ${status}. ${notes ?? ''}`,
          '/dashboard/pro'
        )
      }
    } catch (notifErr) {
      logger.error('Failed to notify pro of document verification', { function: 'verifyDocument' }, notifErr)
    }
  }

  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard/pro')
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
        Your business <strong>"${businessName}"</strong> has been approved on Boss of Clean.
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

      ${generateButton('Go to Your Dashboard', `${BASE_URL}/dashboard/pro`, 'success')}
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

      ${generateButton('Update Your Application', `${BASE_URL}/dashboard/pro/onboarding`, 'warning')}

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
