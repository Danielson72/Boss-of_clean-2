import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ file: 'api/cleaner/portfolio/route' });

const MAX_PHOTOS = 20;

// DB row shape (matches production schema)
interface PortfolioPhotoRow {
  id: string;
  pro_id: string;
  url: string;
  caption: string | null;
  display_order: number | null;
  created_at: string | null;
  updated_at: string | null;
}

// Client-facing shape (kept stable for existing UI components)
interface PortfolioPhotoDTO {
  id: string;
  cleaner_id: string;
  image_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  pair_id: string | null;
  photo_type: 'single' | 'before' | 'after';
  display_order: number;
  created_at: string | null;
}

// Translate DB row → client DTO (the shim)
function toDTO(row: PortfolioPhotoRow): PortfolioPhotoDTO {
  return {
    id: row.id,
    cleaner_id: row.pro_id,
    image_url: row.url,
    thumbnail_url: null,
    caption: row.caption,
    pair_id: null,
    photo_type: 'single',
    display_order: row.display_order ?? 0,
    created_at: row.created_at,
  };
}

// GET - Fetch portfolio photos for the authenticated cleaner
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Confirm pro profile exists (RLS uses auth.uid() directly via user.id)
    const { data: cleaner, error: cleanerError } = await supabase
      .from('pros')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (cleanerError || !cleaner) {
      return NextResponse.json({ error: 'Cleaner profile not found' }, { status: 404 });
    }

    // Get portfolio photos using REAL DB columns
    // pro_id stores auth user id (matches RLS: pro_id = auth.uid())
    const { data: photos, error: photosError } = await supabase
      .from('portfolio_photos')
      .select('id, pro_id, url, caption, display_order, created_at, updated_at')
      .eq('pro_id', user.id)
      .order('display_order', { ascending: true });

    if (photosError) {
      logger.error('Error fetching portfolio photos', { function: 'GET' }, photosError);
      return NextResponse.json({ error: 'Failed to fetch portfolio photos' }, { status: 500 });
    }

    const dtos = (photos as PortfolioPhotoRow[] | null)?.map(toDTO) ?? [];

    return NextResponse.json({
      photos: dtos,
      maxPhotos: MAX_PHOTOS,
      remainingSlots: MAX_PHOTOS - dtos.length,
    });
  } catch (error) {
    logger.error('Portfolio GET error', { function: 'GET' }, error);
    return NextResponse.json({ error: 'Failed to fetch portfolio' }, { status: 500 });
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
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: cleaner, error: cleanerError } = await supabase
      .from('pros')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (cleanerError || !cleaner) {
      return NextResponse.json({ error: 'Cleaner profile not found' }, { status: 404 });
    }

    // Count existing photos to enforce the cap (RLS: pro_id = auth.uid())
    const { count: currentCount } = await supabase
      .from('portfolio_photos')
      .select('id', { count: 'exact', head: true })
      .eq('pro_id', user.id);

    const body = await request.json();
    const { photos } = body as { photos: { image_url: string; caption?: string }[] };

    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return NextResponse.json({ error: 'No photos provided' }, { status: 400 });
    }

    const availableSlots = MAX_PHOTOS - (currentCount || 0);
    if (photos.length > availableSlots) {
      return NextResponse.json(
        { error: `Can only add ${availableSlots} more photos. Maximum is ${MAX_PHOTOS}.` },
        { status: 400 }
      );
    }

    // Find next display_order
    const { data: maxOrderData } = await supabase
      .from('portfolio_photos')
      .select('display_order')
      .eq('pro_id', user.id)
      .order('display_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    let nextOrder = (maxOrderData?.display_order ?? -1) + 1;

    // Insert using REAL DB columns (url, pro_id)
    // pro_id stores auth user id to satisfy RLS policy pro_id = auth.uid()
    const photosToInsert = photos.map((photo) => ({
      pro_id: user.id,
      url: photo.image_url,
      caption: photo.caption || null,
      display_order: nextOrder++,
    }));

    const { data: insertedPhotos, error: insertError } = await supabase
      .from('portfolio_photos')
      .insert(photosToInsert)
      .select('id, pro_id, url, caption, display_order, created_at, updated_at');

    if (insertError) {
      logger.error('Error inserting portfolio photos', { function: 'POST' }, insertError);
      return NextResponse.json({ error: 'Failed to add photos' }, { status: 500 });
    }

    const dtos = (insertedPhotos as PortfolioPhotoRow[] | null)?.map(toDTO) ?? [];

    return NextResponse.json({
      photos: dtos,
      message: `${dtos.length} photo(s) added successfully`,
    });
  } catch (error) {
    logger.error('Portfolio POST error', { function: 'POST' }, error);
    return NextResponse.json({ error: 'Failed to add photos' }, { status: 500 });
  }
}

