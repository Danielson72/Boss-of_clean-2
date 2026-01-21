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
      // Check if user exists in public.users and get their role
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      // If user doesn't exist in public.users, create them
      if (!userData) {
        await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email,
            role: 'customer', // Default role
            created_at: new Date().toISOString(),
          })
        
        return NextResponse.redirect(new URL('/dashboard/customer', requestUrl.origin))
      }

      // Redirect based on role
      const role = userData.role || 'customer'
      return NextResponse.redirect(new URL(`/dashboard/${role}`, requestUrl.origin))
    }
  }

  // Return to login if no code or error
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}