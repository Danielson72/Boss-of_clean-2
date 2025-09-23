import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function getCurrentUser() {
  const supabase = createClient();
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }
    
    // Get full user profile with role
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    return {
      ...user,
      profile
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

export async function requireAuth() {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('Authentication required');
  }
  
  return user;
}

export async function getOrCreateUserId() {
  // First try to get authenticated user
  const user = await getCurrentUser();
  
  if (user) {
    return {
      userId: user.id,
      isAuthenticated: true
    };
  }
  
  // For anonymous users, create a session-based temporary ID
  // This will be stored in a secure HTTP-only cookie
  const cookieStore = cookies();
  const tempIdCookie = cookieStore.get('temp_user_id');
  
  if (tempIdCookie?.value) {
    return {
      userId: tempIdCookie.value,
      isAuthenticated: false
    };
  }
  
  // Generate new temporary ID
  const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  // Note: Setting cookies in a server component requires the cookies() function
  // This will be handled in the API route instead
  return {
    userId: tempId,
    isAuthenticated: false,
    isNew: true
  };
}