import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Cookie-free Supabase client for public, unauthenticated reads.
 *
 * Uses the anon key and reads no cookies/headers, so it does NOT opt the
 * calling route into dynamic rendering. This lets pages that only read public
 * data (e.g. the homepage taxonomy) stay statically/ISR cached. RLS still
 * applies — only rows exposed by public "anyone reads" policies are returned.
 */
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  )
}
