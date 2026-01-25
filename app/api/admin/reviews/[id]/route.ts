import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// PATCH - Update review (approve, reject, flag, edit)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const body = await request.json();
    const { action, reason, comment } = body;

    let updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    switch (action) {
      case 'approve':
        updateData.is_published = true;
        updateData.flagged = false;
        updateData.flag_reason = null;
        break;

      case 'reject':
        updateData.is_published = false;
        updateData.flagged = true;
        updateData.flag_reason = reason || 'Rejected by admin';
        break;

      case 'flag':
        updateData.flagged = true;
        updateData.flag_reason = reason || 'Flagged for review';
        break;

      case 'unflag':
        updateData.flagged = false;
        updateData.flag_reason = null;
        break;

      case 'edit':
        if (!comment) {
          return NextResponse.json({ error: 'Comment is required for edit' }, { status: 400 });
        }
        updateData.comment = comment;
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const { data: review, error } = await supabase
      .from('reviews')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating review:', error);
      return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
    }

    // If approved, notify the cleaner (you could add email notification here)
    if (action === 'approve') {
      // Get cleaner info for notification
      const { data: reviewData } = await supabase
        .from('reviews')
        .select('cleaner_id, cleaner:cleaners(user_id, business_name)')
        .eq('id', id)
        .single();

      // TODO: Send email notification to cleaner about new published review
      const cleanerInfo = reviewData?.cleaner as unknown as { user_id: string; business_name: string } | null;
      console.log(`Review ${id} approved for cleaner: ${cleanerInfo?.business_name}`);
    }

    return NextResponse.json({ success: true, review });
  } catch (error) {
    console.error('Review moderation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a review
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const { error } = await supabase.from('reviews').delete().eq('id', id);

    if (error) {
      console.error('Error deleting review:', error);
      return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Review deletion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
