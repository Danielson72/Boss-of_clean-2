import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

const logger = createLogger({ file: 'api/admin/reviews/pending/route' });

// GET /api/admin/reviews/pending — returns unpublished, non-flagged reviews awaiting moderation
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { data: reviews, error, count } = await supabase
      .from('reviews')
      .select(
        `id,
        rating,
        title,
        comment,
        service_date,
        is_published,
        flagged,
        flag_reason,
        created_at,
        updated_at,
        customer:users!reviews_customer_id_fkey(id, full_name, email),
        cleaner:cleaners(id, business_name, user_id)`,
        { count: 'exact' }
      )
      .eq('is_published', false)
      .eq('flagged', false)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching pending reviews', { function: 'GET' }, error);
      return NextResponse.json({ error: 'Failed to fetch pending reviews' }, { status: 500 });
    }

    return NextResponse.json({ reviews: reviews ?? [], total: count ?? 0 });
  } catch (error) {
    logger.error('Pending reviews error', { function: 'GET' }, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
