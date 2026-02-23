'use client';

import ErrorDisplay from '@/components/ErrorDisplay';

export default function CleanerDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorDisplay
      error={error}
      reset={reset}
      title="Cleaner dashboard error"
      backHref="/dashboard/pro"
      backLabel="Back to dashboard"
    />
  );
}
