import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createLogger } from '@/lib/utils/logger'
import { roleToDashboardPath } from '@/lib/utils/dashboard-path'

const logger = createLogger({ file: 'auth/callback/route' })

function getRedirectOrigin(request: NextRequest, requestUrl: URL): string {
  // Netlify sets x-forwarded-host; use it to build the correct production origin
  const forwardedHost = request.headers.get('x-forwarded-host')
  if (forwardedHost) {
    return `https://${forwardedHost}`
  }
  return requestUrl.origin
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = getRedirectOrigin(request, requestUrl)

  const cookieStore = cookies()

  // Track cookies set during auth exchange so we can copy them to the redirect
  const pendingCookies: { name: string; value: string; options: Record<string, unknown> }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          // Store for later — we'll apply them to the redirect response
          pendingCookies.length = 0
          cookiesToSet.forEach(({ name, value, options }) => {
            pendingCookies.push({ name, value, options: options || {} })
            // Also set on cookieStore so subsequent reads in this handler see them
            try {
              cookieStore.set(name, value, options)
            } catch {
              // May throw in some contexts — that's OK, pendingCookies is the fallback
            }
          })
        },
      },
    }
  )

  // Helper: create a redirect that carries auth cookies
  function redirectWithCookies(url: URL | string): NextResponse {
    const response = NextResponse.redirect(url instanceof URL ? url : new URL(url))
    for (const { name, value, options } of pendingCookies) {
      response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
    }
    return response
  }

  // Try to exchange the code if present. If it fails (e.g. flow_state_not_found
  // because Supabase already exchanged it server-side), fall through and check
  // for an existing session instead of erroring out.
  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      logger.error('OAuth code exchange error (may be already exchanged)', { function: 'GET' }, exchangeError)
    }
  }

  // Check for an active session — works whether code exchange just succeeded,
  // was already exchanged by Supabase, or user arrived with existing cookies.
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // No session at all — redirect to login
    return redirectWithCookies(new URL('/login', origin))
  }

  // Handle password reset and other redirect flows
  const next = requestUrl.searchParams.get('next')
  if (next && next.startsWith('/') && !next.startsWith('//')) {
    return redirectWithCookies(new URL(next, origin))
  }

  // Read intended role from signup flow (passed via Google OAuth redirect)
  const intendedRole = requestUrl.searchParams.get('intended_role')

  // The handle_new_user trigger on auth.users automatically creates a public.users record.
  // Check if the user record exists (it should, from the trigger).
  const { data: existingUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (existingUser) {
    // Update avatar from Google profile metadata if available
    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture
    const fullName = user.user_metadata?.full_name || user.user_metadata?.name
    const updates: Record<string, string> = { updated_at: new Date().toISOString() }
    if (avatarUrl) updates.avatar_url = avatarUrl
    if (fullName) updates.full_name = fullName

    await supabase.from('users').update(updates).eq('id', user.id)

    const role = existingUser.role || 'customer'
    return redirectWithCookies(new URL(roleToDashboardPath(role), origin))
  }

  // Edge case: trigger didn't fire or email-based account linking needed.
  // Check if there's an existing user with the same email (e.g. previously signed up with email/password).
  if (user.email) {
    const { data: userByEmail } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', user.email)
      .single()

    if (userByEmail) {
      // Existing account with same email found. Update the record to point to the new auth ID.
      // This is safe because the OAuth provider has verified email ownership.
      const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture
      const fullName = user.user_metadata?.full_name || user.user_metadata?.name
      const updates: Record<string, string> = {
        id: user.id,
        updated_at: new Date().toISOString(),
      }
      if (avatarUrl) updates.avatar_url = avatarUrl
      if (fullName) updates.full_name = fullName

      await supabase.from('users').update(updates).eq('email', user.email)

      const role = userByEmail.role || 'customer'
      return redirectWithCookies(new URL(roleToDashboardPath(role), origin))
    }
  }

  // Completely new user and trigger didn't create record - insert manually
  const newRole = (intendedRole === 'cleaner') ? 'cleaner' : 'customer'
  const { error: insertError } = await supabase
    .from('users')
    .insert({
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'User',
      avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
      role: newRole,
      created_at: new Date().toISOString(),
    })

  if (insertError) {
    logger.error('Error creating user record', { function: 'GET' }, insertError)
  }

  // If pro signup via Google, create cleaners profile
  if (newRole === 'cleaner') {
    await supabase
      .from('cleaners')
      .insert({
        user_id: user.id,
        business_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'My Business',
        approval_status: 'pending',
      })
  }

  // If role was specified via signup flow, go straight to dashboard
  if (intendedRole) {
    const dashPath = newRole === 'cleaner' ? '/dashboard/pro/setup' : '/dashboard/customer'
    return redirectWithCookies(new URL(dashPath, origin))
  }

  // No intended role - new OAuth users go to role selection
  return redirectWithCookies(new URL('/auth/select-role', origin))
}
