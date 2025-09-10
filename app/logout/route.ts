import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  // Sign out the user
  await supabase.auth.signOut()
  
  // Redirect to home page
  const requestUrl = new URL(request.url)
  return NextResponse.redirect(new URL('/', requestUrl.origin))
}

// Also support GET for direct navigation
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  // Sign out the user
  await supabase.auth.signOut()
  
  // Redirect to home page
  const requestUrl = new URL(request.url)
  return NextResponse.redirect(new URL('/', requestUrl.origin))
}