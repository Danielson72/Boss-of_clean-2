import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)

    // Get user data to determine redirect
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // Check if user exists in public.users by their auth ID
      const { data: userById } = await supabase
        .from('users')
        .select('id, role, email')
        .eq('id', user.id)
        .single()

      if (userById) {
        // User exists with this auth ID, redirect based on role
        const role = userById.role || 'customer'
        return NextResponse.redirect(new URL(`/dashboard/${role}`, requestUrl.origin))
      }

      // User doesn't exist by ID - check if there's an existing account with same email
      // This handles OAuth account linking for users who previously signed up with email/password
      const { data: userByEmail } = await supabase
        .from('users')
        .select('id, role')
        .eq('email', user.email)
        .single()

      if (userByEmail) {
        // Found existing user with same email - link accounts by updating the user ID
        // Note: This is safe because OAuth provider has verified the email ownership
        await supabase
          .from('users')
          .update({
            id: user.id,
            email_verified: true,
            profile_image_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name,
            updated_at: new Date().toISOString(),
          })
          .eq('email', user.email)

        // Redirect based on existing role
        const role = userByEmail.role || 'customer'
        return NextResponse.redirect(new URL(`/dashboard/${role}`, requestUrl.origin))
      }

      // Completely new user - create record and redirect to role selection
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name,
          profile_image_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
          email_verified: true, // OAuth emails are verified
          created_at: new Date().toISOString(),
        })

      if (insertError) {
        console.error('Error creating user record:', insertError)
        // Still try to redirect to role selection
      }

      // Redirect new OAuth users to role selection page
      return NextResponse.redirect(new URL('/auth/select-role', requestUrl.origin))
    }
  }

  // Return to login if no code or error
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}