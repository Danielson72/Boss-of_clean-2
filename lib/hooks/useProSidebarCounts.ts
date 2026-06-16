'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UseProSidebarCountsResult {
  unreadMessages: number;
  unreadNotifications: number;
  pendingLeads: number;
  actionNeededLeads: number;
  isLoading: boolean;
  error: Error | null;
}

const POLL_INTERVAL_MS = 30_000;

/**
 * DLD-507: counts powering the pro dashboard sidebar badges.
 *
 * - unreadMessages: count of conversations where this pro has
 *   `cleaner_unread_count > 0` (one badge tick per conversation, not
 *   per individual message — matches the ticket's "4 messages" wording).
 * - unreadNotifications: rows in `notifications` for this user with
 *   `read = false`.
 * - pendingLeads: marketplace + assigned quote_requests for this pro
 *   in `pending` status.
 * - actionNeededLeads (DLD-517 A9 Slice 2): accepted quotes for this pro that
 *   the customer has confirmed-hired (hire_confirmations row) but the pro has
 *   not yet unlocked (no `captured` lead_acceptances). Powers the
 *   "Action Needed" sidebar badge → /dashboard/pro/leads.
 *
 * Polls every 30s and re-fetches on window focus. Returns zeros
 * (no badge) for unauthenticated users, non-pro roles, or any error
 * path — never throws to the caller, by design.
 */
export function useProSidebarCounts(): UseProSidebarCountsResult {
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [pendingLeads, setPendingLeads] = useState(0);
  const [actionNeededLeads, setActionNeededLeads] = useState(0);
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
          setPendingLeads(0);
          setActionNeededLeads(0);
          setError(null);
          return;
        }

        // Resolve pro row (skip cleanly if the signed-in user isn't a pro)
        const { data: pro } = await supabase
          .from('pros')
          .select('id')
          .eq('user_id', user.id)
          .single();
        if (cancelled) return;

        if (!pro) {
          setUnreadMessages(0);
          setUnreadNotifications(0);
          setPendingLeads(0);
          setActionNeededLeads(0);
          setError(null);
          return;
        }

        const [messages, notifications, leads] = await Promise.all([
          supabase
            .from('conversations')
            .select('id', { count: 'exact', head: true })
            .eq('cleaner_id', pro.id)
            .gt('cleaner_unread_count', 0),
          supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('read', false),
          supabase
            .from('quote_requests')
            .select('id', { count: 'exact', head: true })
            .eq('cleaner_id', pro.id)
            .eq('status', 'pending'),
        ]);
        if (cancelled) return;

        setUnreadMessages(messages.count ?? 0);
        setUnreadNotifications(notifications.count ?? 0);
        setPendingLeads(leads.count ?? 0);

        // Action Needed: accepted quotes this pro was confirmed-hired for and
        // has not yet unlocked (no `captured` lead_acceptances). Mirrors the
        // getHiredLeadsAwaitingUnlock server action's eligibility.
        const { data: accepted } = await supabase
          .from('quote_requests')
          .select('id')
          .eq('cleaner_id', pro.id)
          .eq('status', 'accepted')
          .limit(100);
        if (cancelled) return;

        const acceptedIds = ((accepted || []) as { id: string }[]).map((q) => q.id);
        if (acceptedIds.length === 0) {
          setActionNeededLeads(0);
        } else {
          const [hires, captured] = await Promise.all([
            supabase
              .from('hire_confirmations')
              .select('quote_request_id')
              .eq('cleaner_id', pro.id)
              .in('quote_request_id', acceptedIds),
            supabase
              .from('lead_acceptances')
              .select('quote_request_id')
              .eq('cleaner_id', pro.id)
              .eq('status', 'captured')
              .in('quote_request_id', acceptedIds),
          ]);
          if (cancelled) return;

          const hiredSet = new Set(
            ((hires.data || []) as { quote_request_id: string }[]).map((h) => h.quote_request_id)
          );
          const capturedSet = new Set(
            ((captured.data || []) as { quote_request_id: string }[]).map((c) => c.quote_request_id)
          );
          setActionNeededLeads(
            acceptedIds.filter((id) => hiredSet.has(id) && !capturedSet.has(id)).length
          );
        }

        setError(null);
      } catch (err) {
        if (cancelled) return;
        const e = err instanceof Error ? err : new Error('Failed to fetch sidebar counts');
        setError(e);
        setUnreadMessages(0);
        setUnreadNotifications(0);
        setPendingLeads(0);
        setActionNeededLeads(0);
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

  return { unreadMessages, unreadNotifications, pendingLeads, actionNeededLeads, isLoading, error };
}
