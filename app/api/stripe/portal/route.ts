import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe, getSiteUrl } from '@/lib/stripe/config'

export async function POST(request: NextRequest) {
  try {
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

    // Find the customer in Stripe by email
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    })

    if (customers.data.length === 0) {
      return NextResponse.json(
        { error: 'No billing account found' },
        { status: 404 }
      )
    }

    const customer = customers.data[0]
    const siteUrl = getSiteUrl()

    // Create billing portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${siteUrl}/dashboard/cleaner`,
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