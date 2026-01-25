import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - List customer's favorites
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

    // Get favorites with cleaner details
    const { data: favorites, error } = await supabase
      .from('customer_favorites')
      .select(`
        id,
        created_at,
        cleaner:cleaners(
          id,
          business_name,
          business_slug,
          business_description,
          profile_image_url,
          average_rating,
          total_reviews,
          services,
          hourly_rate,
          instant_booking,
          insurance_verified,
          users!inner(city, state)
        )
      `)
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching favorites:', error);
      return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 });
    }

    return NextResponse.json({ favorites: favorites || [] });
  } catch (error) {
    console.error('Favorites fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Add a cleaner to favorites
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { cleanerId } = await request.json();

    if (!cleanerId) {
      return NextResponse.json({ error: 'Cleaner ID is required' }, { status: 400 });
    }

    // Check if cleaner exists
    const { data: cleaner } = await supabase
      .from('cleaners')
      .select('id')
      .eq('id', cleanerId)
      .single();

    if (!cleaner) {
      return NextResponse.json({ error: 'Cleaner not found' }, { status: 404 });
    }

    // Add to favorites
    const { data, error } = await supabase
      .from('customer_favorites')
      .insert({
        customer_id: user.id,
        cleaner_id: cleanerId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        // Unique constraint violation - already favorited
        return NextResponse.json({ error: 'Already in favorites' }, { status: 409 });
      }
      console.error('Error adding favorite:', error);
      return NextResponse.json({ error: 'Failed to add favorite' }, { status: 500 });
    }

    return NextResponse.json({ success: true, favorite: data });
  } catch (error) {
    console.error('Favorite add error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove a cleaner from favorites
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cleanerId = searchParams.get('cleanerId');

    if (!cleanerId) {
      return NextResponse.json({ error: 'Cleaner ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('customer_favorites')
      .delete()
      .eq('customer_id', user.id)
      .eq('cleaner_id', cleanerId);

    if (error) {
      console.error('Error removing favorite:', error);
      return NextResponse.json({ error: 'Failed to remove favorite' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Favorite remove error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
