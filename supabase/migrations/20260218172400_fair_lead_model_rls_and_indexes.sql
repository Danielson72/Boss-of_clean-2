-- ============================================================
-- Fair Lead Model — RLS Policies & Performance Indexes
-- Applied: 2026-02-18 via Supabase MCP
-- ============================================================

-- Enable RLS on all 6 tables
ALTER TABLE public.lead_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pro_spending_caps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hire_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_refund_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pro_lead_credits ENABLE ROW LEVEL SECURITY;

-- lead_unlocks RLS
CREATE POLICY "Pros can view own unlocks" ON public.lead_unlocks FOR SELECT TO authenticated
USING (cleaner_id IN (SELECT id FROM public.cleaners WHERE user_id = auth.uid()));

CREATE POLICY "Pros can create unlocks" ON public.lead_unlocks FOR INSERT TO authenticated
WITH CHECK (cleaner_id IN (SELECT id FROM public.cleaners WHERE user_id = auth.uid()));

CREATE POLICY "Service role manages unlocks" ON public.lead_unlocks FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Admins can view all unlocks" ON public.lead_unlocks FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- pro_spending_caps RLS
CREATE POLICY "Pros can manage own spending caps" ON public.pro_spending_caps FOR ALL TO authenticated
USING (cleaner_id IN (SELECT id FROM public.cleaners WHERE user_id = auth.uid()))
WITH CHECK (cleaner_id IN (SELECT id FROM public.cleaners WHERE user_id = auth.uid()));

CREATE POLICY "Service role manages spending caps" ON public.pro_spending_caps FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- customer_credits RLS
CREATE POLICY "Customers can view own credits" ON public.customer_credits FOR SELECT TO authenticated
USING (customer_id = auth.uid());

CREATE POLICY "Service role manages credits" ON public.customer_credits FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Admins can view all credits" ON public.customer_credits FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- hire_confirmations RLS
CREATE POLICY "Customers can create hire confirmations" ON public.hire_confirmations FOR INSERT TO authenticated
WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customers can view own confirmations" ON public.hire_confirmations FOR SELECT TO authenticated
USING (customer_id = auth.uid());

CREATE POLICY "Pros can view confirmations for their leads" ON public.hire_confirmations FOR SELECT TO authenticated
USING (cleaner_id IN (SELECT id FROM public.cleaners WHERE user_id = auth.uid()));

CREATE POLICY "Service role manages confirmations" ON public.hire_confirmations FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Admins can view all confirmations" ON public.hire_confirmations FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- lead_refund_requests RLS
CREATE POLICY "Pros can create refund requests" ON public.lead_refund_requests FOR INSERT TO authenticated
WITH CHECK (cleaner_id IN (SELECT id FROM public.cleaners WHERE user_id = auth.uid()));

CREATE POLICY "Pros can view own refund requests" ON public.lead_refund_requests FOR SELECT TO authenticated
USING (cleaner_id IN (SELECT id FROM public.cleaners WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all refund requests" ON public.lead_refund_requests FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Service role manages refunds" ON public.lead_refund_requests FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- pro_lead_credits RLS
CREATE POLICY "Pros can view own lead credits" ON public.pro_lead_credits FOR SELECT TO authenticated
USING (cleaner_id IN (SELECT id FROM public.cleaners WHERE user_id = auth.uid()));

CREATE POLICY "Service role manages lead credits" ON public.pro_lead_credits FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Admins can view all lead credits" ON public.pro_lead_credits FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- Performance Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_lead_unlocks_quote_request ON public.lead_unlocks(quote_request_id);
CREATE INDEX IF NOT EXISTS idx_lead_unlocks_cleaner ON public.lead_unlocks(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_lead_unlocks_status ON public.lead_unlocks(status);
CREATE INDEX IF NOT EXISTS idx_lead_unlocks_cleaner_status ON public.lead_unlocks(cleaner_id, status);

CREATE INDEX IF NOT EXISTS idx_pro_spending_caps_cleaner ON public.pro_spending_caps(cleaner_id);

CREATE INDEX IF NOT EXISTS idx_customer_credits_customer ON public.customer_credits(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_credits_active ON public.customer_credits(customer_id, redeemed, expires_at);

CREATE INDEX IF NOT EXISTS idx_hire_confirmations_quote ON public.hire_confirmations(quote_request_id);
CREATE INDEX IF NOT EXISTS idx_hire_confirmations_customer ON public.hire_confirmations(customer_id);
CREATE INDEX IF NOT EXISTS idx_hire_confirmations_cleaner ON public.hire_confirmations(cleaner_id);

CREATE INDEX IF NOT EXISTS idx_lead_refund_requests_cleaner ON public.lead_refund_requests(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_lead_refund_requests_status ON public.lead_refund_requests(status);
CREATE INDEX IF NOT EXISTS idx_lead_refund_requests_unlock ON public.lead_refund_requests(lead_unlock_id);

CREATE INDEX IF NOT EXISTS idx_pro_lead_credits_cleaner ON public.pro_lead_credits(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_pro_lead_credits_period ON public.pro_lead_credits(cleaner_id, billing_period_start, billing_period_end);

-- Grant anon read for unlock counts (competition indicator)
GRANT SELECT ON public.lead_unlocks TO anon;
