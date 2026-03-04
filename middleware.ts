import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  rateLimitMiddleware,
  getClientIp,
  RATE_LIMITS,
} from '@/lib/middleware/rate-limit'

// Map DB role to dashboard path segment.
// The 'cleaner' role maps to '/dashboard/pro'; all others map to themselves.
function roleToDashboardPath(role: string): string {
  if (role === 'cleaner') return '/dashboard/pro'
  if (role === 'admin') return '/dashboard/admin'
  if (role === 'customer') return '/dashboard/customer'
  console.error(`[middleware] Unknown role "${role}", defaulting to /dashboard/customer`)
  return '/dashboard/customer'
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // --- Rate limiting for auth pages (login/signup) ---
  if (pathname === '/login' || pathname === '/signup') {
    const ip = getClientIp(request)
    const blocked = await rateLimitMiddleware(request, 'auth', ip, RATE_LIMITS.auth)
    if (blocked) return blocked
  }

  // --- Rate limiting for abuse-prone API routes ---
  if (pathname === '/api/reviews/create' && request.method === 'POST') {
    const ip = getClientIp(request)
    const blocked = await rateLimitMiddleware(request, 'review-ip', ip, RATE_LIMITS.reviewCreate)
    if (blocked) return blocked
  }

  if (pathname === '/api/messages' && request.method === 'POST') {
    const ip = getClientIp(request)
    const blocked = await rateLimitMiddleware(request, 'message-ip', ip, RATE_LIMITS.messageSend)
    if (blocked) return blocked
  }

  if (pathname === '/api/quote' && request.method === 'POST') {
    const ip = getClientIp(request)
    const blocked = await rateLimitMiddleware(request, 'quote-ip', ip, RATE_LIMITS.quoteRequest)
    if (blocked) return blocked
  }

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
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError) {
    console.error('[middleware] auth.getUser() error:', authError.message)
  }

  // Protected routes
  if (pathname.startsWith('/dashboard')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Get user role from database
    const { data: userData, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (roleError) {
      console.error(`[middleware] Role query FAILED for user ${user.id} (${user.email}):`, roleError.message, `code: ${roleError.code}`)
      console.error(`[middleware] This means the user will default to 'customer' - if they are admin/cleaner this is a BUG. Check RLS policies on public.users table.`)
    }

    if (!roleError && !userData?.role) {
      console.error(`[middleware] Query succeeded but NO ROLE found in public.users for user ${user.id} (${user.email}). Row data:`, JSON.stringify(userData))
      console.error(`[middleware] Either the row doesn't exist or the role column is NULL.`)
    }

    const userRole = userData?.role || 'customer'
    console.log(`[middleware] Resolved role="${userRole}" for user ${user.id} (${user.email}) on path "${pathname}"`)

    const dashboardPath = roleToDashboardPath(userRole)

    // Redirect /dashboard to role-specific dashboard
    if (pathname === '/dashboard' || pathname === '/dashboard/') {
      const url = request.nextUrl.clone()
      url.pathname = dashboardPath
      return NextResponse.redirect(url)
    }

    // Check role-based access: redirect users away from dashboards that aren't theirs
    if (pathname.startsWith('/dashboard/admin') && userRole !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = dashboardPath
      return NextResponse.redirect(url)
    }

    if (pathname.startsWith('/dashboard/pro') && userRole !== 'cleaner') {
      const url = request.nextUrl.clone()
      url.pathname = dashboardPath
      return NextResponse.redirect(url)
    }

    if (pathname.startsWith('/dashboard/customer') && userRole !== 'customer') {
      const url = request.nextUrl.clone()
      url.pathname = dashboardPath
      return NextResponse.redirect(url)
    }

    // Also catch old /dashboard/cleaner paths (redirect to /dashboard/pro)
    if (pathname.startsWith('/dashboard/cleaner') && userRole === 'cleaner') {
      const url = request.nextUrl.clone()
      url.pathname = pathname.replace('/dashboard/cleaner', '/dashboard/pro')
      return NextResponse.redirect(url)
    }

    // Shared dashboard routes (e.g., /dashboard/messages) - allow for all authenticated users
  }

  // Redirect authenticated users away from auth pages
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const { data: userData, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (roleError) {
      console.error(`[middleware] Role query on auth page redirect FAILED for user ${user.id} (${user.email}):`, roleError.message)
    }

    const userRole = userData?.role || 'customer'
    console.log(`[middleware] Auth page redirect: user ${user.id} (${user.email}) role="${userRole}" -> ${roleToDashboardPath(userRole)}`)
    const url = request.nextUrl.clone()
    url.pathname = roleToDashboardPath(userRole)
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
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
