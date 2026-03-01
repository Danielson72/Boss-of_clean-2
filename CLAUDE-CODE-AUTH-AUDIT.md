# 🔒 AUTH SYSTEM FULL AUDIT & FIX — Claude Code Prompt

## PRIORITY: CRITICAL (Nothing else matters if users can't sign up/log in)

## CONTEXT
Boss of Clean (bossofclean.com) — Next.js 13.5.1 + Supabase (project: jisjxdsrflheosvodoxk) + Netlify.
The authentication system has multiple broken flows that prevent real users from signing up, logging in, and recovering passwords. This must be bulletproof before launch.

---

## BUGS FOUND IN AUDIT (7 issues, ranked by severity)

### BUG 1: VERIFICATION EMAILS NOT ARRIVING (CRITICAL)
**Symptom:** User signed up with `daniel@yourtrustedcleaningexperts.com` as a pro, never received verification email.
**Root Cause:** Supabase Auth sends verification/reset emails through its own built-in SMTP, NOT through our Resend integration. Our Resend setup (`lib/email/resend.ts`) only handles application emails (admin notifications, booking confirmations). Supabase's default email sender has known deliverability issues and likely gets spam-filtered.
**Fix:** Configure Supabase SMTP in the Supabase Dashboard (Authentication → SMTP Settings) to use Resend's SMTP:
- Host: `smtp.resend.com`
- Port: `465`
- Username: `resend`
- Password: (the RESEND_API_KEY)
- Sender: `noreply@bossofclean.com`

**ALSO:** As a belt-and-suspenders approach, add a fallback: after `supabase.auth.signUp()` succeeds, if the user's `email_confirmed_at` is null, send a branded verification email through our own Resend integration with a custom verification link. This ensures delivery even if Supabase SMTP has issues.

### BUG 2: CLEANER PROFILE NOT CREATED ON SIGNUP (CRITICAL)
**Symptom:** `daniel@yourtrustedcleaningexperts.com` has `users.role = 'cleaner'` but NO row in `cleaners` table.
**Root Cause:** The `handle_new_user` DB trigger only creates a `users` row. The `cleaners` row is created client-side in `AuthForm.tsx` (line ~120-135), but this silently fails — likely due to RLS policies blocking the insert before email confirmation.
**Fix Options (implement BOTH):**
1. Extend the `handle_new_user` trigger to also create a `cleaners` row when role='cleaner'
2. Keep the client-side creation as backup, but add proper error handling and logging
3. Add an API route `/api/auth/ensure-cleaner-profile` that creates the profile server-side after email confirmation

### BUG 3: GOOGLE OAUTH LOSES ROLE SELECTION (HIGH)
**Symptom:** User picks "I'm a Service Pro" on `/signup`, then clicks "Sign up with Google" — the role is lost.
**Root Cause:** `GoogleSignInButton.tsx` doesn't pass the `role` to the OAuth flow. The OAuth callback (`auth/callback/route.ts`) doesn't know the user wanted to be a cleaner, so:
- If new user → redirects to `/auth/select-role` (works but duplicates the choice they already made)
- The role from the signup page is never carried through
**Fix:** Pass role as a query param or state through the OAuth flow:
1. In `GoogleSignInButton`, accept `role` prop
2. Pass it via `redirectTo` URL: `/auth/callback?intended_role=cleaner`
3. In `auth/callback/route.ts`, read `intended_role` and use it when creating the user record
4. Skip the `/auth/select-role` redirect if role is already known

### BUG 4: AUTH CONFIRM PAGE HARDCODES CUSTOMER DASHBOARD (MEDIUM)
**File:** `app/auth/confirm/page.tsx` line 133
**Problem:** The "Go to Dashboard" button hardcodes `/dashboard/customer`. Cleaner users get sent to the wrong dashboard.
**Fix:** Use `roleToDashboardPath()` to determine the correct redirect, or just use `/dashboard` and let the middleware handle routing.

