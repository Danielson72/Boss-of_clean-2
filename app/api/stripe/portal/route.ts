import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSiteUrl } from '@/lib/stripe/config'
import { createBillingPortalSession, findCustomerByEmail } from '@/lib/stripe/mcp'

export async function POST(request: NextRequest) {
  try {
    // Check for required env vars at runtime
    const siteUrlEnv = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL
    if (!siteUrlEnv) {
      console.error('SITE_URL or NEXT_PUBLIC_SITE_URL is required')
      return NextResponse.json(
        { error: 'Site configuration missing' },
        { status: 500 }
      )
    }

    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user's cleaner profile to verify they have a subscription
    const { data: cleaner } = await supabase
      .from('cleaners')
      .select('subscription_tier')
      .eq('user_id', user.id)
      .single()

    if (!cleaner) {
      return NextResponse.json(
        { error: 'Cleaner profile required' },
        { status: 400 }
      )
    }

    if (cleaner.subscription_tier === 'free') {
      return NextResponse.json(
        { error: 'No active subscription to manage' },
        { status: 400 }
      )
    }

    // Find the customer in Stripe by email (with MCP integration)
    const customers = await findCustomerByEmail(user.email!)

    if (customers.data.length === 0) {
      return NextResponse.json(
        { error: 'No billing account found' },
        { status: 404 }
      )
    }

    const customer = customers.data[0]
    const siteUrl = getSiteUrl()

    // Create billing portal session (with MCP integration)
    const portalSession = await createBillingPortalSession({
      customerId: customer.id,
      returnUrl: `${siteUrl}/dashboard/cleaner`,
    })

    return NextResponse.json({ url: portalSession.url })

  } catch (error) {
    console.error('Stripe portal error:', error)
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    )
  }
}