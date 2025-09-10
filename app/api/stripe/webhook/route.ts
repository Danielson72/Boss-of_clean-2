import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe, verifyWebhookSignature } from '@/lib/stripe/config'
import { headers } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')
    
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing Stripe signature' },
        { status: 400 }
      )
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured')
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      )
    }

    // Verify webhook signature
    let event
    try {
      event = verifyWebhookSignature(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any
        
        // Get metadata from the session
        const userId = session.metadata?.user_id
        const cleanerId = session.metadata?.cleaner_id
        const plan = session.metadata?.plan
        
        if (!userId || !cleanerId || !plan) {
          console.error('Missing metadata in checkout session:', { userId, cleanerId, plan })
          return NextResponse.json(
            { error: 'Missing required metadata' },
            { status: 400 }
          )
        }

        // Update cleaner subscription tier
        const { error } = await supabase
          .from('cleaners')
          .update({ subscription_tier: plan })
          .eq('id', cleanerId)
          .eq('user_id', userId)

        if (error) {
          console.error('Failed to update subscription tier:', error)
          return NextResponse.json(
            { error: 'Failed to update subscription' },
            { status: 500 }
          )
        }

        console.log(`Successfully updated subscription tier for cleaner ${cleanerId} to ${plan}`)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any
        
        // Get metadata from subscription
        const userId = subscription.metadata?.user_id
        const cleanerId = subscription.metadata?.cleaner_id
        const plan = subscription.metadata?.plan
        
        if (!userId || !cleanerId) {
          console.error('Missing metadata in subscription update:', { userId, cleanerId, plan })
          return NextResponse.json({ error: 'Missing required metadata' }, { status: 400 })
        }

        // Determine subscription tier based on subscription status
        let subscriptionTier = 'free'
        if (subscription.status === 'active' || subscription.status === 'trialing') {
          subscriptionTier = plan || 'pro'
        }

        // Update cleaner subscription tier
        const { error } = await supabase
          .from('cleaners')
          .update({ subscription_tier: subscriptionTier })
          .eq('id', cleanerId)
          .eq('user_id', userId)

        if (error) {
          console.error('Failed to update subscription tier:', error)
          return NextResponse.json(
            { error: 'Failed to update subscription' },
            { status: 500 }
          )
        }

        console.log(`Successfully updated subscription tier for cleaner ${cleanerId} to ${subscriptionTier}`)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any
        
        // Get metadata from subscription
        const userId = subscription.metadata?.user_id
        const cleanerId = subscription.metadata?.cleaner_id
        
        if (!userId || !cleanerId) {
          console.error('Missing metadata in subscription deletion:', { userId, cleanerId })
          return NextResponse.json({ error: 'Missing required metadata' }, { status: 400 })
        }

        // Set subscription tier back to free
        const { error } = await supabase
          .from('cleaners')
          .update({ subscription_tier: 'free' })
          .eq('id', cleanerId)
          .eq('user_id', userId)

        if (error) {
          console.error('Failed to update subscription tier to free:', error)
          return NextResponse.json(
            { error: 'Failed to update subscription' },
            { status: 500 }
          )
        }

        console.log(`Successfully downgraded subscription tier for cleaner ${cleanerId} to free`)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}