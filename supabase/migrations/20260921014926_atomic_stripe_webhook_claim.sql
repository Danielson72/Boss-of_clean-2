-- Claim Stripe events atomically. The previous SELECT-then-INSERT function
-- allowed simultaneous deliveries to race on the unique event_id constraint.
-- It also left an event permanently stuck when a worker died after claiming it.
CREATE OR REPLACE FUNCTION public.record_webhook_event(
    p_event_id character varying,
    p_event_type character varying,
    p_payload jsonb DEFAULT NULL,
    p_customer_id text DEFAULT NULL,
    p_subscription_id text DEFAULT NULL,
    p_invoice_id text DEFAULT NULL
)
RETURNS TABLE(is_new boolean, event_status character varying)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_status character varying(20);
BEGIN
    INSERT INTO public.stripe_webhook_events (
        event_id,
        event_type,
        status,
        payload,
        customer_id,
        subscription_id,
        invoice_id,
        updated_at
    ) VALUES (
        p_event_id,
        p_event_type,
        'processing',
        p_payload,
        p_customer_id,
        p_subscription_id,
        p_invoice_id,
        now()
    )
    ON CONFLICT (event_id) DO NOTHING
    RETURNING status INTO v_status;

    IF v_status IS NOT NULL THEN
        RETURN QUERY SELECT true, v_status;
        RETURN;
    END IF;

    -- Failed events are eligible for Stripe's next retry. A processing lease
    -- can also be reclaimed after five minutes if a worker terminated before
    -- it could record success or failure.
    UPDATE public.stripe_webhook_events
    SET
        status = 'processing',
        error_message = NULL,
        retry_count = retry_count + 1,
        last_retry_at = now(),
        updated_at = now()
    WHERE event_id = p_event_id
      AND (
          status = 'failed'
          OR (status = 'processing' AND updated_at < now() - interval '5 minutes')
      )
    RETURNING status INTO v_status;

    IF v_status IS NOT NULL THEN
        RETURN QUERY SELECT true, v_status;
        RETURN;
    END IF;

    SELECT swe.status
    INTO v_status
    FROM public.stripe_webhook_events AS swe
    WHERE swe.event_id = p_event_id;

    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Stripe webhook event % could not be claimed', p_event_id;
    END IF;

    RETURN QUERY SELECT false, v_status;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_webhook_processed(p_event_id character varying)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.stripe_webhook_events
    SET
        status = 'processed',
        processed_at = now(),
        error_message = NULL,
        updated_at = now()
    WHERE event_id = p_event_id
      AND status = 'processing';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Processing Stripe webhook event % was not found', p_event_id;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_webhook_failed(
    p_event_id character varying,
    p_error_message text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.stripe_webhook_events
    SET
        status = 'failed',
        error_message = left(p_error_message, 4000),
        last_retry_at = now(),
        updated_at = now()
    WHERE event_id = p_event_id
      AND status = 'processing';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Processing Stripe webhook event % was not found', p_event_id;
    END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_webhook_event(character varying, character varying, jsonb, text, text, text)
FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_webhook_processed(character varying)
FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_webhook_failed(character varying, text)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.record_webhook_event(character varying, character varying, jsonb, text, text, text)
TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_webhook_processed(character varying)
TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_webhook_failed(character varying, text)
TO service_role;
