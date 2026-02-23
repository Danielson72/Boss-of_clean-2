/**
 * Map a DB user role to its dashboard URL path segment.
 * The 'cleaner' role maps to '/dashboard/pro'; all others map to themselves.
 */
export function roleToDashboardPath(role: string): string {
  if (role === 'cleaner') return '/dashboard/pro'
  return `/dashboard/${role}`
}
