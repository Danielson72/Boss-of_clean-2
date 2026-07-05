import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { getStripe, getSiteUrl } from '@/lib/stripe/config';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ file: 'api/leads/[quoteId]/unlock/route' });

// A9 Slice 1 (DLD-517): flat lead-unlock fee across all trades. Per-tier
// pricing is deferred until we have real payment data, so fee_tier is always
// 'standard' this slice and there is no service_type -> tier mapping.
const LEAD_UNLOCK_AMOUNT_CENTS = 3000; // $30
const LEAD_UNLOCK_FEE_TIER = 'standard' as const;

export async function POST(
  _req: NextRequest,
  { params }: { params: { quoteId: string } }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // 1. Resolve pros.id from auth.uid(). lead_acceptances.cleaner_id is pros.id,
  //    NOT auth.uid() — the whole slice hinges on this.
  const { data: pro } = await supabase
    .from('pros')
    .select('id')
    .eq('user_id', user.id)
    .single();
  if (!pro) {
    return NextResponse.json({ error: 'Pro profile required' }, { status: 400 });
  }

  const quoteId = params.quoteId;

  // 2a. Verify the quote is 'accepted' and assigned to THIS pro. Read via the
  //     user client — the pro's RLS on quote_requests already scopes visibility.
  const { data: quote } = await supabase
    .from('quote_requests')
    .select('id, status, cleaner_id')
    .eq('id', quoteId)
    .single();
  if (!quote || quote.cleaner_id !== pro.id) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }
  if (quote.status !== 'accepted') {
    return NextResponse.json(
      { error: `Lead is not unlockable in status "${quote.status}".` },
      { status: 400 }
    );
  }

  // 2a-bis. SERVER-SIDE HIRE GATE (A9 Slice 2 / DLD-517): the $30 prompt fires
  //         only AFTER the customer confirms the hire, not on mere acceptance.
  //         Require a hire_confirmations row for (quote, this pro) before we
  //         create any lead_acceptances row or Stripe session. RLS policy
  //         "Pros can view confirmations for their leads" scopes this read.
  //         hire_confirmations.cleaner_id = pros.id (set from quote.cleaner_id).
  const { data: hire } = await supabase
    .from('hire_confirmations')
    .select('id')
    .eq('quote_request_id', quoteId)
    .eq('cleaner_id', pro.id)
    .maybeSingle();
  if (!hire) {
    return NextResponse.json(
      { error: 'Lead not yet confirmed by customer.' },
      { status: 403 }
    );
  }

  // 2b. Duplicate-unlock guard — return any existing pending/captured row instead
  //     of minting a second (no double-charge, no orphan rows).
  const { data: existing } = await supabase
    .from('lead_acceptances')
    .select('id, status, stripe_checkout_session_id')
    .eq('quote_request_id', quoteId)
    .eq('cleaner_id', pro.id)
    .in('status', ['pending', 'captured'])
    .maybeSingle();

  if (existing?.status === 'captured') {
    return NextResponse.json({ alreadyUnlocked: true, leadAcceptanceId: existing.id });
  }

  const stripe = getStripe();

  if (existing?.status === 'pending' && existing.stripe_checkout_session_id) {
    // NEW-03 (DLD-557): decide by the prior session's actual state.
    //  - open (unexpired)  -> resume it; never mint a second payable session.
    //  - complete          -> the pro already PAID; the webhook capture is in
    //                         flight. Minting a new session here would let the
    //                         same lead be paid twice — reject instead.
    //  - expired           -> fall through; the conditional link below swaps
    //                         the stale id atomically.
    const prior = await stripe.checkout.sessions.retrieve(existing.stripe_checkout_session_id);
    if (prior.status === 'open' && prior.url) {
      return NextResponse.json({ url: prior.url, leadAcceptanceId: existing.id, resumed: true });
    }
    if (prior.status === 'complete') {
      logger.warn('unlock.session_reuse_rejected: prior session already complete, capture in flight', {
        function: 'POST',
        quoteId,
        leadAcceptanceId: existing.id,
        priorSessionId: existing.stripe_checkout_session_id,
      });
      return NextResponse.json(
        { error: 'Payment already completed for this lead; unlock is processing.', leadAcceptanceId: existing.id },
        { status: 409 }
      );
    }
    // expired -> fall through and create a fresh session for the existing row.
  }

  // 3 + 4. Insert the keystone row FIRST (status='pending') using the pro's own
  //        credentials — RLS policy "Pros can create unlocks" permits
  //        cleaner_id IN (pros owned by auth.uid()). Reuse a stale 'pending' row
  //        if we fell through from one above.
  let leadAcceptanceId = existing?.id ?? null;
  if (!leadAcceptanceId) {
    const { data: inserted, error: insErr } = await supabase
      .from('lead_acceptances')
      .insert({
        quote_request_id: quoteId,
        cleaner_id: pro.id, // = pros.id
        amount_cents: LEAD_UNLOCK_AMOUNT_CENTS,
        fee_tier: LEAD_UNLOCK_FEE_TIER,
        status: 'pending',
      })
      .select('id')
      .single();
    if (insErr || !inserted) {
      logger.error('Failed to insert lead_acceptance', { function: 'POST', quoteId }, insErr);
      return NextResponse.json({ error: 'Could not start lead unlock.' }, { status: 500 });
    }
    leadAcceptanceId = inserted.id;
  }

  // 5. Create the immediate-charge Checkout Session with DYNAMIC price_data
  //    (no pre-created Stripe price IDs). metadata carries everything the
  //    existing webhook capture branch reads.
  const siteUrl = getSiteUrl();
  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: LEAD_UNLOCK_AMOUNT_CENTS,
            product_data: { name: 'Boss of Clean — Exclusive Lead Unlock' },
          },
        },
      ],
      success_url: `${siteUrl}/dashboard/pro/leads?unlocked=${quoteId}`,
      cancel_url: `${siteUrl}/dashboard/pro/leads?canceled=${quoteId}`,
      customer_email: user.email ?? undefined,
      metadata: {
        type: 'lead_unlock', // REQUIRED — webhook gate
        quote_request_id: quoteId,
        cleaner_id: pro.id, // = pros.id (webhook trusts this)
        amount_cents: String(LEAD_UNLOCK_AMOUNT_CENTS),
        lead_acceptance_id: leadAcceptanceId,
      },
    });
  } catch (err) {
    logger.error('Stripe session create failed', { function: 'POST', quoteId }, err);
    return NextResponse.json({ error: 'Could not start checkout.' }, { status: 500 });
  }

  // 6. SYNCHRONOUSLY back-write the session id BEFORE returning, so the webhook's
  //    UPDATE-by-session-id always finds the row no matter how fast payment
  //    completes (insert-first + link-before-return closes the race).
  //
  //    Must run on the SERVICE-ROLE client: lead_acceptances has RLS enabled and
  //    the only UPDATE-capable policy is "Service role manages unlocks". The pro
  //    user client has SELECT/INSERT but NO UPDATE policy, so a user-client
  //    UPDATE matches 0 rows with a null error — phantom success that never
  //    writes the session id (pro pays, webhook can't find the row, capture
  //    fails). Ownership + 'accepted' status are already guarded above, so a
  //    service-role UPDATE scoped to this exact row id is correct and safe. We
  //    .select() to get the affected rows and treat 0 rows as a hard failure —
  //    never return a checkout URL for a row we couldn't link.
  //    NEW-03 (DLD-557): the link is a compare-and-swap, not a blind overwrite.
  //    Guards in the WHERE clause:
  //      - status must still be 'pending' (a captured row's session id is
  //        immutable — overwriting it would orphan the paid session), and
  //      - the stored session id must be exactly what we inspected above
  //        (the stale/expired one), or NULL for a fresh row.
  //    A concurrent request that already linked a *different* session makes
  //    this match 0 rows; we then expire our just-created session (so no
  //    dangling payable checkout exists) and reject instead of overwriting.
  const admin = createServiceRoleClient();
  let linkQuery = admin
    .from('lead_acceptances')
    .update({ stripe_checkout_session_id: session.id })
    .eq('id', leadAcceptanceId)
    .eq('status', 'pending');
  if (existing?.stripe_checkout_session_id) {
    linkQuery = linkQuery.eq('stripe_checkout_session_id', existing.stripe_checkout_session_id);
  } else {
    linkQuery = linkQuery.is('stripe_checkout_session_id', null);
  }
  const { data: linked, error: linkErr } = await linkQuery.select('id');
  if (linkErr || !linked || linked.length === 0) {
    logger.error('unlock.session_link_rejected: 0 rows linked (status changed or session already replaced)', {
      function: 'POST',
      quoteId,
      leadAcceptanceId,
      newSessionId: session.id,
      priorSessionId: existing?.stripe_checkout_session_id ?? null,
      rowsAffected: linked?.length ?? 0,
    }, linkErr);
    // Best-effort: kill the unlinked session so the pro can't pay a checkout
    // the webhook will never be able to match.
    try {
      await stripe.checkout.sessions.expire(session.id);
    } catch (expireErr) {
      logger.error('unlock.session_expire_failed for unlinked session', {
        function: 'POST',
        quoteId,
        sessionId: session.id,
      }, expireErr);
    }
    return NextResponse.json(
      { error: 'Another checkout for this lead is already in progress. Refresh and try again.' },
      { status: 409 }
    );
  }

  return NextResponse.json({ url: session.url, leadAcceptanceId });
}
