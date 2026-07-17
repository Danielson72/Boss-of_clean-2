import type { SupabaseClient } from '@supabase/supabase-js';

// Measured median first-response time per pro (from real message timestamps).
// Source: the pro_response_time_stats() SECURITY DEFINER function
// (supabase/migrations/20260717120000_pro_response_time_stats.sql).

/** Minimum data points before we display a response-time badge. */
export const MIN_RESPONSE_SAMPLES = 3;

export interface ResponseStat {
  medianSeconds: number;
  sampleCount: number;
}

/**
 * Fetch measured response stats for the given pro ids. Returns an empty map on
 * any error (RPC not yet applied, network, etc.) so callers degrade to showing
 * no badge rather than a wrong one.
 */
export async function getResponseTimeStats(
  supabase: SupabaseClient,
  proIds: string[]
): Promise<Map<string, ResponseStat>> {
  const map = new Map<string, ResponseStat>();
  const ids = proIds.filter(Boolean);
  if (ids.length === 0) return map;

  const { data, error } = await supabase.rpc('pro_response_time_stats', { p_pro_ids: ids });
  if (error || !data) return map;

  for (const row of data as Array<{ pro_id: string; median_seconds: number | string; sample_count: number }>) {
    map.set(row.pro_id, {
      medianSeconds: Number(row.median_seconds),
      sampleCount: row.sample_count,
    });
  }
  return map;
}

/**
 * Humanize a median response window as an upper-bound-ish phrase for
 * "Usually responds within X". Rounds to friendly units; never fabricates.
 */
export function formatResponseWindow(medianSeconds: number): string {
  const minutes = medianSeconds / 60;
  if (minutes < 60) {
    const rounded = Math.max(15, Math.ceil(minutes / 15) * 15);
    return rounded === 60 ? 'an hour' : `${rounded} minutes`;
  }
  const hours = minutes / 60;
  if (hours < 24) {
    const rounded = Math.max(1, Math.ceil(hours));
    return rounded === 1 ? 'an hour' : `${rounded} hours`;
  }
  const days = Math.max(1, Math.ceil(hours / 24));
  return days === 1 ? 'a day' : `${days} days`;
}
