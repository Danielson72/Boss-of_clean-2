import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ file: 'api/cleaner/portfolio/route' });

const MAX_PHOTOS = 20;

interface PortfolioPhoto {
  id: string;
  cleaner_id: string;
  image_url: string;
  thumbnail_url?: string;
  caption?: string;
  pair_id?: string;
  photo_type: 'single' | 'before' | 'after';
  display_order: number;
  created_at: string;
}

// GET - Fetch portfolio photos for the authenticated cleaner
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get cleaner profile
    const { data: cleaner, error: cleanerError } = await supabase
      .from('cleaners')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (cleanerError || !cleaner) {
      return NextResponse.json(
        { error: 'Cleaner profile not found' },
        { status: 404 }
      );
    }

    // Get portfolio photos
    const { data: photos, error: photosError } = await supabase
      .from('portfolio_photos')
      .select('*')
      .eq('cleaner_id', cleaner.id)
      .order('display_order', { ascending: true });

    if (photosError) {
      logger.error('Error fetching portfolio photos', { function: 'GET' }, photosError);
      return NextResponse.json(
        { error: 'Failed to fetch portfolio photos' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      photos: photos || [],
      maxPhotos: MAX_PHOTOS,
      remainingSlots: MAX_PHOTOS - (photos?.length || 0),
    });
  } catch (error) {
    logger.error('Portfolio GET error', { function: 'GET' }, error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolio' },
      { status: 500 }
    );
  }
}

// POST - Add new portfolio photos
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get cleaner profile
    const { data: cleaner, error: cleanerError } = await supabase
      .from('cleaners')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (cleanerError || !cleaner) {
      return NextResponse.json(
        { error: 'Cleaner profile not found' },
        { status: 404 }
      );
    }

    // Get current photo count
    const { count: currentCount } = await supabase
      .from('portfolio_photos')
      .select('*', { count: 'exact', head: true })
      .eq('cleaner_id', cleaner.id);

    const body = await request.json();
    const { photos } = body as { photos: { image_url: string; caption?: string }[] };

    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return NextResponse.json(
        { error: 'No photos provided' },
        { status: 400 }
      );
    }

    // Check limit
    const availableSlots = MAX_PHOTOS - (currentCount || 0);
    if (photos.length > availableSlots) {
      return NextResponse.json(
        { error: `Can only add ${availableSlots} more photos. Maximum is ${MAX_PHOTOS}.` },
        { status: 400 }
      );
    }

    // Get max display order
    const { data: maxOrderData } = await supabase
      .from('portfolio_photos')
      .select('display_order')
      .eq('cleaner_id', cleaner.id)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    let nextOrder = (maxOrderData?.display_order ?? -1) + 1;

    // Insert photos
    const photosToInsert = photos.map((photo) => ({
      cleaner_id: cleaner.id,
      image_url: photo.image_url,
      caption: photo.caption || null,
      photo_type: 'single' as const,
      display_order: nextOrder++,
    }));

    const { data: insertedPhotos, error: insertError } = await supabase
      .from('portfolio_photos')
      .insert(photosToInsert)
      .select();

    if (insertError) {
      logger.error('Error inserting portfolio photos', { function: 'POST' }, insertError);
      return NextResponse.json(
        { error: 'Failed to add photos' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      photos: insertedPhotos,
      message: `${insertedPhotos.length} photo(s) added successfully`,
    });
  } catch (error) {
    logger.error('Portfolio POST error', { function: 'POST' }, error);
    return NextResponse.json(
      { error: 'Failed to add photos' },
      { status: 500 }
    );
  }
}