// PATCH - Update photo(s): reorder, caption, pair/unpair
// Note: 'pair' and 'unpair' require DB columns that don't yet exist in production
// (pair_id, photo_type). Those actions return 501 until DB migration runs.
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: cleaner, error: cleanerError } = await supabase
      .from('pros')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (cleanerError || !cleaner) {
      return NextResponse.json({ error: 'Cleaner profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { action, photoId, photos, caption } = body as {
      action: 'reorder' | 'caption' | 'pair' | 'unpair';
      photoId?: string;
      photos?: { id: string; display_order: number }[];
      caption?: string;
    };

    switch (action) {
      case 'reorder': {
        if (!photos || !Array.isArray(photos)) {
          return NextResponse.json({ error: 'Photos array required for reorder' }, { status: 400 });
        }

        for (const photo of photos) {
          const { error } = await supabase
            .from('portfolio_photos')
            .update({ display_order: photo.display_order })
            .eq('id', photo.id)
            .eq('pro_id', user.id);

          if (error) {
            logger.error('Error reordering photo', { function: 'PATCH', photoId: photo.id }, error);
          }
        }

        return NextResponse.json({ message: 'Photos reordered successfully' });
      }

      case 'caption': {
        if (!photoId) {
          return NextResponse.json({ error: 'Photo ID required' }, { status: 400 });
        }

        const { error } = await supabase
          .from('portfolio_photos')
          .update({ caption: caption || null })
          .eq('id', photoId)
          .eq('pro_id', user.id);

        if (error) {
          logger.error('Error updating caption', { function: 'PATCH' }, error);
          return NextResponse.json({ error: 'Failed to update caption' }, { status: 500 });
        }

        return NextResponse.json({ message: 'Caption updated successfully' });
      }

      case 'pair':
      case 'unpair': {
        // DB schema does not yet support before/after pairing.
        // Tracked for future migration. Return 501 so UI can degrade gracefully.
        return NextResponse.json(
          { error: 'Before/After pairing is not yet available' },
          { status: 501 }
        );
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    logger.error('Portfolio PATCH error', { function: 'PATCH' }, error);
    return NextResponse.json({ error: 'Failed to update photos' }, { status: 500 });
  }
}

// DELETE - Remove a portfolio photo (and its storage object)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: cleaner, error: cleanerError } = await supabase
      .from('pros')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (cleanerError || !cleaner) {
      return NextResponse.json({ error: 'Cleaner profile not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get('id');

    if (!photoId) {
      return NextResponse.json({ error: 'Photo ID required' }, { status: 400 });
    }

    // Fetch photo to get its storage URL before deleting the row
    const { data: photo, error: fetchError } = await supabase
      .from('portfolio_photos')
      .select('id, url')
      .eq('id', photoId)
      .eq('pro_id', user.id)
      .single();

    if (fetchError || !photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Delete DB row
    const { error: deleteError } = await supabase
      .from('portfolio_photos')
      .delete()
      .eq('id', photoId)
      .eq('pro_id', user.id);

    if (deleteError) {
      logger.error('Error deleting portfolio photo', { function: 'DELETE' }, deleteError);
      return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 });
    }

    // Best-effort storage cleanup (don't fail the request if this errors)
    try {
      const fileUrl = new URL(photo.url);
      const pathMatch = fileUrl.pathname.match(/\/portfolio-photos\/(.+)$/);
      if (pathMatch) {
        await supabase.storage.from('portfolio-photos').remove([pathMatch[1]]);
      }
    } catch (storageError) {
      logger.warn('Could not delete file from storage', { function: 'DELETE' }, storageError);
    }

    return NextResponse.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    logger.error('Portfolio DELETE error', { function: 'DELETE' }, error);
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 });
  }
}
