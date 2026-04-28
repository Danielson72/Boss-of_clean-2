'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UsePendingDocumentActionsResult {
  rejectedCount: number;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Returns the count of cleaner_documents rows in 'rejected' state for the
 * currently-signed-in cleaner. Refetches on window focus so the badge
 * updates when the pro returns from another tab where they re-uploaded.
 *
 * Returns 0 (no badge) for unauthenticated users, non-cleaner roles, or
 * any error path — never throws to the caller.
 */
export function usePendingDocumentActions(): UsePendingDocumentActionsResult {
  const [rejectedCount, setRejectedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function fetchCount() {
      try {
        if (!cancelled) setIsLoading(true);

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled) return;

        if (!user) {
          setRejectedCount(0);
          setError(null);
          return;
        }

        const { data: cleaner } = await supabase
          .from('cleaners')
          .select('id')
          .eq('user_id', user.id)
          .single();
        if (cancelled) return;

        if (!cleaner) {
          setRejectedCount(0);
          setError(null);
          return;
        }

        const { count, error: countError } = await supabase
          .from('cleaner_documents')
          .select('id', { count: 'exact', head: true })
          .eq('cleaner_id', cleaner.id)
          .eq('verification_status', 'rejected');
        if (cancelled) return;

        if (countError) throw countError;
        setRejectedCount(count ?? 0);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        const e = err instanceof Error ? err : new Error('Failed to fetch rejected count');
        setError(e);
        setRejectedCount(0);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchCount();

    function onFocus() {
      fetchCount();
    }

    window.addEventListener('focus', onFocus);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  return { rejectedCount, isLoading, error };
}
