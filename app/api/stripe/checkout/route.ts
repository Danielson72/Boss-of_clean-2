import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe, STRIPE_PRICES, getSiteUrl } from '@/lib/stripe/config'

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

    const stripe = getStripe()
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get plan from URL params
    const { searchParams } = new URL(request.url)
    const plan = searchParams.get('plan') as 'basic' | 'pro' | 'enterprise' | null
    
    if (!plan || !['basic', 'pro', 'enterprise'].includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan specified' },
        { status: 400 }
      )
    }

    // Get user's cleaner profile
    const { data: cleaner } = await supabase
      .from('cleaners')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!cleaner) {
      return NextResponse.json(
        { error: 'Cleaner profile required' },
        { status: 400 }
      )
    }

    const siteUrl = getSiteUrl()
    const priceId = STRIPE_PRICES[plan]

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${siteUrl}/dashboard/cleaner?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/pricing`,
      customer_email: user.email,
      metadata: {
        user_id: user.id,
        cleaner_id: cleaner.id,
        plan: plan,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          cleaner_id: cleaner.id,
          plan: plan,
        },
      },
    })

    return NextResponse.json({ sessionId: session.id })

  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}