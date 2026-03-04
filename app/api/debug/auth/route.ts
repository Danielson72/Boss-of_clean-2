import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component - safe to ignore
          }
        },
      },
    }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({
      user_id: null,
      email: null,
      auth_metadata_role: null,
      db_role: null,
      query_error: authError?.message || 'No authenticated user found',
      cookie_count: cookieStore.getAll().length,
      cookie_names: cookieStore.getAll().map(c => c.name),
      diagnosis: 'User is not authenticated. Check that Supabase session cookies are present.',
    })
  }

  const { data: userData, error: queryError } = await supabase
    .from('users')
    .select('role, email, full_name, display_name')
    .eq('id', user.id)
    .single()

  const diagnosis: string[] = []

  if (queryError) {
    diagnosis.push(`DB query failed: ${queryError.message} (code: ${queryError.code})`)
    diagnosis.push('This could be an RLS policy issue or the user row does not exist in public.users')
  }

  if (!userData) {
    diagnosis.push('No row found in public.users for this auth user ID - role will default to customer!')
  } else if (!userData.role) {
    diagnosis.push('Row exists in public.users but role column is NULL - will default to customer!')
  } else {
    diagnosis.push(`DB role is "${userData.role}". User should land on /dashboard/${userData.role === 'admin' ? 'admin' : userData.role === 'cleaner' ? 'cleaner' : 'customer'}`)
  }

  if (user.user_metadata?.role !== userData?.role) {
    diagnosis.push(`MISMATCH: auth.user_metadata.role="${user.user_metadata?.role || 'undefined'}" vs public.users.role="${userData?.role || 'null'}"`)
    diagnosis.push('AuthContext and middleware both now read from public.users - metadata mismatch is informational only')
  }

  return NextResponse.json({
    user_id: user.id,
    email: user.email,
    auth_metadata_role: user.user_metadata?.role || null,
    auth_metadata_full: user.user_metadata,
    db_role: userData?.role || null,
    db_user: userData || null,
    query_error: queryError?.message || null,
    query_error_code: queryError?.code || null,
    cookie_count: cookieStore.getAll().length,
    cookie_names: cookieStore.getAll().map(c => c.name),
    diagnosis,
  })
}
