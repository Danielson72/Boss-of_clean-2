import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ file: 'api/admin/reviews/route' });

// GET - List all reviews for moderation
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify admin role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all'; // all, pending, flagged, published
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('reviews')
      .select(`
        id,
        rating,
        title,
        comment,
        service_date,
        is_published,
        flagged,
        flag_reason,
        created_at,
        updated_at,
        customer:users!reviews_customer_id_fkey(
          id,
          full_name,
          email
        ),
        cleaner:cleaners(
          id,
          business_name,
          user_id
        )
      `, { count: 'exact' });

    // Apply filters
    switch (filter) {
      case 'pending':
        query = query.eq('is_published', false).eq('flagged', false);
        break;
      case 'flagged':
        query = query.eq('flagged', true);
        break;
      case 'published':
        query = query.eq('is_published', true);
        break;
      // 'all' shows everything
    }

    const { data: reviews, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Error fetching reviews', { function: 'GET' }, error);
      return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
    }

    // Get stats for the filter tabs
    const [
      { count: totalCount },
      { count: pendingCount },
      { count: flaggedCount },
      { count: publishedCount },
    ] = await Promise.all([
      supabase.from('reviews').select('*', { count: 'exact', head: true }),
      supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('is_published', false).eq('flagged', false),
      supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('flagged', true),
      supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('is_published', true),
    ]);

    return NextResponse.json({
      reviews: reviews || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      stats: {
        total: totalCount || 0,
        pending: pendingCount || 0,
        flagged: flaggedCount || 0,
        published: publishedCount || 0,
      },
    });
  } catch (error) {
    logger.error('Review list error', { function: 'GET' }, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
