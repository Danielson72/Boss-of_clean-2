import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  const { data: { user } } = await supabase.auth.getUser()

  // Protected routes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!user) {
      // Redirect to login if not authenticated
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Get user role from database
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const userRole = userData?.role || 'customer'
    const requestedPath = request.nextUrl.pathname

    // Check role-based access
    if (requestedPath.startsWith('/dashboard/admin') && userRole !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = `/dashboard/${userRole}`
      return NextResponse.redirect(url)
    }

    if (requestedPath.startsWith('/dashboard/cleaner') && userRole !== 'cleaner') {
      const url = request.nextUrl.clone()
      url.pathname = `/dashboard/${userRole}`
      return NextResponse.redirect(url)
    }

    if (requestedPath.startsWith('/dashboard/customer') && userRole !== 'customer') {
      const url = request.nextUrl.clone()
      url.pathname = `/dashboard/${userRole}`
      return NextResponse.redirect(url)
    }

    // Redirect /dashboard to role-specific dashboard
    if (requestedPath === '/dashboard' || requestedPath === '/dashboard/') {
      const url = request.nextUrl.clone()
      url.pathname = `/dashboard/${userRole}`
      return NextResponse.redirect(url)
    }
  }

  // Redirect authenticated users away from auth pages
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const userRole = userData?.role || 'customer'
    const url = request.nextUrl.clone()
    url.pathname = `/dashboard/${userRole}`
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api routes
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}