import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { createLogger } from '@/lib/utils/logger'

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

  if (code) {
    const supabase = await createClient()
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      logger.error('OAuth code exchange error', { function: 'GET' }, exchangeError)
      return NextResponse.redirect(new URL('/login?error=auth_callback_failed', origin))
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
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
        return NextResponse.redirect(new URL(`/dashboard/${role}`, origin))
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
          return NextResponse.redirect(new URL(`/dashboard/${role}`, origin))
        }
      }

      // Completely new user and trigger didn't create record - insert manually
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'User',
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
          created_at: new Date().toISOString(),
        })

      if (insertError) {
        logger.error('Error creating user record', { function: 'GET' }, insertError)
      }

      // New OAuth users go to role selection
      return NextResponse.redirect(new URL('/auth/select-role', origin))
    }
  }

  // No code or session - return to login
  return NextResponse.redirect(new URL('/login', origin))
}