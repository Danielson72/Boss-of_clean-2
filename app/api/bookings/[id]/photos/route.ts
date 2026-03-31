import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ file: 'api/bookings/[id]/photos/route' });

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify cleaner owns this booking
    const { data: cleaner } = await supabase
      .from('cleaners')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!cleaner) {
      return NextResponse.json({ error: 'Cleaner profile not found' }, { status: 403 });
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, cleaner_id, status')
      .eq('id', params.id)
      .eq('cleaner_id', cleaner.id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const photoType = formData.get('type') as string; // 'before' or 'after'

    if (!photoType || !['before', 'after'].includes(photoType)) {
      return NextResponse.json(
        { error: 'Photo type must be "before" or "after"' },
        { status: 400 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    if (files.length > 10) {
      return NextResponse.json({ error: 'Maximum 10 photos per upload' }, { status: 400 });
    }

    const uploadedPhotos: { url: string; type: string }[] = [];
    const errors: string[] = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: Invalid file type. Allowed: JPEG, PNG, WebP`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File too large. Maximum size is 2MB`);
        continue;
      }

      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `job-photos/${params.id}/${photoType}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from('portfolio-photos')
        .upload(fileName, buffer, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        logger.error('Error uploading job photo', { function: 'POST', fileName }, uploadError);
        errors.push(`${file.name}: Upload failed`);
        continue;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('portfolio-photos').getPublicUrl(fileName);

      uploadedPhotos.push({ url: publicUrl, type: photoType });
    }

    // Store photo references in booking_photos table (or fallback to bookings metadata)
    if (uploadedPhotos.length > 0) {
      // Try to insert into booking_photos table
      const photoRecords = uploadedPhotos.map((photo) => ({
        booking_id: params.id,
        cleaner_id: cleaner.id,
        photo_url: photo.url,
        photo_type: photo.type,
      }));

      const { error: insertError } = await supabase
        .from('booking_photos')
        .insert(photoRecords);

      if (insertError) {
        // Table may not exist yet — store URLs in booking metadata instead
        logger.debug('booking_photos table not available, storing in metadata', {
          error: insertError.message,
        });

        // Fetch existing photos metadata
        const { data: existingBooking } = await supabase
          .from('bookings')
          .select('special_instructions')
          .eq('id', params.id)
          .single();

        const existingInstructions = existingBooking?.special_instructions || '';
        const photoUrls = uploadedPhotos.map((p) => `[${p.type}]${p.url}`).join('\n');
        const separator = existingInstructions ? '\n---JOB_PHOTOS---\n' : '---JOB_PHOTOS---\n';

        // Only append if not already there
        if (!existingInstructions.includes('---JOB_PHOTOS---')) {
          await supabase
            .from('bookings')
            .update({
              special_instructions: existingInstructions + separator + photoUrls,
              updated_at: new Date().toISOString(),
            })
            .eq('id', params.id);
        } else {
          await supabase
            .from('bookings')
            .update({
              special_instructions: existingInstructions + '\n' + photoUrls,
              updated_at: new Date().toISOString(),
            })
            .eq('id', params.id);
        }
      }
    }

    if (uploadedPhotos.length === 0 && errors.length > 0) {
      return NextResponse.json(
        { error: 'All uploads failed', details: errors },
        { status: 400 }
      );
    }

    return NextResponse.json({
      photos: uploadedPhotos,
      uploadedCount: uploadedPhotos.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    logger.error('Job photo upload error', { function: 'POST' }, error);
    return NextResponse.json({ error: 'Failed to upload photos' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try booking_photos table first
    const { data: photos, error } = await supabase
      .from('booking_photos')
      .select('id, photo_url, photo_type, created_at')
      .eq('booking_id', params.id)
      .order('created_at', { ascending: true });

    if (!error && photos && photos.length > 0) {
      return NextResponse.json({ photos });
    }

    // Fallback: parse from booking special_instructions
    const { data: booking } = await supabase
      .from('bookings')
      .select('special_instructions')
      .eq('id', params.id)
      .single();

    if (booking?.special_instructions?.includes('---JOB_PHOTOS---')) {
      const photoSection = booking.special_instructions.split('---JOB_PHOTOS---')[1];
      const photoLines = photoSection
        .trim()
        .split('\n')
        .filter((line: string) => line.startsWith('['));

      const parsedPhotos = photoLines.map((line: string, index: number) => {
        const typeMatch = line.match(/^\[(before|after)\]/);
        return {
          id: `fallback-${index}`,
          photo_url: line.replace(/^\[(before|after)\]/, ''),
          photo_type: typeMatch ? typeMatch[1] : 'before',
          created_at: new Date().toISOString(),
        };
      });

      return NextResponse.json({ photos: parsedPhotos });
    }

    return NextResponse.json({ photos: [] });
  } catch (error) {
    logger.error('Error fetching job photos', { function: 'GET' }, error);
    return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 });
  }
}