### BUG 5: RACE CONDITION — DUAL USER CREATION (MEDIUM)
**Problem:** Both the `handle_new_user` DB trigger AND `AuthForm.tsx` try to create the `public.users` record. AuthForm uses `upsert` with `onConflict: 'id'` which mostly works, but:
- The trigger runs first (server-side, immediate)
- AuthForm runs second (client-side, after signup response)
- If AuthForm's upsert updates the trigger-created row, it might overwrite data
**Fix:** Remove the `users` upsert from AuthForm. Let the trigger handle user creation. AuthForm should only create the `cleaners` profile (which the trigger doesn't do). Add a check: after signup, verify the user record exists and has the correct role.

### BUG 6: FORGOT PASSWORD EMAIL DELIVERY (MEDIUM)
**Symptom:** Password reset uses `supabase.auth.resetPasswordForEmail()` which sends through Supabase's SMTP — same deliverability issue as Bug 1.
**Fix:** Same SMTP configuration fix as Bug 1. Additionally, verify the redirect URL in `forgot-password/page.tsx` works correctly:
```typescript
redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`
```
Test the full flow: request reset → receive email → click link → land on reset page → set new password → redirect to login.

### BUG 7: SESSION CACHING AFTER ROLE CHANGE (LOW)
**Symptom:** After manually changing willpowermc@gmail.com from customer to cleaner in DB, user still sees customer dashboard.
**Root Cause:** Browser session caches the old role. Middleware checks DB role on each request, so a hard refresh should work, but Next.js client-side router may serve cached page.
**Fix:** Already works correctly via middleware — just needs a full page reload (not client-side navigation). No code change needed, but document this behavior.

---

## FILES TO AUDIT AND MODIFY

### Core Auth Files:
1. `components/auth/AuthForm.tsx` (461 lines) — Main signup/login form
2. `components/auth/GoogleSignInButton.tsx` (74 lines) — Google OAuth button
3. `app/auth/callback/route.ts` (113 lines) — OAuth callback handler
4. `app/auth/select-role/page.tsx` (189 lines) — Role selection for OAuth users
5. `app/auth/confirm/page.tsx` (163 lines) — Email confirmation handler
6. `app/auth/reset-password/page.tsx` (281 lines) — Password reset form
7. `app/forgot-password/page.tsx` (141 lines) — Forgot password form
8. `app/(auth)/signup/page.tsx` (91 lines) — Signup page with role selector
9. `app/(auth)/login/page.tsx` (29 lines) — Login page
10. `app/logout/route.ts` (26 lines) — Logout handler
11. `middleware.ts` (161 lines) — Auth routing & protection

### Supporting Files:
12. `lib/email/verification.ts` (80 lines) — Email verification utilities
13. `lib/email/password-reset.ts` (152 lines) — Password reset rate limiting
14. `lib/email/resend.ts` (171 lines) — Resend email client
15. `lib/utils/dashboard-path.ts` (8 lines) — Role-to-path mapping
16. `lib/supabase/client.ts` — Client-side Supabase
17. `lib/supabase/server.ts` — Server-side Supabase

### Database:
18. `handle_new_user` trigger on `auth.users` — Creates public.users row on signup

---

## IMPLEMENTATION INSTRUCTIONS

### Step 1: Fix the DB trigger to also create cleaners profile
```sql
-- Modify handle_new_user to create cleaners row for pro signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _role text;
BEGIN
    _role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');
    IF _role NOT IN ('customer', 'cleaner') THEN
        _role := 'customer';
    END IF;

    INSERT INTO public.users (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        _role::public.user_role
    );

    -- Auto-create cleaners profile for pro signups
    IF _role = 'cleaner' THEN
        INSERT INTO public.cleaners (user_id, business_name, approval_status)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
            'pending'
        );
    END IF;

    RETURN NEW;
END;
$$;
```

### Step 2: Fix GoogleSignInButton to carry role
- Accept `role` prop
- Encode role in the redirect URL
- Read it in auth/callback and apply it

### Step 3: Fix AuthForm.tsx
- Remove the `users` upsert (trigger handles it)
- Keep `cleaners` profile creation as fallback (check if exists first)
- Ensure cleaner profile gets business_name, phone, zip from form
- Add proper error messages for all failure modes

### Step 4: Fix auth/confirm hardcoded redirect
- Use `/dashboard` instead of `/dashboard/customer`
- Let middleware route based on actual role

### Step 5: Fix daniel@yourtrustedcleaningexperts.com account
```sql
-- Create missing cleaners profile
INSERT INTO public.cleaners (user_id, business_name, approval_status)
SELECT u.id, u.full_name, 'pending'
FROM public.users u
WHERE u.email = 'daniel@yourtrustedcleaningexperts.com'
  AND u.role = 'cleaner'
  AND NOT EXISTS (SELECT 1 FROM public.cleaners c WHERE c.user_id = u.id);
```

### Step 6: Verify & test all flows
Test matrix (ALL must pass):
- [ ] Customer signup with email/password → verification email arrives → confirm → customer dashboard
- [ ] Pro signup with email/password → verification email arrives → confirm → pro dashboard with cleaner profile
- [ ] Customer signup with Google → select role → customer dashboard
- [ ] Pro signup with Google → role carried through OR select role → pro dashboard with cleaner profile
- [ ] Login with email/password (customer) → customer dashboard
- [ ] Login with email/password (pro) → pro dashboard
- [ ] Login with Google (existing customer) → customer dashboard
- [ ] Login with Google (existing pro) → pro dashboard
- [ ] Duplicate email signup → clear error: "Account already exists"
- [ ] Forgot password → reset email arrives → click link → new password → login works
- [ ] Wrong password → clear error message
- [ ] Unverified email login attempt → prompt to verify
- [ ] Logout → redirect to home → can't access dashboard

---

## MANUAL STEP REQUIRED (Daniel must do in Supabase Dashboard)
⚠️ **Supabase SMTP Configuration** — This CANNOT be done via code. Daniel needs to:
1. Go to https://supabase.com/dashboard/project/jisjxdsrflheosvodoxk/auth/smtp
2. Enable "Custom SMTP"
3. Enter Resend SMTP settings:
   - Host: `smtp.resend.com`
   - Port: `465` (SSL) or `587` (TLS)
   - Username: `resend`
   - Password: (RESEND_API_KEY from .env.local)
   - Sender email: `noreply@bossofclean.com`
   - Sender name: `Boss of Clean`
4. Save and test by sending a test email

---

## ACCEPTANCE CRITERIA
1. New pro signup → receives verification email within 60 seconds
2. New customer signup → receives verification email within 60 seconds
3. Pro signup creates BOTH users row AND cleaners row
4. Google OAuth preserves role selection from signup page
5. Duplicate email shows clear "already exists" error
6. Forgot password delivers email, reset flow works end-to-end
7. All dashboard redirects go to correct role-based dashboard
8. Admin receives notification email on every new signup
9. TypeScript compiles with zero errors
10. All auth pages are mobile-responsive
