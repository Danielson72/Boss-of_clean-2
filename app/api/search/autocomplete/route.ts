import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimitRoute, getClientIp } from '@/lib/middleware/rate-limit';

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimited = rateLimitRoute('autocomplete', ip, {
    maxRequests: 60,
    windowSeconds: 60,
  });
  if (rateLimited) return rateLimited;

  const q = request.nextUrl.searchParams.get('q')?.trim();
  const limit = Math.min(
    parseInt(request.nextUrl.searchParams.get('limit') || '8', 10),
    20
  );

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from('florida_zipcodes')
    .select('zip_code, city, county')
    .or(
      `city.ilike.%${q}%,county.ilike.%${q}%,zip_code.like.${q}%`
    )
    .order('population', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ results: [] });
  }

  return NextResponse.json({ results: data || [] });
}
