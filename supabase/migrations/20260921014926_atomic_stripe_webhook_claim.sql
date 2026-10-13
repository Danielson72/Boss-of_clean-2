-- PROPOSAL ONLY. Supersedes PR 154's unfenced lease. Never run automatically.
-- No ACL/RLS changes. New SECURITY INVOKER RPCs require existing service_role
-- EXECUTE/table privileges; verify separately before an authorized rollout.
ALTER TABLE public.stripe_webhook_events ADD COLUMN IF NOT EXISTS claim_token uuid;

CREATE OR REPLACE FUNCTION public.claim_stripe_webhook_event(
    p_claim_token uuid,
    p_event_id varchar,
    p_event_type varchar,
    p_payload jsonb DEFAULT NULL,
    p_customer_id text DEFAULT NULL,
    p_subscription_id text DEFAULT NULL,
    p_invoice_id text DEFAULT NULL
)
RETURNS TABLE(is_new boolean, event_status varchar, claim_token uuid)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
    v_status varchar;
BEGIN
    IF current_user <> 'service_role' OR p_claim_token IS NULL THEN
        RAISE EXCEPTION 'Service-role claim required';
    END IF;
    INSERT INTO public.stripe_webhook_events
        (event_id, event_type, status, payload, customer_id, subscription_id,
         invoice_id, updated_at, claim_token)
    VALUES (p_event_id, p_event_type, 'processing', p_payload, p_customer_id,
            p_subscription_id, p_invoice_id, now(), p_claim_token)
    ON CONFLICT (event_id) DO NOTHING RETURNING status INTO v_status;
    IF v_status IS NOT NULL THEN
        RETURN QUERY SELECT true, v_status, p_claim_token;
        RETURN;
    END IF;
    UPDATE public.stripe_webhook_events AS swe
    SET status = 'processing', error_message = NULL,
        retry_count = coalesce(swe.retry_count, 0) + 1,
        last_retry_at = now(), updated_at = now(), claim_token = p_claim_token
    WHERE swe.event_id = p_event_id AND
        (swe.status IN ('failed', 'pending') OR
         (swe.status = 'processing' AND swe.updated_at < now() - interval '5 minutes'
          -- Only automatically reclaim handlers whose money writes are fenced.
          -- Other handlers still perform separate requests and need transaction
          -- conversion before it is safe for two generations to overlap.
          AND (swe.event_type IN ('invoice.paid', 'invoice.payment_succeeded',
                   'customer.subscription.created', 'customer.subscription.updated',
                   'customer.subscription.deleted')
               OR (swe.event_type = 'checkout.session.completed'
                   AND swe.payload #>> '{data,object,mode}' = 'payment'
                   AND swe.payload #>> '{data,object,metadata,type}' = 'lead_unlock'))))
    RETURNING swe.status INTO v_status;
    IF v_status IS NOT NULL THEN
        RETURN QUERY SELECT true, v_status, p_claim_token;
        RETURN;
    END IF;
    SELECT swe.status INTO v_status FROM public.stripe_webhook_events swe
    WHERE swe.event_id = p_event_id;
    IF v_status IS NULL THEN RAISE EXCEPTION 'Claim missing'; END IF;
    RETURN QUERY SELECT false, v_status, NULL::uuid;
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_stripe_webhook_event(
    p_event_id varchar, p_claim_token uuid, p_error_message text DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
    IF current_user <> 'service_role' THEN RAISE EXCEPTION 'Service role required'; END IF;
    UPDATE public.stripe_webhook_events
    SET status = CASE WHEN p_error_message IS NULL THEN 'processed' ELSE 'failed' END,
        processed_at = CASE WHEN p_error_message IS NULL THEN now() ELSE NULL END,
        error_message = left(p_error_message, 4000), updated_at = now()
    WHERE event_id = p_event_id AND status = 'processing' AND claim_token = p_claim_token;
    IF NOT FOUND THEN RAISE EXCEPTION 'Webhook claim lost'; END IF;
END;
$$;

-- Different event IDs for the same paid invoice must share a durable identity.
-- Index creation deliberately fails if old duplicates exist: reconcile first.
CREATE UNIQUE INDEX IF NOT EXISTS payments_succeeded_invoice_unique
ON public.payments ((metadata->>'invoice_id'))
WHERE status = 'succeeded' AND metadata->>'invoice_id' IS NOT NULL;

CREATE OR REPLACE FUNCTION public.fulfill_stripe_paid_invoice(
    p_event_id varchar, p_claim_token uuid, p_subscription_id text,
    p_invoice_id text, p_payment_intent_id text, p_amount_paid bigint, p_currency text
)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
    v_cleaner_id uuid;
    v_payment_id uuid;
BEGIN
    IF current_user <> 'service_role' THEN RAISE EXCEPTION 'Service role required'; END IF;
    -- Lock the ledger before inspecting token. Reclaim waits for fulfillment;
    -- a worker whose claim was already reclaimed cannot start fulfillment.
    PERFORM 1 FROM public.stripe_webhook_events
    WHERE event_id = p_event_id AND status = 'processing' AND claim_token = p_claim_token
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Webhook claim lost'; END IF;
    IF p_invoice_id IS NULL OR p_invoice_id = '' OR p_amount_paid IS NULL OR p_amount_paid < 0 THEN
        RAISE EXCEPTION 'Invalid paid invoice';
    END IF;
    SELECT cleaner_id INTO v_cleaner_id FROM public.subscriptions
    WHERE stripe_subscription_id = p_subscription_id;
    IF v_cleaner_id IS NULL THEN RAISE EXCEPTION 'Subscription not available yet'; END IF;
    -- Serialize invoices for a pro. All payment/counter/dunning writes below
    -- roll back together if any statement fails (including missing pro).
    PERFORM 1 FROM public.pros WHERE id = v_cleaner_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Pro missing'; END IF;
    PERFORM 1 FROM public.subscriptions
    WHERE stripe_subscription_id = p_subscription_id AND cleaner_id = v_cleaner_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Subscription changed during fulfillment'; END IF;
    INSERT INTO public.payments
        (cleaner_id, stripe_payment_intent_id, amount, currency, status,
         description, metadata, paid_at)
    VALUES (v_cleaner_id, p_payment_intent_id, p_amount_paid / 100.0,
            p_currency, 'succeeded', 'Monthly subscription payment',
            jsonb_build_object('invoice_id', p_invoice_id), now())
    ON CONFLICT ((metadata->>'invoice_id'))
        WHERE status = 'succeeded' AND metadata->>'invoice_id' IS NOT NULL
    DO NOTHING RETURNING id INTO v_payment_id;
    IF v_payment_id IS NULL THEN
        -- Existing rows from the old nontransactional handler may lack effects.
        -- Do not guess and reset this month's counters again; reconciliation
        -- is a separate, explicit pre-rollout requirement.
        PERFORM 1 FROM public.payments
        WHERE metadata->>'invoice_id' = p_invoice_id AND status = 'succeeded'
            AND cleaner_id = v_cleaner_id AND amount = p_amount_paid / 100.0
            AND currency = p_currency;
        IF NOT FOUND THEN RAISE EXCEPTION 'Existing invoice payment does not match'; END IF;
        RETURN false;
    END IF;
    UPDATE public.pros SET last_payment_date = now(), payment_failed_count = 0,
        monthly_accepted_lead_count = 0, grace_period_end = NULL
    WHERE id = v_cleaner_id;
    UPDATE public.subscriptions SET status = 'active'
    WHERE cleaner_id = v_cleaner_id AND status = 'past_due';
    RETURN true;
END;
$$;

-- Reuse the existing protected notification log as an outbox, adding only
-- dispatch context/token columns. No new table or access policy.
ALTER TABLE public.notification_logs
    ADD COLUMN IF NOT EXISTS dispatch_context jsonb,
    ADD COLUMN IF NOT EXISTS dispatch_claim_token uuid;
CREATE UNIQUE INDEX IF NOT EXISTS notification_logs_paid_lead_handoff_unique
ON public.notification_logs (dedupe_hash) WHERE event_type = 'paid_lead_handoff';

CREATE OR REPLACE FUNCTION public.fulfill_stripe_lead_unlock(
    p_event_id varchar, p_claim_token uuid, p_session_id text,
    p_quote_request_id uuid, p_cleaner_id uuid, p_lead_acceptance_id uuid,
    p_payment_intent_id text, p_amount_cents bigint, p_lead_city text, p_service_type text
)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
    v_acceptance public.lead_acceptances%ROWTYPE;
    v_payment_id uuid;
    v_metadata jsonb;
BEGIN
    IF current_user <> 'service_role' THEN RAISE EXCEPTION 'Service role required'; END IF;
    PERFORM 1 FROM public.stripe_webhook_events
    WHERE event_id = p_event_id AND status = 'processing' AND claim_token = p_claim_token
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Webhook claim lost'; END IF;
    SELECT * INTO v_acceptance FROM public.lead_acceptances
    WHERE stripe_checkout_session_id = p_session_id
        AND quote_request_id = p_quote_request_id AND cleaner_id = p_cleaner_id
        AND (p_lead_acceptance_id IS NULL OR id = p_lead_acceptance_id)
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Lead capture matched no acceptance'; END IF;
    IF v_acceptance.status NOT IN ('pending', 'authorized', 'captured')
        OR p_amount_cents IS NULL OR p_amount_cents <= 0
        OR v_acceptance.amount_cents IS DISTINCT FROM p_amount_cents
        OR p_payment_intent_id IS NULL OR p_payment_intent_id = ''
        OR (v_acceptance.stripe_payment_intent_id IS NOT NULL AND
            v_acceptance.stripe_payment_intent_id <> p_payment_intent_id) THEN
        RAISE EXCEPTION 'Lead capture state or amount mismatch';
    END IF;
    v_metadata := jsonb_build_object('type', 'lead_unlock',
        'quote_request_id', p_quote_request_id::text, 'lead_city', p_lead_city,
        'service_type', p_service_type);
    IF p_lead_acceptance_id IS NOT NULL THEN
        v_metadata := v_metadata || jsonb_build_object('lead_acceptance_id', p_lead_acceptance_id::text);
    END IF;
    INSERT INTO public.payments
        (cleaner_id, amount, currency, status, description,
         stripe_payment_intent_id, paid_at, metadata)
    VALUES (p_cleaner_id, p_amount_cents / 100.0, 'usd', 'succeeded',
        'Lead unlock', p_payment_intent_id, now(), v_metadata)
    ON CONFLICT (stripe_payment_intent_id) DO NOTHING RETURNING id INTO v_payment_id;
    IF v_payment_id IS NULL THEN
        PERFORM 1 FROM public.payments
        WHERE stripe_payment_intent_id = p_payment_intent_id AND cleaner_id = p_cleaner_id
            AND status = 'succeeded' AND amount = p_amount_cents / 100.0
            AND currency = 'usd' AND metadata->>'type' = 'lead_unlock'
            AND metadata->>'quote_request_id' = p_quote_request_id::text;
        IF NOT FOUND THEN RAISE EXCEPTION 'Existing lead payment does not match'; END IF;
    END IF;
    IF v_acceptance.status <> 'captured' THEN
        UPDATE public.lead_acceptances SET status = 'captured', unlocked_at = now(),
            captured_at = now(), stripe_payment_intent_id = p_payment_intent_id
        WHERE id = v_acceptance.id;
    END IF;
    INSERT INTO public.notification_logs
        (event_id, event_type, quote_request_id, recipient_id, recipient_role,
         recipient_channel, recipient_address, dedupe_hash, bucket_window_iso,
         provider, delivery_state, dispatch_context)
    VALUES (gen_random_uuid(), 'paid_lead_handoff', p_quote_request_id,
        coalesce((SELECT user_id FROM public.pros WHERE id = p_cleaner_id), p_cleaner_id),
        'cleaner', 'email', '', 'boc:lead-handoff:' || p_payment_intent_id,
        now(), 'resend', 'queued',
        jsonb_build_object('cleaner_id', p_cleaner_id, 'lead_acceptance_id', v_acceptance.id))
    ON CONFLICT (dedupe_hash) WHERE event_type = 'paid_lead_handoff' DO NOTHING;
    RETURN v_payment_id IS NOT NULL;
END;
$$;

ALTER TABLE public.subscriptions
    ADD COLUMN IF NOT EXISTS stripe_created bigint NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_stripe_event_created bigint NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_stripe_event_type text;
ALTER TABLE public.pros
    ADD COLUMN IF NOT EXISTS stripe_subscription_created bigint NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS stripe_subscription_owner_id text;

-- The existing protected ledger also stores an internal per-subscription
-- reservation. No new table/ACL. A later fetch reservation supersedes earlier
-- fetches; application conditionally checks this token under the same row lock.
CREATE OR REPLACE FUNCTION public.begin_stripe_subscription_sync(
    p_event_id varchar, p_claim_token uuid, p_subscription_id text, p_snapshot_token uuid
)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
    IF current_user <> 'service_role' OR p_snapshot_token IS NULL THEN RAISE EXCEPTION 'Service role required'; END IF;
    PERFORM 1 FROM public.stripe_webhook_events
    WHERE event_id = p_event_id AND status = 'processing' AND claim_token = p_claim_token
        AND event_type IN ('customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted')
        AND payload #>> '{data,object,id}' = p_subscription_id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Webhook claim lost'; END IF;
    INSERT INTO public.stripe_webhook_events (event_id, event_type, status, claim_token, updated_at)
    VALUES ('boc:subscription-sync:' || p_subscription_id, 'boc.subscription_sync', 'processing', p_snapshot_token, now())
    ON CONFLICT (event_id) DO UPDATE SET claim_token = EXCLUDED.claim_token, updated_at = now();
    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_stripe_subscription(
    p_event_id varchar, p_claim_token uuid, p_snapshot_token uuid, p_subscription jsonb
)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
    v_event_type text;
    v_event_created bigint;
    v_snapshot public.subscriptions%ROWTYPE;
    v_existing public.subscriptions%ROWTYPE;
    v_new boolean;
    v_pro_created bigint;
    v_subscription_created bigint;
    v_pro_subscription text;
BEGIN
    IF current_user <> 'service_role' THEN RAISE EXCEPTION 'Service role required'; END IF;
    SELECT event_type, (payload->>'created')::bigint
    INTO v_event_type, v_event_created
    FROM public.stripe_webhook_events
    WHERE event_id = p_event_id AND status = 'processing' AND claim_token = p_claim_token
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Webhook claim lost'; END IF;
    IF v_event_type NOT IN ('customer.subscription.created', 'customer.subscription.updated',
                           'customer.subscription.deleted') OR v_event_created IS NULL THEN
        RAISE EXCEPTION 'Invalid subscription event';
    END IF;
    v_snapshot := jsonb_populate_record(NULL::public.subscriptions, p_subscription);
    IF v_snapshot.cleaner_id IS NULL OR v_snapshot.stripe_subscription_id IS NULL
        OR v_snapshot.tier IS NULL OR v_snapshot.status IS NULL THEN
        RAISE EXCEPTION 'Invalid subscription snapshot';
    END IF;
    PERFORM 1 FROM public.stripe_webhook_events
    WHERE event_id = 'boc:subscription-sync:' || v_snapshot.stripe_subscription_id
        AND claim_token = p_snapshot_token FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Subscription snapshot superseded'; END IF;
    v_subscription_created := v_snapshot.stripe_created;
    IF v_subscription_created IS NULL OR v_subscription_created <= 0 THEN
        RAISE EXCEPTION 'Subscription creation generation missing';
    END IF;
    -- Pro lock serializes creation of a missing subscription and ownership
    -- switches, so simultaneous created/update deliveries cannot race INSERT.
    SELECT stripe_subscription_created, coalesce(stripe_subscription_owner_id, stripe_subscription_id)
    INTO v_pro_created, v_pro_subscription
    FROM public.pros WHERE id = v_snapshot.cleaner_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Pro missing'; END IF;
    IF v_pro_subscription IS NOT NULL AND v_pro_subscription <> v_snapshot.stripe_subscription_id
        AND v_pro_created = 0 THEN
        SELECT stripe_created INTO v_pro_created FROM public.subscriptions
        WHERE stripe_subscription_id = v_pro_subscription;
        IF coalesce(v_pro_created, 0) = 0 THEN
            RAISE EXCEPTION 'Current subscription generation unknown; reconcile ownership first';
        END IF;
    END IF;
    SELECT * INTO v_existing FROM public.subscriptions
    WHERE stripe_subscription_id = v_snapshot.stripe_subscription_id FOR UPDATE;
    v_new := NOT FOUND;
    IF NOT v_new THEN
        IF v_existing.cleaner_id <> v_snapshot.cleaner_id THEN
            RAISE EXCEPTION 'Subscription ownership mismatch';
        END IF;
        IF v_existing.stripe_created > 0 AND v_existing.stripe_created <> v_subscription_created THEN
            RAISE EXCEPTION 'Immutable subscription creation generation mismatch';
        END IF;
        -- A canceled subscription ID is terminal; a delayed create/update
        -- cannot resurrect it. Duplicate created delivery preserves existing
        -- state and repairs only the pro linkage after a legacy partial insert.
        IF v_existing.status = 'canceled' AND v_event_type <> 'customer.subscription.deleted' THEN
            RETURN false;
        END IF;
        IF v_event_created < v_existing.last_stripe_event_created THEN RETURN false; END IF;
        IF v_event_type = 'customer.subscription.created' THEN
            v_snapshot := v_existing;
            v_snapshot.stripe_created := v_subscription_created;
        END IF;
    END IF;
    IF v_event_type = 'customer.subscription.deleted' THEN v_snapshot.status := 'canceled'; END IF;
    INSERT INTO public.subscriptions
        (cleaner_id, stripe_subscription_id, stripe_customer_id, tier, status,
         current_period_start, current_period_end, cancel_at, monthly_price, features,
         stripe_created, last_stripe_event_created, last_stripe_event_type)
    VALUES (v_snapshot.cleaner_id, v_snapshot.stripe_subscription_id,
            v_snapshot.stripe_customer_id, v_snapshot.tier, v_snapshot.status,
            v_snapshot.current_period_start, v_snapshot.current_period_end,
            v_snapshot.cancel_at, v_snapshot.monthly_price, v_snapshot.features,
            v_subscription_created, greatest(v_event_created, coalesce(v_existing.last_stripe_event_created, 0)), v_event_type)
    ON CONFLICT (stripe_subscription_id) DO UPDATE SET
        status = EXCLUDED.status, tier = EXCLUDED.tier,
        current_period_start = EXCLUDED.current_period_start,
        current_period_end = EXCLUDED.current_period_end, cancel_at = EXCLUDED.cancel_at,
        monthly_price = EXCLUDED.monthly_price, features = EXCLUDED.features,
        stripe_created = EXCLUDED.stripe_created,
        last_stripe_event_created = EXCLUDED.last_stripe_event_created,
        last_stripe_event_type = EXCLUDED.last_stripe_event_type;
    -- The last owning ID survives cancellation even though the active linkage
    -- becomes NULL; equal-generation ambiguity must still be detected then.
    -- Event clocks only order one subscription ID. Ownership across IDs uses
    -- Stripe's immutable subscription.created, so an old subscription's later
    -- update cannot veto a valid replacement's earlier creation delivery.
    IF v_subscription_created < v_pro_created THEN RETURN true; END IF;
    IF v_subscription_created = v_pro_created
        AND (v_pro_subscription IS NULL OR v_pro_subscription <> v_snapshot.stripe_subscription_id) THEN
        RAISE EXCEPTION 'Ambiguous equal-second subscription generations; reconcile ownership';
    END IF;
    IF v_snapshot.status = 'canceled' THEN
        UPDATE public.pros SET subscription_tier = 'free', subscription_expires_at = NULL,
            stripe_subscription_id = NULL, next_billing_date = NULL,
            stripe_subscription_created = v_subscription_created,
            stripe_subscription_owner_id = v_snapshot.stripe_subscription_id
        WHERE id = v_snapshot.cleaner_id;
    ELSE
        UPDATE public.pros SET subscription_tier = v_snapshot.tier,
            subscription_expires_at = v_snapshot.current_period_end,
            stripe_subscription_id = v_snapshot.stripe_subscription_id,
            next_billing_date = v_snapshot.current_period_end,
            payment_failed_count = CASE WHEN v_new AND v_event_type = 'customer.subscription.created'
                                        THEN 0 ELSE payment_failed_count END,
            stripe_subscription_created = v_subscription_created,
            stripe_subscription_owner_id = v_snapshot.stripe_subscription_id
        WHERE id = v_snapshot.cleaner_id;
    END IF;
    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_paid_lead_handoff(p_dedupe_hash text, p_claim_token uuid)
RETURNS SETOF public.notification_logs
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
    IF current_user <> 'service_role' OR p_claim_token IS NULL THEN RAISE EXCEPTION 'Service role required'; END IF;
    RETURN QUERY UPDATE public.notification_logs
    SET delivery_state = 'dispatched', dispatch_claim_token = p_claim_token,
        last_retry_at = now(), retry_count = retry_count + 1
    WHERE event_type = 'paid_lead_handoff' AND dedupe_hash = p_dedupe_hash
        AND ((delivery_state IN ('queued', 'failed') AND (next_retry_at IS NULL OR next_retry_at <= now()))
             OR (delivery_state = 'dispatched' AND last_retry_at < now() - interval '5 minutes'))
    RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_paid_lead_handoff(p_id uuid, p_claim_token uuid, p_success boolean)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
    IF current_user <> 'service_role' THEN RAISE EXCEPTION 'Service role required'; END IF;
    UPDATE public.notification_logs
    SET delivery_state = CASE WHEN p_success THEN 'accepted' ELSE 'failed' END,
        dispatched_at = CASE WHEN p_success THEN now() ELSE dispatched_at END,
        failed_at = CASE WHEN p_success THEN NULL ELSE now() END,
        next_retry_at = CASE WHEN p_success THEN NULL
            ELSE now() + make_interval(secs => least(3600, 60 * power(2, least(retry_count, 6)))::int) END
    WHERE id = p_id AND event_type = 'paid_lead_handoff'
        AND delivery_state = 'dispatched' AND dispatch_claim_token = p_claim_token;
    IF NOT FOUND THEN RAISE EXCEPTION 'Handoff claim lost'; END IF;
END;
$$;
