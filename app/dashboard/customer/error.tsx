'use client';

import ErrorDisplay from '@/components/ErrorDisplay';

export default function CustomerDashboardError({
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
      title="Dashboard error"
      backHref="/dashboard/customer"
      backLabel="Back to dashboard"
    />
  );
}
