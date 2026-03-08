---
name: boc-auth-playbook
description: >
  Boss of Clean authentication, login, logout, and role-based dashboard routing playbook.
  Use this skill whenever debugging auth issues on bossofclean.com.
---

# Boss of Clean — Auth System Playbook

## Architecture
- 3 roles: admin → /dashboard/admin, cleaner → /dashboard/pro, customer → /dashboard/customer
- Auth state managed in lib/context/AuthContext.tsx
- Routes protected by lib/auth/protected-route.tsx
- Sign Out is <a href="/logout"> server route (NEVER client-side JS)
- Google OAuth callback at app/auth/callback/route.ts

## Key Files
- lib/context/AuthContext.tsx — user, dbRole, roleLoaded, loading state
- lib/auth/protected-route.tsx — guards dashboards, waits for roleLoaded
- app/dashboard/page.tsx — role router to correct dashboard
- app/auth/callback/route.ts — OAuth code exchange with PKCE fallback
- app/logout/route.ts — server-side sign out
- middleware.ts — role routing with user_metadata fallback
- lib/supabase/server.ts — async server Supabase client

## 5 Critical Patterns

### 1. roleLoaded flag prevents spinner
NEVER set loading=false until role resolves. AuthContext has separate roleLoaded boolean.
isResolving = loading || (!!user && !roleLoaded)

### 2. Sign Out = server route
Sign Out must be <a href="/logout"> not JS onClick. Client-side signOut races with ProtectedRoute.

### 3. RLS on public.users must NEVER self-reference
WRONG: policy that does SELECT FROM public.users inside a policy ON public.users
RIGHT: use auth.jwt() -> 'user_metadata' ->> 'role' instead

### 4. OAuth callback handles already-exchanged PKCE codes
On exchangeCodeForSession failure, check getUser() for existing session before redirecting to /login.

### 5. onAuthStateChange must skip INITIAL_SESSION
getInitialSession runs first. onAuthStateChange INITIAL_SESSION event fires concurrently.
Skip it with initialLoadDone flag to prevent race condition.

## Diagnostic Checklist (in order)
1. Supabase auth logs — look for error codes (invalid_credentials, flow_state_not_found)
2. Database user state — check role, email_verified, has_password, provider
3. RLS policies — grep for self-referencing policies on public.users
4. Netlify deploy — verify latest commit is deployed
5. Client console — check AuthContext logs for loading/role sequence

## Common SQL Diagnostics

### Full user audit
SELECT au.email, u.role, u.full_name,
  au.email_confirmed_at IS NOT NULL as email_verified,
  au.raw_app_meta_data->>'provider' as provider,
  CASE WHEN au.encrypted_password != '' THEN true ELSE false END as has_password
FROM auth.users au
LEFT JOIN public.users u ON u.id = au.id
ORDER BY au.created_at DESC;

### Check RLS policies
SELECT policyname, cmd, qual FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'users';

### Reset test password
UPDATE auth.users
SET encrypted_password = crypt('NewPassword!', gen_salt('bf'))
WHERE email = 'test@example.com';

## Admin RPC Functions (parameter names use p_ prefix)
- approve_cleaner(p_cleaner_id uuid) → returns jsonb with email, business_name
- reject_cleaner(p_cleaner_id uuid, p_reason text) → returns jsonb with email, business_name
- request_cleaner_info(p_cleaner_id uuid, p_message text) → returns jsonb with email, business_name

## Lessons Learned
1. Build passing ≠ working — always test manually after deploy
2. RLS recursion is silent — queries return 500 with no obvious error
3. Race conditions between getInitialSession and onAuthStateChange cause spinners
4. "Invalid credentials" usually means wrong password, not broken code
5. Two repos (Mac + Ubuntu) cause confusion — always confirm which is deploying
6. user_metadata role is set at signup but never updated — source of truth is public.users.role
