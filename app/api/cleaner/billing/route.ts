import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe/config';
import { getCustomerInvoices, InvoiceData } from '@/lib/stripe/invoices';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ file: 'api/cleaner/billing/route' });

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get cleaner profile with subscription info
    const { data: cleaner, error: cleanerError } = await supabase
      .from('cleaners')
      .select(`
        id,
        subscription_tier,
        subscription_expires_at,
        stripe_customer_id,
        stripe_subscription_id
      `)
      .eq('user_id', user.id)
      .single();

    if (cleanerError || !cleaner) {
      return NextResponse.json(
        { error: 'Cleaner profile not found' },
        { status: 404 }
      );
    }

    // Get subscription details from database
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('cleaner_id', cleaner.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Get Stripe subscription details if active
    let stripeSubscription = null;
    let paymentMethod = null;

    if (cleaner.stripe_subscription_id) {
      try {
        const stripe = getStripe();
        stripeSubscription = await stripe.subscriptions.retrieve(
          cleaner.stripe_subscription_id,
          { expand: ['default_payment_method'] }
        );

        // Extract payment method details
        if (stripeSubscription.default_payment_method &&
            typeof stripeSubscription.default_payment_method !== 'string') {
          const pm = stripeSubscription.default_payment_method;
          if (pm.card) {
            paymentMethod = {
              id: pm.id,
              brand: pm.card.brand,
              last4: pm.card.last4,
              expMonth: pm.card.exp_month,
              expYear: pm.card.exp_year,
              isDefault: true,
            };
          }
        }
      } catch (stripeError) {
        logger.error('Error fetching Stripe subscription', { function: 'GET' }, stripeError);
      }
    }

    // Get billing history (invoices) from Stripe
    let stripeInvoices: InvoiceData[] = [];
    if (cleaner.stripe_customer_id) {
      try {
        const { invoices: fetchedInvoices } = await getCustomerInvoices(
          cleaner.stripe_customer_id,
          { limit: 10 }
        );
        stripeInvoices = fetchedInvoices;
      } catch (invoiceError) {
        logger.error('Error fetching Stripe invoices', { function: 'GET' }, invoiceError);
      }
    }

    // Calculate lead credits usage (mock data for now - you can implement actual tracking)
    // In a real implementation, you'd query a lead_contacts or similar table
    const { count: leadContactsCount } = await supabase
      .from('quote_requests')
      .select('*', { count: 'exact', head: true })
      .eq('cleaner_id', cleaner.id)
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

    const usedCredits = leadContactsCount || 0;

    // Determine lead credits based on plan (matches PRD: Free=0 pay-per-lead, Basic=20, Pro=unlimited)
    const planCredits: Record<string, number> = {
      free: 0,     // Pay-per-lead
      basic: 20,   // 20 credits/month
      pro: -1,     // Unlimited
    };

    const totalCredits = planCredits[cleaner.subscription_tier] ?? 0;
    const isUnlimited = totalCredits === -1;

    // Calculate reset date (first of next month)
    const now = new Date();
    const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Get recent usage for sparkline (last 7 days)
    const recentUsage: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const { count } = await supabase
        .from('quote_requests')
        .select('*', { count: 'exact', head: true })
        .eq('cleaner_id', cleaner.id)
        .gte('created_at', dayStart.toISOString())
        .lt('created_at', dayEnd.toISOString());

      recentUsage.push(count || 0);
    }

    // Map tier names for display
    const tierDisplayNames: Record<string, string> = {
      free: 'Free',
      basic: 'Basic',
      pro: 'Professional',
      enterprise: 'Enterprise',
    };

    const tierPrices: Record<string, number> = {
      free: 0,
      basic: 79,
      pro: 199,
    };

    // Determine subscription status
    let status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'none' = 'none';
    if (stripeSubscription) {
      if (stripeSubscription.status === 'active') {
        status = stripeSubscription.cancel_at ? 'canceled' : 'active';
      } else if (stripeSubscription.status === 'past_due') {
        status = 'past_due';
      } else if (stripeSubscription.status === 'trialing') {
        status = 'trialing';
      }
    } else if (cleaner.subscription_tier !== 'free') {
      status = subscription?.status === 'active' ? 'active' : 'none';
    }

    // Format invoices from Stripe
    const invoices = stripeInvoices.map((invoice: InvoiceData) => ({
      id: invoice.id,
      date: invoice.date,
      description: invoice.description || 'Subscription payment',
      amount: invoice.amount,
      status: invoice.status,
      invoiceUrl: invoice.invoiceUrl,
      invoicePdf: invoice.invoicePdf,
    }));

    const stripeSub = stripeSubscription as { current_period_end?: number; cancel_at?: number | null } | null;
    return NextResponse.json({
      subscription: {
        planName: tierDisplayNames[cleaner.subscription_tier] || 'Free',
        planTier: cleaner.subscription_tier,
        price: tierPrices[cleaner.subscription_tier] || 0,
        status,
        nextBillingDate: stripeSub?.current_period_end
          ? new Date(stripeSub.current_period_end * 1000).toISOString()
          : cleaner.subscription_expires_at,
        cancelAt: stripeSub?.cancel_at
          ? new Date(stripeSub.cancel_at * 1000).toISOString()
          : null,
      },
      leadCredits: {
        used: usedCredits,
        total: isUnlimited ? 0 : totalCredits,
        isUnlimited,
        resetDate: resetDate.toISOString(),
        recentUsage,
      },
      paymentMethod,
      invoices,
    });
  } catch (error) {
    logger.error('Billing API error', { function: 'GET' }, error);
    return NextResponse.json(
      { error: 'Failed to fetch billing information' },
      { status: 500 }
    );
  }
}
