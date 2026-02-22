-- Migration: tighten_booking_transactions_rls
-- Date: 2026-02-22
-- Fixes: CRITICAL — "Allow authenticated read access" policy let any logged-in user
-- read ALL booking transactions (addresses, payments, special instructions).
-- Replaces with properly scoped customer/cleaner/admin policies.

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.booking_transactions;

-- Customers can only read their own bookings
CREATE POLICY "Customers can view own bookings"
  ON public.booking_transactions
  FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

-- Cleaners can only read bookings assigned to them
CREATE POLICY "Cleaners can view assigned bookings"
  ON public.booking_transactions
  FOR SELECT
  TO authenticated
  USING (
    cleaner_id IN (
      SELECT c.id FROM public.cleaners c WHERE c.user_id = auth.uid()
    )
  );

-- Admins can view all bookings
CREATE POLICY "Admins can view all bookings"
  ON public.booking_transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'::user_role
    )
  );
