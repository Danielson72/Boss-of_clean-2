'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UseCustomerSidebarCountsResult {
  unreadMessages: number;
  unreadNotifications: number;
  isLoading: boolean;
  error: Error | null;
}

const POLL_INTERVAL_MS = 30_000;

/**
 * DLD-507: counts powering the customer dashboard sidebar badges.
 *
 * - unreadMessages: conversations where this customer has
 *   `customer_unread_count > 0`.
 * - unreadNotifications: rows in `notifications` for this user with
 *   `read = false`.
 *
 * Polls every 30s and re-fetches on window focus. Returns zeros for
 * unauthenticated users or any error path — never throws.
 */
export function useCustomerSidebarCounts(): UseCustomerSidebarCountsResult {
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function fetchCounts() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled) return;

        if (!user) {
          setUnreadMessages(0);
          setUnreadNotifications(0);
          setError(null);
          return;
        }

        const [messages, notifications] = await Promise.all([
          supabase
            .from('conversations')
            .select('id', { count: 'exact', head: true })
            .eq('customer_id', user.id)
            .gt('customer_unread_count', 0),
          supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('read', false),
        ]);
        if (cancelled) return;

        setUnreadMessages(messages.count ?? 0);
        setUnreadNotifications(notifications.count ?? 0);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        const e = err instanceof Error ? err : new Error('Failed to fetch sidebar counts');
        setError(e);
        setUnreadMessages(0);
        setUnreadNotifications(0);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchCounts();
    const interval = setInterval(fetchCounts, POLL_INTERVAL_MS);
    window.addEventListener('focus', fetchCounts);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('focus', fetchCounts);
    };
  }, []);

  return { unreadMessages, unreadNotifications, isLoading, error };
}
