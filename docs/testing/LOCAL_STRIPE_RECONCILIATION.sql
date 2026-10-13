-- Read-only inspection proposal. Not executed. No payloads or contact data.
SELECT metadata->>'invoice_id' AS invoice_id, count(*) AS succeeded_payment_count
FROM public.payments
WHERE status = 'succeeded' AND metadata->>'invoice_id' IS NOT NULL
GROUP BY metadata->>'invoice_id' HAVING count(*) > 1;

SELECT event_id, event_type, status, updated_at
FROM public.stripe_webhook_events
WHERE event_type = 'customer.subscription.created'
    AND status IN ('processing', 'failed', 'pending')
ORDER BY updated_at;

SELECT s.id AS subscription_id, s.stripe_subscription_id, s.cleaner_id,
    s.status, p.stripe_subscription_id AS pro_subscription_id
FROM public.subscriptions s
LEFT JOIN public.pros p ON p.id = s.cleaner_id
WHERE s.status <> 'canceled'
    AND p.stripe_subscription_id IS DISTINCT FROM s.stripe_subscription_id;
-- A different pro subscription may be a legitimate newer subscription, not a
-- repair target. Validate ownership, event ordering and current Stripe state.