// PATCH - Update photo(s) - reorder, update caption, or create/remove pairs
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get cleaner profile
    const { data: cleaner, error: cleanerError } = await supabase
      .from('cleaners')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (cleanerError || !cleaner) {
      return NextResponse.json(
        { error: 'Cleaner profile not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { action, photoId, photos, caption, beforeId, afterId } = body as {
      action: 'reorder' | 'caption' | 'pair' | 'unpair';
      photoId?: string;
      photos?: { id: string; display_order: number }[];
      caption?: string;
      beforeId?: string;
      afterId?: string;
    };

    switch (action) {
      case 'reorder': {
        if (!photos || !Array.isArray(photos)) {
          return NextResponse.json(
            { error: 'Photos array required for reorder' },
            { status: 400 }
          );
        }

        // Update each photo's display_order
        for (const photo of photos) {
          const { error } = await supabase
            .from('portfolio_photos')
            .update({ display_order: photo.display_order })
            .eq('id', photo.id)
            .eq('cleaner_id', cleaner.id);

          if (error) {
            logger.error('Error reordering photo', { function: 'PATCH', photoId: photo.id }, error);
          }
        }

        return NextResponse.json({ message: 'Photos reordered successfully' });
      }

      case 'caption': {
        if (!photoId) {
          return NextResponse.json(
            { error: 'Photo ID required' },
            { status: 400 }
          );
        }

        const { error } = await supabase
          .from('portfolio_photos')
          .update({ caption: caption || null })
          .eq('id', photoId)
          .eq('cleaner_id', cleaner.id);

        if (error) {
          logger.error('Error updating caption', { function: 'PATCH' }, error);
          return NextResponse.json(
            { error: 'Failed to update caption' },
            { status: 500 }
          );
        }

        return NextResponse.json({ message: 'Caption updated successfully' });
      }

      case 'pair': {
        if (!beforeId || !afterId) {
          return NextResponse.json(
            { error: 'Before and after photo IDs required' },
            { status: 400 }
          );
        }

        // Generate a new pair ID
        const pairId = crypto.randomUUID();

        // Update before photo
        const { error: beforeError } = await supabase
          .from('portfolio_photos')
          .update({ pair_id: pairId, photo_type: 'before' })
          .eq('id', beforeId)
          .eq('cleaner_id', cleaner.id);

        if (beforeError) {
          logger.error('Error updating before photo', { function: 'PATCH' }, beforeError);
          return NextResponse.json(
            { error: 'Failed to create pair' },
            { status: 500 }
          );
        }

        // Update after photo
        const { error: afterError } = await supabase
          .from('portfolio_photos')
          .update({ pair_id: pairId, photo_type: 'after' })
          .eq('id', afterId)
          .eq('cleaner_id', cleaner.id);

        if (afterError) {
          logger.error('Error updating after photo', { function: 'PATCH' }, afterError);
          // Rollback before photo
          await supabase
            .from('portfolio_photos')
            .update({ pair_id: null, photo_type: 'single' })
            .eq('id', beforeId)
            .eq('cleaner_id', cleaner.id);

          return NextResponse.json(
            { error: 'Failed to create pair' },
            { status: 500 }
          );
        }

        return NextResponse.json({ message: 'Before/After pair created successfully', pairId });
      }

      case 'unpair': {
        if (!photoId) {
          return NextResponse.json(
            { error: 'Photo ID required' },
            { status: 400 }
          );
        }

        // Get the photo to find its pair_id
        const { data: photo, error: fetchError } = await supabase
          .from('portfolio_photos')
          .select('pair_id')
          .eq('id', photoId)
          .eq('cleaner_id', cleaner.id)
          .single();

        if (fetchError || !photo?.pair_id) {
          return NextResponse.json(
            { error: 'Photo not found or not paired' },
            { status: 404 }
          );
        }

        // Unpair both photos
        const { error } = await supabase
          .from('portfolio_photos')
          .update({ pair_id: null, photo_type: 'single' })
          .eq('pair_id', photo.pair_id)
          .eq('cleaner_id', cleaner.id);

        if (error) {
          logger.error('Error unpairing photos', { function: 'PATCH' }, error);
          return NextResponse.json(
            { error: 'Failed to unpair photos' },
            { status: 500 }
          );
        }

        return NextResponse.json({ message: 'Photos unpaired successfully' });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('Portfolio PATCH error', { function: 'PATCH' }, error);
    return NextResponse.json(
      { error: 'Failed to update photos' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a portfolio photo
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get cleaner profile
    const { data: cleaner, error: cleanerError } = await supabase
      .from('cleaners')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (cleanerError || !cleaner) {
      return NextResponse.json(
        { error: 'Cleaner profile not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get('id');

    if (!photoId) {
      return NextResponse.json(
        { error: 'Photo ID required' },
        { status: 400 }
      );
    }

    // Get photo to check pair_id and get image_url for storage cleanup
    const { data: photo, error: fetchError } = await supabase
      .from('portfolio_photos')
      .select('*')
      .eq('id', photoId)
      .eq('cleaner_id', cleaner.id)
      .single();

    if (fetchError || !photo) {
      return NextResponse.json(
        { error: 'Photo not found' },
        { status: 404 }
      );
    }

    // If photo is part of a pair, unpair the other photo
    if (photo.pair_id) {
      await supabase
        .from('portfolio_photos')
        .update({ pair_id: null, photo_type: 'single' })
        .eq('pair_id', photo.pair_id)
        .neq('id', photoId)
        .eq('cleaner_id', cleaner.id);
    }

    // Delete photo from database
    const { error: deleteError } = await supabase
      .from('portfolio_photos')
      .delete()
      .eq('id', photoId)
      .eq('cleaner_id', cleaner.id);

    if (deleteError) {
      logger.error('Error deleting portfolio photo', { function: 'DELETE' }, deleteError);
      return NextResponse.json(
        { error: 'Failed to delete photo' },
        { status: 500 }
      );
    }

    // Try to delete from storage (extract path from URL)
    try {
      const url = new URL(photo.image_url);
      const pathMatch = url.pathname.match(/\/portfolio-photos\/(.+)$/);
      if (pathMatch) {
        await supabase.storage.from('portfolio-photos').remove([pathMatch[1]]);
      }
    } catch (storageError) {
      // Log but don't fail the request
      logger.warn('Could not delete file from storage', { function: 'DELETE' }, storageError);
    }

    return NextResponse.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    logger.error('Portfolio DELETE error', { function: 'DELETE' }, error);
    return NextResponse.json(
      { error: 'Failed to delete photo' },
      { status: 500 }
    );
  }
}
